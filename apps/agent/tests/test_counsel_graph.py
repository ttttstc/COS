from importlib import import_module
import json
from typing import cast

import pytest
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.runtime import Runtime
from langgraph.types import Command

import lyl_agent.models as models_module
from lyl_agent.graph import (
    _run_node,
    build_graph,
    intake,
    mode_router,
    problem_reframe,
    retrieve_context,
    synthesize_counsel,
)
from lyl_agent.memory import MemoryCreate, MemoryRepository, SourceRef
from lyl_agent.settings import Settings

graph_module = import_module("lyl_agent.graph")


class RecordingModel:
    def __init__(self) -> None:
        self.messages: list[object] = []

    async def ainvoke(self, messages: list[object]) -> AIMessage:
        self.messages = messages
        return AIMessage(content="response")


@pytest.mark.asyncio
async def test_graph_retrieves_user_scoped_context(tmp_path: object) -> None:
    repository = MemoryRepository(tmp_path / "graph.sqlite3")  # type: ignore[operator]
    for user_id, summary in (("user-a", "ship memory"), ("user-b", "private")):
        item = repository.create_memory(
            user_id,
            MemoryCreate(
                memory_type="goal",
                content={"summary": summary},
                source_refs=[
                    SourceRef(
                        source_type="chat",
                        source_id=f"{user_id}-message",
                    )
                ],
                confidence=0.8,
            ),
        )
        repository.set_memory_status(user_id, item.id, "confirmed")
    graph = build_graph(
        FakeListChatModel(responses=["response"]),
        memory_repository=repository,
    )

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="下一步做什么")]},
        context={"mode": "ask", "user_id": "user-a", "thread_id": "thread-1"},
    )

    assert result["user_id"] == "user-a"
    assert result["thread_id"] == "thread-1"
    assert result["context_snapshot"]["goals"][0]["content"] == {
        "summary": "ship memory"
    }
    assert "private" not in str(result["context_snapshot"])


@pytest.mark.asyncio
async def test_graph_injects_context_snapshot_into_model_input(tmp_path: object) -> None:
    repository = MemoryRepository(tmp_path / "graph.sqlite3")  # type: ignore[operator]
    item = repository.create_memory(
        "user-a",
        MemoryCreate(
            memory_type="goal",
            content={"summary": "ship memory"},
            source_refs=[SourceRef(source_type="chat", source_id="message-1")],
            confidence=0.8,
        ),
    )
    repository.set_memory_status("user-a", item.id, "confirmed")
    model = RecordingModel()
    graph = build_graph(
        cast(BaseChatModel, model),
        memory_repository=repository,
    )

    await graph.ainvoke(
        {"messages": [HumanMessage(content="ship memory 后该做什么？")]},
        context={"mode": "ask", "user_id": "user-a"},
    )

    assert isinstance(model.messages[0], SystemMessage)
    assert "ship memory" in str(model.messages[0].content)
    assert "历史模式" in str(model.messages[0].content)


@pytest.mark.asyncio
async def test_non_ask_decide_modes_extract_summary_and_hide_provider_json() -> None:
    graph = build_graph(
        FakeListChatModel(
            responses=[json.dumps({"summary": "先核对一个决定性未知。"}, ensure_ascii=False)]
        )
    )

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="请诊断这个反复出现的问题")]},
        context={"mode": "diagnose"},
    )

    assert result["messages"][-1].content == "先核对一个决定性未知。"
    assert result["recommendation"]["summary"] == "先核对一个决定性未知。"
    assert "\"summary\"" not in result["messages"][-1].content


@pytest.mark.asyncio
async def test_model_discovered_research_need_returns_to_approval_gate() -> None:
    payload = json.dumps(
        {
            "candidate_actions": [
                {
                    "id": "verify",
                    "title": "核对关键未知",
                    "description": "完成一次最小验证",
                    "completion_criteria": ["记录验证结果"],
                }
            ],
            "need_research": True,
        },
        ensure_ascii=False,
    )
    graph = build_graph(
        FakeListChatModel(responses=[payload, payload]),
        checkpointer=InMemorySaver(),
    )
    config = {"configurable": {"thread_id": "thread-model-research-need"}}

    paused = await graph.ainvoke(
        {"messages": [HumanMessage(content="先帮我规划一个验证动作")]},
        config,
        context={"mode": "ask"},
    )

    assert paused["__interrupt__"][0].value["type"] == "research_approval"
    pending = paused["__interrupt__"][0]
    result = await graph.ainvoke(
        Command(resume={pending.id: "report_now"}),
        config,
        context={"mode": "ask"},
    )

    assert "__interrupt__" not in result
    assert result["need_research"] is False


@pytest.mark.asyncio
async def test_manual_mode_overrides_automatic_mode() -> None:
    graph = build_graph(FakeListChatModel(responses=["decision response"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="请判断两个方案应如何选择")]},
        context={"mode": "decide"},
    )

    assert result["mode"] == "decide"
    assert [stage["id"] for stage in result["stages"]] == [
        "intake",
        "mode_router",
        "retrieve_context",
        "problem_reframe",
        "request_decision",
        "prepare_artifact",
        "synthesize_counsel",
    ]


@pytest.mark.asyncio
async def test_nodes_preserve_context_and_emit_completed_stages() -> None:
    state = {"messages": [HumanMessage(content="请调研两个方案的市场数据")]}
    state = {
        **state,
        **await intake(state),
    }
    state = {
        **state,
        **await mode_router(state, Runtime(context={"mode": "decide"})),
    }
    state = {
        **state,
        **await retrieve_context(state),
    }
    state = {
        **state,
        **await problem_reframe(state),
    }
    state = {
        **state,
        **await synthesize_counsel(
            state,
            FakeListChatModel(responses=["decision response"]),
        ),
    }

    assert state["mode"] == "decide"
    assert state["need_research"] is True
    assert [stage["status"] for stage in state["stages"]] == ["completed"] * 5


