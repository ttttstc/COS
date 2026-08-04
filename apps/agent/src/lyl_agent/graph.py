"""Single LYL counsel graph with mode routing and safe MVP fallbacks."""

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import Literal, cast, get_args

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.errors import GraphBubbleUp
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.runtime import Runtime
from langgraph.types import interrupt

from lyl_agent.artifacts import (
    DEFAULT_RECONSIDER_WHEN,
    artifact_summary,
    build_draft_artifact,
    finalize_artifact,
)
from lyl_agent.contracts import CounselSession, artifact_ref, core_mode_for_legacy
from lyl_agent.models import create_chat_model
from lyl_agent.memory import MemoryRepository
from lyl_agent.reasoning import (
    classify_problem,
    contradiction_for,
    default_decision_options,
    infer_scope,
    infer_goal,
    normalize_ask,
    normalize_decide,
    normalize_summary,
    parse_json_object,
    was_reported_now,
)
from lyl_agent.decision_machine import continuation_for, profile_for
from lyl_agent.settings import load_memory_db_path, load_settings
from lyl_agent.state import CounselContext, CounselMode, CounselState

logger = logging.getLogger(__name__)

COUNSEL_MODES = frozenset(get_args(CounselMode))
STAGE_TITLES = {
    "intake": "理解目标与态势",
    "mode_router": "判断模式",
    "retrieve_context": "恢复上下文",
    "problem_reframe": "诊断真实卡点",
    "request_decision": "选择参谋模式",
    "prepare_artifact": "形成唯一主行动",
    "synthesize_counsel": "控制与反馈",
}
MAX_ACTIVE_INTERRUPTS = 2
CounselNode = Callable[..., Awaitable[CounselState]]


def _reset_per_turn_fields() -> dict[str, object]:
    """Clear derived counsel fields while preserving thread-level history."""

    return {
        "problem_reason": None,
        "request_scope": None,
        "time_horizon": None,
        "desired_state": None,
        "current_state": None,
        "state_delta": None,
        "objectives": [],
        "constraints": [],
        "confirmed_facts": [],
        "protected_interests": [],
        "blocker_type": None,
        "decisive_condition": None,
        "recommended_mode": None,
        "candidate_state_transitions": [],
        "candidate_actions": [],
        "selected_action_id": None,
        "selected_action": None,
        "action_title": None,
        "action_description": None,
        "first_move": None,
        "deliverable": None,
        "done_when": [],
        "timebox": None,
        "expected_state_change": None,
        "not_now": [],
        "main_risk": None,
        "guardrail": None,
        "recovery": None,
        "not_doing_cost": None,
        "resource_cost": None,
        "side_effects": [],
        "recovery_path": None,
        "preserves_optionality": True,
        "observe": [],
        "review_when": None,
        "confidence_basis": None,
        "user_decision_needed": None,
        "continuation_status": "new",
        "continuation_basis": None,
        "situation_assessment": None,
        "key_judgments": [],
        "execution_steps": [],
        "risk_controls": [],
        "why_now": None,
        "completion_criteria": [],
        "pause_or_stop": [],
        "facts": [],
        "assumptions": [],
        "decision_question": None,
        "recommended_option_id": None,
        "recommendation_reason": None,
        "options": [],
        "opposition_view": [],
        "unresolved_unknowns": [],
        "value_tradeoffs": [],
    }


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


def _time_horizon(question: str) -> str:
    if any(word in question for word in ("现在", "今天", "立刻", "马上")):
        return "today"
    if "本周" in question or "这周" in question:
        return "week"
    if any(word in question for word in ("当前阶段", "这一阶段", "长期", "战略")):
        return "stage"
    return "custom"


def _previous_snapshot(state: CounselState) -> dict[str, object] | None:
    snapshot = state.get("decision_snapshot")
    if isinstance(snapshot, dict):
        return snapshot
    artifact = state.get("artifact")
    if isinstance(artifact, dict) and isinstance(artifact.get("decision_snapshot"), dict):
        return artifact["decision_snapshot"]
    return None


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
        artifact=None,
        artifact_versions=state.get("artifact_versions", []),
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
    except GraphBubbleUp:
        raise
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
        **_reset_per_turn_fields(),
    )


