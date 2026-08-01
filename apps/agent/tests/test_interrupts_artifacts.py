import os
from pathlib import Path
from typing import cast

import pytest
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from lyl_agent.artifacts import CounselArtifact
from lyl_agent.graph import build_graph, request_decision
from lyl_agent.memory import MemoryRepository
from lyl_agent.settings import load_settings


def graph_with_checkpoint(tmp_path: Path, responses: list[str]) -> object:
    return build_graph(
        FakeListChatModel(responses=responses),
        MemoryRepository(tmp_path / "memory.sqlite3"),
        InMemorySaver(),
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("prompt", "mode", "kind"),
    [
        ("怎么办", "discuss", "scope_clarification"),
        ("速度和确定性之间如何取舍？", "decide", "value_tradeoff"),
        ("请调研这个市场", "research", "research_approval"),
    ],
)
async def test_each_interrupt_type_pauses_and_survives_reload(
    tmp_path: Path,
    prompt: str,
    mode: str,
    kind: str,
) -> None:
    graph = graph_with_checkpoint(tmp_path, ["final advice"])
    config = {"configurable": {"thread_id": f"thread-{kind}"}}

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=prompt)]},
        config,
        context={"mode": mode},
    )

    assert result["__interrupt__"][0].value["type"] == kind
    restored = graph.get_state(config)
    assert restored.next == ("request_decision",)
    assert restored.tasks[0].interrupts[0].value["type"] == kind


@pytest.mark.asyncio
async def test_resume_uses_same_thread_and_report_now_is_idempotent(tmp_path: Path) -> None:
    graph = graph_with_checkpoint(tmp_path, ["report with current information"])
    config = {"configurable": {"thread_id": "thread-report-now"}}
    paused = await graph.ainvoke(
        {"messages": [HumanMessage(content="请调研这个市场")]},
        config,
        context={"mode": "research"},
    )
    pending = paused["__interrupt__"][0]

    result = await graph.ainvoke(
        Command(resume={pending.id: "report_now"}),
        config,
        context={"mode": "research"},
    )

    assert result["interrupt_count"] == 1
    assert result["interrupt_decisions"] == [
        {"type": "research_approval", "selection": "report_now"}
    ]
    assert result["need_research"] is False
    assert result["messages"][-1].content == "report with current information"
    assert graph.get_state(config).next == ()
    duplicate = await graph.ainvoke(
        Command(resume={pending.id: "report_now"}),
        config,
        context={"mode": "research"},
    )
    assert len(duplicate["messages"]) == len(result["messages"])
    assert len(duplicate["artifact_versions"]) == 1
    assert duplicate["interrupt_count"] == 1


@pytest.mark.asyncio
async def test_interrupt_limit_skips_any_third_active_request() -> None:
    result = await request_decision(
        {
            "messages": [HumanMessage(content="怎么办")],
            "needs_clarification": True,
            "interrupt_count": 2,
        }
    )
    assert result["stages"][-1]["summary"] == "当前无需用户裁决"


@pytest.mark.asyncio
async def test_self_answerable_request_does_not_interrupt(tmp_path: Path) -> None:
    graph = graph_with_checkpoint(tmp_path, ["巴黎"])
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="法国首都是什么？")]},
        {"configurable": {"thread_id": "thread-fact"}},
        context={"mode": "discuss"},
    )
    assert "__interrupt__" not in result
    assert result["messages"][-1].content == "巴黎"


@pytest.mark.asyncio
async def test_artifact_streams_draft_then_freezes_final(tmp_path: Path) -> None:
    graph = graph_with_checkpoint(tmp_path, ["Do the smallest useful validation."])
    config = {"configurable": {"thread_id": "thread-artifact-stream"}}
    updates = [
        update
        async for update in graph.astream(
            {"messages": [HumanMessage(content="我下一步应先做什么？")]},
            config,
            context={"mode": "ask"},
            stream_mode="updates",
        )
    ]

    draft = next(update["prepare_artifact"]["artifact"] for update in updates if "prepare_artifact" in update)
    final = next(update["synthesize_counsel"]["artifact"] for update in updates if "synthesize_counsel" in update)
    assert draft["status"] == "draft"
    assert final["status"] == "final"
    assert final["version"] == draft["version"] == 1
    CounselArtifact.model_validate(final)


@pytest.mark.asyncio
async def test_new_artifact_version_preserves_and_supersedes_old_version(tmp_path: Path) -> None:
    graph = graph_with_checkpoint(tmp_path, ["first advice", "revised advice"])
    config = {"configurable": {"thread_id": "thread-artifact-versions"}}
    await graph.ainvoke(
        {"messages": [HumanMessage(content="先做什么？")]},
        config,
        context={"mode": "ask"},
    )
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="约束变化后再判断一次")]},
        config,
        context={"mode": "ask"},
    )

    assert [item["version"] for item in result["artifact_versions"]] == [1, 2]
    assert [item["status"] for item in result["artifact_versions"]] == [
        "superseded",
        "final",
    ]
    assert result["artifact"]["change_reason"]
    assert result["messages"][-1].content == result["recommendation"]["summary"]


@pytest.mark.live
@pytest.mark.asyncio
async def test_configured_graph_calls_real_llm(tmp_path: Path) -> None:
    if os.getenv("LYL_LIVE_TEST") != "1":
        pytest.skip("Set LYL_LIVE_TEST=1 to allow a real remote LLM call")

    assert load_settings().model_provider != "stub"
    graph = build_graph(
        memory_repository=MemoryRepository(tmp_path / "live-memory.sqlite3")
    )
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="只回复 COS_GRAPH_LIVE_OK")]},
        context={"mode": "discuss"},
    )

    content = cast(str, result["messages"][-1].content)
    assert "COS_GRAPH_LIVE_OK" in content
    assert result["artifact"]["status"] == "final"
    assert result["recommendation"]["summary"] == content
