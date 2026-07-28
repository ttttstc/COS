from typing import cast

import pytest
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.runtime import Runtime

from lyl_agent.graph import (
    _run_node,
    build_graph,
    intake,
    mode_router,
    problem_reframe,
    retrieve_context,
    synthesize_counsel,
)


@pytest.mark.asyncio
async def test_manual_mode_overrides_automatic_mode() -> None:
    graph = build_graph(FakeListChatModel(responses=["decision response"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="请调研两个方案的市场数据")]},
        context={"mode": "decide"},
    )

    assert result["mode"] == "decide"
    assert [stage["id"] for stage in result["stages"]] == [
        "intake",
        "mode_router",
        "retrieve_context",
        "problem_reframe",
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
@pytest.mark.parametrize(
    ("mode", "prompt"),
    [
        ("ask", "我现在该先完成哪件事？"),
        ("decide", "我应该选择方案 A 还是方案 B？"),
        ("research", "请调研这个市场是否值得进入。"),
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
async def test_vague_request_returns_a_clarification_prompt() -> None:
    graph = build_graph(FakeListChatModel(responses=["unused"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="怎么办")]},
        context={"mode": "discuss"},
    )

    assert result["recommendation"]["kind"] == "clarification"
    assert "补充" in result["messages"][-1].content


@pytest.mark.asyncio
async def test_research_mode_returns_a_deferred_plan_without_external_tools() -> None:
    graph = build_graph(FakeListChatModel(responses=["unused"]))

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="请调研这个市场的竞争情况")]},
        context={"mode": "research"},
    )

    assert result["recommendation"]["kind"] == "research_deferred"
    assert "调研" in result["messages"][-1].content


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