async def mode_router(
    state: CounselState,
    runtime: Runtime[CounselContext],
) -> CounselState:
    mode = _context_mode(runtime) or _infer_mode(state.get("raw_request", ""))
    context = runtime.context or {}
    question = state.get("raw_request", "")
    updates: dict[str, object] = {
        "mode": mode,
        "scope": infer_scope(question, context.get("scope")),
        "request_scope": infer_scope(question, context.get("scope")),
    }
    session = state.get("counsel_session")
    previous_modes: list[str] = []
    if isinstance(session, dict):
        previous = session.get("previous_modes")
        if isinstance(previous, list):
            previous_modes = [item for item in previous if isinstance(item, str)]
        previous_active = session.get("active_mode")
        if isinstance(previous_active, str) and previous_active not in previous_modes:
            previous_modes.append(previous_active)
    core_mode = core_mode_for_legacy(mode)
    issue_id = str(context.get("thread_id") or state.get("thread_id") or "local-issue")
    updates["counsel_session"] = CounselSession(
        issue_id=issue_id,
        subject=question or "当前议题",
        user_intent=question,
        active_mode=core_mode,
        previous_modes=[item for item in previous_modes if item != core_mode],
        current_stage="mode_router",
        status="active",
        active_decision_record_id=state.get("decision_record_id"),
    ).model_dump(mode="json")
    value_tradeoffs = context.get("value_tradeoffs")
    if isinstance(value_tradeoffs, list) and all(
        isinstance(item, str) for item in value_tradeoffs
    ):
        updates["value_tradeoffs"] = value_tradeoffs
    for field in ("objectives", "constraints"):
        value = context.get(field)
        if isinstance(value, list) and all(isinstance(item, str) for item in value):
            updates[field] = [item.strip() for item in value if item.strip()]
    options_from_user = context.get("options_from_user")
    if isinstance(options_from_user, list) and all(
        isinstance(item, str) for item in options_from_user
    ):
        updates["options"] = [
            option.model_dump(mode="json")
            for option in default_decision_options(question, options_from_user)
        ]
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
    def load_snapshot() -> object:
        active_repository = repository or _memory_repository(
            str(load_memory_db_path().resolve())
        )
        return active_repository.build_context_snapshot(
            user_id,
            query=state.get("raw_request"),
            selected_memory_ids=selected_memory_ids,
        )

    snapshot = await asyncio.to_thread(load_snapshot)
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
        "historical_patterns": snapshot_data.get("patterns", []),
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
    problem_reason = classify_problem(question, mode)
    machine_profile = profile_for(question) if mode == "ask" else None
    previous_snapshot = _previous_snapshot(state)
    continuation_status, continuation_basis = (
        continuation_for(question, previous_snapshot)
        if mode == "ask"
        else ("new", "当前模式不复用 ask 主行动。")
    )
    research_needed = _needs_research(mode, question) or (
        mode == "ask" and problem_reason == "information_insufficient"
    )
    if machine_profile:
        research_needed = machine_profile.recommended_mode == "research"
    research_plan = (
        {
            "title": "关键未知调研计划",
            "status": "draft",
            "key_unknowns": ["哪些外部事实会实质改变当前判断"],
            "proposed_angles": ["核对一手来源与相互独立的证据"],
            "stop_conditions": ["关键未知已得到交叉验证或证据不再改变判断"],
        }
        if research_needed
        else None
    )
    contradiction = (
        "议题范围尚不足以支持可靠判断。"
        if clarification_needed
        else contradiction_for(problem_reason, mode)
    )
    if machine_profile and machine_profile.hard_gate:
        contradiction = machine_profile.hard_gate.reason
    goal = infer_goal(question)
    updates: dict[str, object] = {
        "normalized_question": question,
        "needs_clarification": clarification_needed,
        "need_research": research_needed,
        "problem_reason": problem_reason,
        "main_contradiction": contradiction,
        "confidence": 60 if clarification_needed or research_needed else 70,
        "reconsider_when": DEFAULT_RECONSIDER_WHEN,
        "research_plan": research_plan,
        "unresolved_unknowns": (
            ["哪些外部事实会实质改变当前判断"] if research_needed else []
        ),
    }
    if machine_profile:
        updates.update(
            {
                "request_scope": state.get("scope"),
                "time_horizon": _time_horizon(question),
                "desired_state": goal or "把当前议题推进到可验证的下一状态。",
                "current_state": "已有用户议题输入，但仍需把目标、条件和反馈标准落到可执行判断。",
                "state_delta": machine_profile.state_delta,
                "confirmed_facts": state.get("facts", []),
                "protected_interests": [],
                "blocker_type": machine_profile.blocker_type,
                "decisive_condition": machine_profile.decisive_condition,
                "recommended_mode": machine_profile.recommended_mode,
                "candidate_state_transitions": [],
                "continuation_status": continuation_status,
                "continuation_basis": continuation_basis,
                "decision_snapshot": previous_snapshot,
                "user_decision_needed": machine_profile.hard_gate.user_decision_needed
                if machine_profile.hard_gate
                else None,
                "confidence_basis": "基于用户输入、已恢复上下文和 ask 决策协议的确定性检查。",
            }
        )
        if machine_profile.hard_gate:
            updates["need_research"] = False
    if mode == "decide" and not state.get("options"):
        updates["options"] = [
            option.model_dump(mode="json")
            for option in default_decision_options(question)
        ]
    session = state.get("counsel_session")
    if isinstance(session, dict):
        def session_items(value: object) -> list[dict[str, object]]:
            return [
                {"content": item}
                for item in value
                if isinstance(item, str)
            ] if isinstance(value, list) else []

        session_data = {
            **session,
            "subject": question or session.get("subject", "当前议题"),
            "user_intent": question,
            "desired_outcome": updates.get("desired_state") or session.get("desired_outcome", ""),
            "current_stage": "problem_reframe",
            "facts": session_items(updates.get("confirmed_facts", [])),
            "assumptions": session_items(updates.get("assumptions", state.get("assumptions", []))),
            "unknowns": session_items(updates.get("unresolved_unknowns", [])),
        }
        updates["counsel_session"] = CounselSession.model_validate(session_data).model_dump(mode="json")
    return _append_stage(state, "problem_reframe", "已判断问题复杂度", **updates)