async def _broken_node(_state: object) -> object:
    raise RuntimeError("node unavailable")


@pytest.mark.asyncio
async def test_non_model_node_failure_returns_a_readable_degraded_response() -> None:
    result = await _run_node(
        {"messages": [HumanMessage(content="帮我分析这个选择")]},
        _broken_node,
    )

    assert "暂时无法完成" in result["messages"][-1].content
    assert result["recommendation"]["kind"] == "degraded"


@pytest.mark.asyncio
async def test_graph_stops_after_a_degraded_node(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def broken_retrieve_context(_state: object) -> object:
        raise RuntimeError("context unavailable")

    monkeypatch.setattr(
        graph_module,
        "retrieve_context",
        broken_retrieve_context,
    )
    graph = build_graph(FakeListChatModel(responses=["must not be used"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="帮我分析这个选择")]},
        context={"mode": "discuss"},
    )

    assert result["recommendation"]["kind"] == "degraded"
    assert [stage["id"] for stage in result["stages"]] == [
        "intake",
        "mode_router",
        "synthesize_counsel",
    ]
    assert "normalized_question" not in result


@pytest.mark.asyncio
async def test_new_turn_resets_stage_progress_and_transient_error() -> None:
    result = await intake(
        {
            "messages": [HumanMessage(content="重新分析")],
        "stages": [
                {
                    "id": "synthesize_counsel",
                    "title": "形成建议",
                    "status": "completed",
                }
        ],
        "error": "graph_unavailable",
        "decision_question": "旧议题",
        "action_title": "旧行动",
        "options": [{"id": "old"}],
    }
    )

    assert [stage["id"] for stage in result["stages"]] == ["intake"]
    assert result["error"] is None
    assert result["decision_question"] is None
    assert result["action_title"] is None
    assert result["options"] == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("mode", "prompt"),
    [
        ("ask", "我现在该先完成哪件事？"),
        ("decide", "我应该选择方案 A 还是方案 B？"),
        ("diagnose", "请诊断我最近反复推迟决策的原因。"),
        ("discuss", "我想聊聊目前的产品方向。"),
    ],
)
async def test_each_manual_mode_reaches_a_final_response(
    mode: str,
    prompt: str,
) -> None:
    graph = build_graph(FakeListChatModel(responses=["response"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=prompt)]},
        context={"mode": mode},
    )

    assert result["mode"] == mode
    assert result["current_stage"] == "synthesize_counsel"
    assert isinstance(result["messages"][-1], AIMessage)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("prompt", "expected_mode", "needs_research"),
    [
        ("我现在该先完成哪件事？", "ask", False),
        ("我应该选择方案 A 还是方案 B？", "decide", False),
        ("请调研这个市场的竞争情况", "research", True),
        ("请复盘我最近反复推迟决策的原因", "diagnose", False),
        ("我想聊聊目前的产品方向", "discuss", False),
    ],
)
async def test_mode_is_inferred_when_context_is_missing(
    prompt: str,
    expected_mode: str,
    needs_research: bool,
) -> None:
    graph = build_graph(FakeListChatModel(responses=["research response"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=prompt)]},
    )

    assert result["mode"] == expected_mode
    assert result["need_research"] is needs_research


@pytest.mark.asyncio
async def test_vague_request_returns_a_scope_interrupt() -> None:
    graph = build_graph(FakeListChatModel(responses=["unused"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="怎么办")]},
        context={"mode": "discuss"},
    )

    assert result["__interrupt__"][0].value["type"] == "scope_clarification"


@pytest.mark.asyncio
async def test_research_mode_requests_approval_without_external_tools() -> None:
    graph = build_graph(FakeListChatModel(responses=["unused"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="请调研这个市场的竞争情况")]},
        context={"mode": "research"},
    )

    interrupt_value = result["__interrupt__"][0].value
    assert interrupt_value["type"] == "research_approval"
    assert interrupt_value["actions"] == ["report_now"]


class FailingModel:
    async def ainvoke(self, _messages: object) -> AIMessage:
        raise RuntimeError("model unavailable")


@pytest.mark.asyncio
async def test_model_failure_returns_a_readable_degraded_response() -> None:
    graph = build_graph(cast(BaseChatModel, FailingModel()))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="帮我分析这个选择")]},
        context={"mode": "discuss"},
    )

    assert "暂时无法完成" in result["messages"][-1].content
    assert result["recommendation"]["kind"] == "degraded"
    assert result.get("artifact") is None


@pytest.mark.asyncio
async def test_provider_initialization_failure_returns_degraded_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        _env_file=None,
        model_provider="openai",
        model="stale-model",
        model_api_key="stale-key",
    )

    def fail_provider_init(**_options: object) -> object:
        raise RuntimeError("provider integration unavailable")

    monkeypatch.setattr(graph_module, "load_settings", lambda: settings)
    monkeypatch.setattr(models_module, "init_chat_model", fail_provider_init)
    graph = build_graph()

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="帮我分析这个选择")]},
        context={"mode": "discuss"},
    )

    assert result["error"] == "graph_unavailable"
    assert result["recommendation"]["kind"] == "degraded"
    assert isinstance(result["messages"][-1], AIMessage)
    assert "暂时无法完成" in result["messages"][-1].content
