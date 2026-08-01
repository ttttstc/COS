"""Single LYL counsel graph with mode routing and safe MVP fallbacks."""

import json
import logging
from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import Literal, cast, get_args

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.runtime import Runtime

from lyl_agent.models import create_chat_model
from lyl_agent.memory import MemoryRepository
from lyl_agent.settings import load_memory_db_path, load_settings
from lyl_agent.state import CounselContext, CounselMode, CounselScope, CounselState

logger = logging.getLogger(__name__)

COUNSEL_MODES = frozenset(get_args(CounselMode))
COUNSEL_SCOPES = frozenset(get_args(CounselScope))
STAGE_TITLES = {
    "intake": "读取议题",
    "mode_router": "判断模式",
    "retrieve_context": "恢复上下文",
    "problem_reframe": "重述问题",
    "synthesize_counsel": "形成建议",
}
CounselNode = Callable[..., Awaitable[CounselState]]


@lru_cache(maxsize=4)
def _memory_repository(database_path: str) -> MemoryRepository:
    return MemoryRepository(database_path)


def _append_stage(
    state: CounselState,
    stage: str,
    summary: str,
    *,
    reset_stages: bool = False,
    **updates: object,
) -> CounselState:
    """Return node updates with one completed stage for state streaming."""

    previous_stages = [] if reset_stages else state.get("stages", [])
    stages = [
        *previous_stages,
        {
            "id": stage,
            "title": STAGE_TITLES[stage],
            "status": "completed",
            "summary": summary,
        },
    ]
    return cast(CounselState, {**updates, "current_stage": stage, "stages": stages})


def _message_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            item["text"]
            for item in content
            if isinstance(item, dict) and isinstance(item.get("text"), str)
        )
    return str(content)


def _latest_user_request(state: CounselState) -> str:
    for message in reversed(state.get("messages", [])):
        if isinstance(message, HumanMessage):
            return _message_text(message.content).strip()
    return ""


def _infer_mode(question: str) -> CounselMode:
    if any(word in question for word in ("调研", "研究", "数据", "证据", "竞争", "市场")):
        return "research"
    if any(word in question for word in ("诊断", "复盘", "历史", "反复", "偏差")):
        return "diagnose"
    if any(word in question for word in ("下一步", "先做", "该先", "优先", "行动")):
        return "ask"
    if any(word in question for word in ("决定", "选择", "取舍", "选哪个", "是否")):
        return "decide"
    return "discuss"


def _context_mode(runtime: Runtime[CounselContext]) -> CounselMode | None:
    context = runtime.context or {}
    mode = context.get("mode")
    return cast(CounselMode, mode) if isinstance(mode, str) and mode in COUNSEL_MODES else None


def _context_identity(
    state: CounselState,
    runtime: Runtime[CounselContext] | None,
) -> tuple[str, str | None]:
    context = (runtime.context or {}) if runtime else {}
    user_id = context.get("user_id") or state.get("user_id") or "local-user"
    thread_id = context.get("thread_id") or state.get("thread_id")
    return str(user_id), str(thread_id) if thread_id else None


def _is_clarification_needed(question: str) -> bool:
    return question.strip() in {"", "你好", "怎么办", "下一步", "怎么看", "帮我决定"}


def _needs_research(mode: CounselMode, question: str) -> bool:
    if mode == "research":
        return True
    return mode == "decide" and any(
        word in question for word in ("数据", "证据", "市场", "政策", "调研")
    )


def _degraded_result(state: CounselState, error: Exception) -> CounselState:
    logger.exception("agent.counsel.degraded", extra={"error": str(error)})
    return _append_stage(
        state,
        "synthesize_counsel",
        "执行异常，已返回降级结果",
        messages=[AIMessage(content="暂时无法完成分析，请稍后重试或补充更多上下文。")],
        recommendation={"kind": "degraded"},
        error="graph_unavailable",
    )


async def _run_node(
    state: CounselState,
    node: CounselNode,
    *args: object,
) -> CounselState:
    """Make every graph node return the same user-readable failure shape."""

    try:
        return await node(state, *args)
    except Exception as error:
        return _degraded_result(state, error)


async def intake(state: CounselState) -> CounselState:
    question = _latest_user_request(state)
    return _append_stage(
        state,
        "intake",
        "已读取用户议题",
        reset_stages=True,
        raw_request=question,
        error=None,
    )


async def mode_router(
    state: CounselState,
    runtime: Runtime[CounselContext],
) -> CounselState:
    mode = _context_mode(runtime) or _infer_mode(state.get("raw_request", ""))
    context = runtime.context or {}
    updates: dict[str, object] = {"mode": mode}
    scope = context.get("scope")
    if isinstance(scope, str) and scope in COUNSEL_SCOPES:
        updates["scope"] = scope
    return _append_stage(state, "mode_router", f"已选择 {mode} 模式", **updates)