def _decision_interrupt(state: CounselState) -> dict[str, object] | None:
    if state.get("mode") == "ask" and state.get("user_decision_needed"):
        decision = state["user_decision_needed"]
        return {
            "type": decision.get("type", "user_decision_needed"),
            "question": decision.get("question", "本议题需要用户确认关键边界。"),
            "reason": state.get("decisive_condition") or "普通行动评分不能替代该确认。",
            "actions": ["confirm_boundary", "report_now"],
        }
    if state.get("needs_clarification"):
        return {
            "type": "scope_clarification",
            "question": "本次建议应先聚焦哪个范围？",
            "options": [
                {
                    "id": "focused",
                    "label": "聚焦当前一步",
                    "description": "先给出可立即执行的最小建议。",
                },
                {
                    "id": "overall",
                    "label": "覆盖整体方向",
                    "description": "先梳理更完整的目标与约束。",
                },
            ],
            "recommended": "focused",
        }
    if state.get("mode") == "decide" and state.get("value_tradeoffs"):
        return {
            "type": "value_tradeoff",
            "question": "本次决定更优先速度还是确定性？",
            "why_needed": "这个取舍会直接改变证据门槛和建议节奏。",
            "options": [
                {"id": "speed", "label": "速度优先", "cost": "接受更高不确定性"},
                {"id": "certainty", "label": "确定性优先", "cost": "延后行动等待更多证据"},
            ],
            "recommended": "certainty",
        }
    if state.get("need_research"):
        plan = state.get("research_plan") or {}
        return {
            "type": "research_approval",
            "key_unknowns": plan.get("key_unknowns", []),
            "proposed_angles": plan.get("proposed_angles", []),
            "stop_conditions": plan.get("stop_conditions", []),
            # Research execution is owned by the later research Skill. Until it
            # exists, only expose the honest "report with current information" path.
            "actions": ["report_now"],
        }
    return None


def _allowed_resume_values(payload: dict[str, object]) -> set[str]:
    if payload.get("type") in {
        "research_approval",
        "user_decision_needed",
        "professional_confirmation",
        "condition_confirmation",
    } or (
        payload.get("type") == "value_tradeoff"
        and isinstance(payload.get("actions"), list)
    ):
        actions = payload.get("actions")
        return {item for item in actions if isinstance(item, str)} if isinstance(actions, list) else set()
    options = payload.get("options")
    allowed = {
        item["id"]
        for item in options
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    } if isinstance(options, list) else set()
    allowed.add("report_now")
    return allowed


async def request_decision(state: CounselState) -> CounselState:
    payload = _decision_interrupt(state)
    if not payload or state.get("interrupt_count", 0) >= MAX_ACTIVE_INTERRUPTS:
        return _append_stage(state, "request_decision", "当前无需用户裁决")

    selection = interrupt(payload)
    if not isinstance(selection, str) or selection not in _allowed_resume_values(payload):
        raise ValueError("Invalid or expired interrupt selection")

    decisions = [
        *state.get("interrupt_decisions", []),
        {"type": payload["type"], "selection": selection},
    ]
    updates: dict[str, object] = {
        "interrupt_count": state.get("interrupt_count", 0) + 1,
        "interrupt_decisions": decisions,
        "needs_clarification": False,
    }
    if selection == "report_now":
        updates["need_research"] = False
    return _append_stage(
        state,
        "request_decision",
        "已记录用户裁决并恢复原议题",
        **updates,
    )


async def prepare_artifact(state: CounselState) -> CounselState:
    artifact = build_draft_artifact(state)
    return _append_stage(
        state,
        "prepare_artifact",
        "已创建可流式更新的建议草稿",
        artifact=artifact.model_dump(mode="json"),
    )