async def retrieve_context(
    state: CounselState,
    runtime: Runtime[CounselContext] | None = None,
    repository: MemoryRepository | None = None,
) -> CounselState:
    user_id, thread_id = _context_identity(state, runtime)
    context = (runtime.context or {}) if runtime else {}
    selected_memory_ids = context.get("selected_memory_ids")
    if not (
        isinstance(selected_memory_ids, list)
        and all(isinstance(item, str) for item in selected_memory_ids)
    ):
        selected_memory_ids = None
    active_repository = repository or _memory_repository(
        str(load_memory_db_path().resolve())
    )
    snapshot = active_repository.build_context_snapshot(
        user_id,
        query=state.get("raw_request"),
        selected_memory_ids=selected_memory_ids,
    )
    snapshot_data = snapshot.model_dump(mode="json")
    memory_ids = [
        item["id"]
        for group in ("goals", "matters", "patterns")
        for item in snapshot_data[group]
    ]
    retrieved_count = sum(
        len(snapshot_data[group])
        for group in ("goals", "matters", "decisions", "patterns")
    )
    updates: dict[str, object] = {
        "user_id": user_id,
        "selected_memory_ids": memory_ids,
        "context_snapshot": snapshot_data,
    }
    if thread_id:
        updates["thread_id"] = thread_id
    return _append_stage(
        state,
        "retrieve_context",
        f"已恢复 {retrieved_count} 条结构化上下文",
        **updates,
    )


async def problem_reframe(state: CounselState) -> CounselState:
    question = " ".join(state.get("raw_request", "").split())
    mode = state.get("mode", "discuss")
    clarification_needed = _is_clarification_needed(question)
    research_needed = _needs_research(mode, question)
    return _append_stage(
        state,
        "problem_reframe",
        "已判断问题复杂度",
        normalized_question=question,
        needs_clarification=clarification_needed,
        need_research=research_needed,
    )


async def synthesize_counsel(
    state: CounselState,
    model: BaseChatModel | None = None,
) -> CounselState:
    if state.get("needs_clarification"):
        return _append_stage(
            state,
            "synthesize_counsel",
            "等待用户补充关键信息",
            messages=[
                AIMessage(content="为了给出可靠建议，请补充目标、约束和可选方案。")
            ],
            recommendation={"kind": "clarification"},
        )

    if state.get("need_research"):
        return _append_stage(
            state,
            "synthesize_counsel",
            "已记录后续调研方向",
            messages=[
                AIMessage(
                    content="已识别需要调研的关键未知；当前基础 Graph 已记录方向，待调研能力接入后执行。"
                )
            ],
            recommendation={"kind": "research_deferred"},
        )

    active_model = model or create_chat_model(load_settings())
    snapshot = state.get("context_snapshot", {})
    context_message = SystemMessage(
        content=(
            "以下是可追溯的用户上下文。只在相关时使用；冲突项必须同时呈现，不得臆造。\n"
            + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
        )
    )
    response = await active_model.ainvoke([context_message, *state["messages"]])
    return _append_stage(
        state,
        "synthesize_counsel",
        "已形成基础建议",
        messages=[response],
        recommendation={"kind": "response", "mode": state.get("mode", "discuss")},
    )


def _route_after_node(state: CounselState) -> Literal["continue", "end"]:
    """Stop the run once a node has produced the shared degraded result."""

    return "end" if state.get("error") else "continue"


def build_graph(
    model: BaseChatModel | None = None,
    memory_repository: MemoryRepository | None = None,
) -> CompiledStateGraph:
    """Build the single counsel graph, optionally injecting a model for tests."""

    async def run_intake(state: CounselState) -> CounselState:
        return await _run_node(state, intake)

    async def run_mode_router(
        state: CounselState,
        runtime: Runtime[CounselContext],
    ) -> CounselState:
        return await _run_node(state, mode_router, runtime)

    async def run_retrieve_context(
        state: CounselState,
        runtime: Runtime[CounselContext],
    ) -> CounselState:
        return await _run_node(state, retrieve_context, runtime, memory_repository)

    async def run_problem_reframe(state: CounselState) -> CounselState:
        return await _run_node(state, problem_reframe)

    async def run_synthesize_counsel(state: CounselState) -> CounselState:
        return await _run_node(state, synthesize_counsel, model)

    builder = StateGraph(CounselState, context_schema=CounselContext)
    builder.add_node("intake", run_intake)
    builder.add_node("mode_router", run_mode_router)
    builder.add_node("retrieve_context", run_retrieve_context)
    builder.add_node("problem_reframe", run_problem_reframe)
    builder.add_node("synthesize_counsel", run_synthesize_counsel)
    builder.add_edge(START, "intake")
    builder.add_conditional_edges(
        "intake", _route_after_node, {"continue": "mode_router", "end": END}
    )
    builder.add_conditional_edges(
        "mode_router", _route_after_node, {"continue": "retrieve_context", "end": END}
    )
    builder.add_conditional_edges(
        "retrieve_context",
        _route_after_node,
        {"continue": "problem_reframe", "end": END},
    )
    builder.add_conditional_edges(
        "problem_reframe",
        _route_after_node,
        {"continue": "synthesize_counsel", "end": END},
    )
    builder.add_edge("synthesize_counsel", END)
    return builder.compile()


graph = build_graph()