async def synthesize_counsel(
    state: CounselState,
    model: BaseChatModel | None = None,
) -> CounselState:
    active_model = model or await asyncio.to_thread(
        lambda: create_chat_model(load_settings())
    )
    snapshot = state.get("context_snapshot", {})
    decisions = state.get("interrupt_decisions", [])
    mode = state.get("mode", "discuss")
    if mode == "ask":
        output_contract = {
            "scope": "local or global",
            "request_scope": "local or global",
            "time_horizon": "today | week | stage | custom",
            "desired_state": "the outcome the user wants to reach",
            "current_state": "the current reality supported by context",
            "state_delta": "the most important gap between current and desired state",
            "confirmed_facts": ["facts supported by the user or context"],
            "protected_interests": ["long-term goals, commitments, or bottom lines"],
            "blocker_type": "intent | value | information | decision | condition | path | execution | verification",
            "decisive_condition": "what must be true for the next state to be reached",
            "recommended_mode": "clarify | research | decide | prepare | act | verify | pause | stop | escalate",
            "current_stage": "中文短阶段标签，不要使用内部枚举名",
            "problem_reason": "goal_unclear | information_insufficient | too_many_options | action_resistance | no_clear_blocker",
            "main_contradiction": "one sentence",
            "candidate_actions": [
                {
                    "id": "stable-id",
                    "title": "short action",
                    "description": "action that can start now",
                    "completion_criteria": ["observable done condition"],
                    "impact": 0,
                    "uncertainty_reduction": 0,
                    "goal_contribution": 0,
                    "executability": 0,
                    "reversibility": 0,
                    "opportunity_cost": 0,
                    "expected_state_change": "state change caused by this candidate",
                    "first_move": "first observable move",
                    "deliverable": "concrete output",
                    "done_when": ["completion condition"],
                    "timebox": "timebox or trigger",
                    "main_risk": "main risk",
                    "guardrail": "guardrail",
                }
            ],
            "selected_action_id": "stable-id",
            "action_title": "one main action",
            "action_description": "direct recommendation",
            "selected_action": "the chosen state transition",
            "first_move": "the first observable action that can start now",
            "deliverable": "the concrete artifact or result produced",
            "done_when": ["observable done condition"],
            "timebox": "timebox or trigger",
            "expected_state_change": "what will be different after completion",
            "not_now": ["what must remain paused or stopped"],
            "main_risk": "largest realistic downside",
            "guardrail": "specific boundary that limits the downside",
            "recovery": "what to do if the action fails",
            "observe": ["feedback to watch"],
            "review_when": "when or on what event to review",
            "confidence_basis": "why this confidence level is warranted",
            "user_decision_needed": None,
            "continuation_status": "new | continue | complete | reconsider",
            "continuation_basis": "why the previous decision is continued or changed",
            "situation_assessment": "current situation assessment based only on the supplied context",
            "key_judgments": ["key judgment with the reason it matters"],
            "execution_steps": ["step 1", "step 2", "step 3"],
            "risk_controls": ["risk and corresponding guardrail"],
            "why_now": "why this action should happen now",
            "completion_criteria": ["observable done condition"],
            "pause_or_stop": ["what not to do yet"],
            "assumptions": ["explicit assumption"],
            "need_research": False,
            "confidence": 0,
            "reconsider_when": ["change condition"],
        }
    elif mode == "decide":
        output_contract = {
            "decision_question": "the underlying goal, not the user's proposed means",
            "objectives": ["desired outcomes"],
            "constraints": ["real constraints and bottom lines"],
            "facts": ["only facts supported by context or user"],
            "assumptions": ["explicit assumptions"],
            "unknowns": ["key unknowns; do not invent facts"],
            "main_contradiction": "one sentence",
            "options": [
                {
                    "id": "stable-id",
                    "title": "realistic option",
                    "summary": "what it means",
                    "benefits": ["benefit"],
                    "costs": ["cost"],
                    "risks": ["risk"],
                }
            ],
            "recommended_option_id": "stable-id",
            "recommendation_reason": "clear recommendation and why alternatives lose",
            "opposition_view": ["strongest reasonable counterargument"],
            "confidence": 0,
            "reconsider_when": ["change condition"],
        }
    else:
        output_contract = {"summary": "concise, directly displayable counsel"}
    context_message = SystemMessage(
        content=(
            "以下是可追溯的用户上下文。只在相关时使用；冲突项必须同时呈现，不得臆造。\n"
            + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
            + "\n用户对本轮关键取舍的裁决："
            + json.dumps(decisions, ensure_ascii=False, separators=(",", ":"))
            + "\n历史模式（仅作可追溯参考）："
            + json.dumps(
                state.get("historical_patterns", []),
                ensure_ascii=False,
                separators=(",", ":"),
            )
            + "\n当前用户请求（已清洗）："
            + state.get("raw_request", "")
            + "\nGraph 初步判断："
            + json.dumps(
                {
                    "scope": state.get("scope"),
                    "request_scope": state.get("request_scope"),
                    "time_horizon": state.get("time_horizon"),
                    "desired_state": state.get("desired_state"),
                    "current_state": state.get("current_state"),
                    "state_delta": state.get("state_delta"),
                    "problem_reason": state.get("problem_reason"),
                    "blocker_type": state.get("blocker_type"),
                    "main_contradiction": state.get("main_contradiction"),
                    "decisive_condition": state.get("decisive_condition"),
                    "recommended_mode": state.get("recommended_mode"),
                    "continuation_status": state.get("continuation_status"),
                    "previous_decision_snapshot": state.get("decision_snapshot"),
                    "user_decision_needed": state.get("user_decision_needed"),
                    "need_research": state.get("need_research"),
                },
                ensure_ascii=False,
                separators=(",", ":"),
            )
            + "\n当前模式："
            + mode
            + "。请只返回一个 JSON 对象，不要 Markdown，不要私有思维链。"
            + "ask 模式必须遵守：硬门控优先于候选选择；推荐模式只能从契约枚举中选择；默认只给一个主行动；"
            + "主行动必须通过‘现在能开始、完成可判断、结果会影响后续’三项承诺测试。"
            + "若 Graph 初步判断命中硬门控，不得用普通行动替代专业确认、用户裁决或权限确认。"
            + "若 continuation_status 为 continue，除非用户明确报告结果或新约束，不得无理由改写上一轮主行动。"
            + "正式字段契约："
            + json.dumps(output_contract, ensure_ascii=False, separators=(",", ":"))
            + "\n当前版本没有执行外部调研，不得声称已完成调研。"
        )
    )
    response = await active_model.ainvoke([context_message, *state["messages"]])
    response_text = _message_text(response.content).strip()
    payload = parse_json_object(response_text)
    if mode == "ask":
        reasoning_updates, display_text = normalize_ask(state, payload, response_text)
    elif mode == "decide":
        reasoning_updates, display_text = normalize_decide(state, payload, response_text)
    else:
        reasoning_updates, display_text = {}, normalize_summary(payload, response_text)
    enriched_state = cast(CounselState, {**state, **reasoning_updates})
    final, versions = finalize_artifact(enriched_state, display_text)
    # Modes without a dedicated Skill card still need their real model answer
    # to remain the recommendation summary (rather than the generic card
    # fallback used while those cards are being designed).
    summary = display_text if mode not in {"ask", "decide"} else artifact_summary(final)
    card = final.tabs.counsel
    # Keep provider-specific JSON out of the persisted chat transcript. The
    # artifact retains the normalized structured fields for the UI.
    stage_updates: dict[str, object] = {
        **reasoning_updates,
        "messages": [AIMessage(content=display_text)],
        "recommendation": {
            "kind": "artifact",
            "mode": mode,
            "summary": summary,
        },
        "main_contradiction": card.main_contradiction,
        "confidence": card.confidence,
        "reconsider_when": card.reconsider_when,
        "artifact": final.model_dump(mode="json"),
        "artifact_versions": versions,
        "decision_snapshot": final.decision_snapshot,
    }
    session = state.get("counsel_session")
    if isinstance(session, dict):
        stage_updates["counsel_session"] = CounselSession.model_validate(
            {
                **session,
                "current_stage": "synthesize_counsel",
                "status": "ready",
                "active_artifact_id": artifact_ref(final.artifact_type, final.version),
                "active_decision_record_id": state.get("decision_record_id"),
                "review_trigger": {
                    "reconsider_when": card.reconsider_when,
                    "review_when": state.get("review_when"),
                },
            }
        ).model_dump(mode="json")
    return _append_stage(
        enriched_state,
        "synthesize_counsel",
        "已形成基础建议",
        **stage_updates,
    )


def _route_after_node(state: CounselState) -> Literal["continue", "end"]:
    """Stop the run once a node has produced the shared degraded result."""

    return "end" if state.get("error") else "continue"


def _route_after_synthesis(state: CounselState) -> Literal["continue", "end"]:
    """Give model-discovered research needs the same approval gate as heuristics."""

    if state.get("error"):
        return "end"
    if (
        state.get("need_research")
        and state.get("interrupt_count", 0) < MAX_ACTIVE_INTERRUPTS
        and not was_reported_now(state)
    ):
        return "continue"
    return "end"


def build_graph(
    model: BaseChatModel | None = None,
    memory_repository: MemoryRepository | None = None,
    checkpointer: BaseCheckpointSaver | None = None,
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

    async def run_request_decision(state: CounselState) -> CounselState:
        return await _run_node(state, request_decision)

    async def run_prepare_artifact(state: CounselState) -> CounselState:
        return await _run_node(state, prepare_artifact)

    async def run_synthesize_counsel(state: CounselState) -> CounselState:
        return await _run_node(state, synthesize_counsel, model)

    builder = StateGraph(CounselState, context_schema=CounselContext)
    builder.add_node("intake", run_intake)
    builder.add_node("mode_router", run_mode_router)
    builder.add_node("retrieve_context", run_retrieve_context)
    builder.add_node("problem_reframe", run_problem_reframe)
    builder.add_node("request_decision", run_request_decision)
    builder.add_node("prepare_artifact", run_prepare_artifact)
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
        {"continue": "request_decision", "end": END},
    )
    builder.add_edge("request_decision", "prepare_artifact")
    builder.add_conditional_edges(
        "prepare_artifact",
        _route_after_node,
        {"continue": "synthesize_counsel", "end": END},
    )
    builder.add_conditional_edges(
        "synthesize_counsel",
        _route_after_synthesis,
        {"continue": "request_decision", "end": END},
    )
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
