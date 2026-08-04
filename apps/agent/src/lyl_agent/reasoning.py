"""Small, deterministic normalizers for the ask and decide counsel skills.

The model is asked for a structured JSON object, but a provider can still return
plain text or partial JSON.  These helpers keep the graph useful in both cases:
valid model fields are preserved and missing fields fall back to explainable,
reversible defaults instead of invented facts.
"""

from __future__ import annotations

import json
import re
from typing import Literal

from pydantic import BaseModel, Field

from lyl_agent.artifacts import DecisionOption
from lyl_agent.decision_machine import (
    DecisionProfile,
    commitment_complete,
    profile_for,
    rank_action_keys,
)
from lyl_agent.state import CounselState

ProblemReason = Literal[
    "goal_unclear",
    "information_insufficient",
    "too_many_options",
    "action_resistance",
    "no_clear_blocker",
]


class ActionCandidate(BaseModel):
    id: str
    title: str
    description: str
    completion_criteria: list[str] = Field(default_factory=list)
    impact: int = Field(default=3, ge=0, le=5)
    uncertainty_reduction: int = Field(default=3, ge=0, le=5)
    goal_contribution: int = Field(default=3, ge=0, le=5)
    executability: int = Field(default=3, ge=0, le=5)
    reversibility: int = Field(default=3, ge=0, le=5)
    opportunity_cost: int = Field(default=2, ge=0, le=5)
    expected_state_change: str = ""
    first_move: str = ""
    deliverable: str = ""
    done_when: list[str] = Field(default_factory=list)
    timebox: str | None = None
    main_risk: str = ""
    guardrail: str = ""


VALID_PROBLEM_REASONS = {
    "goal_unclear",
    "information_insufficient",
    "too_many_options",
    "action_resistance",
    "no_clear_blocker",
}


def parse_json_object(text: str) -> dict[str, object] | None:
    """Parse a JSON object from a model response, including fenced JSON."""

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.I)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        if start < 0:
            return None
        try:
            value, _ = json.JSONDecoder().raw_decode(cleaned[start:])
        except json.JSONDecodeError:
            return None
    return value if isinstance(value, dict) else None


def _strings(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _text(value: object) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def infer_goal(question: str) -> str | None:
    for pattern in (r"真正目标(?:是|为)\s*([^，。！？]+)", r"为了\s*([^，。！？]+)"):
        match = re.search(pattern, question)
        if match:
            return match.group(1).strip()
    return None


def _bounded(value: object, default: int) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return default
    normalized = value * 100 if 0 <= value <= 1 else value
    return max(0, min(100, round(normalized)))


def _score_0_to_5(value: object, default: int = 3) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return default
    # Providers commonly emit either a 0-5 rubric, a 0-10 rubric, or a
    # percentage. Preserve all three scales instead of treating 6-10 as 0-5.
    if value <= 5:
        normalized = value
    elif value <= 10:
        normalized = value / 2
    else:
        normalized = value / 20
    return max(0, min(5, round(normalized)))


def _safe_display(response_text: str, fallback: str, payload: dict[str, object] | None) -> str:
    """Keep malformed structured output out of the user-facing recommendation.

    This helper is only used when parsing did not produce a usable structured
    payload; valid ask/decide payloads get their own normalized display text.
    """

    if payload or not response_text.strip():
        return fallback
    if response_text.lstrip().startswith(("{", "[", "```")) or '"decision_question"' in response_text:
        return fallback
    return response_text.strip()


def _ask_report_text(
    *,
    title: str,
    description: str,
    situation: str,
    judgments: list[str],
    steps: list[str],
    risks: list[str],
    completion: list[str],
    why_now: str,
    decisive_condition: str,
    first_move: str,
    deliverable: str,
    expected_state_change: str,
    not_now: list[str],
    reconsider_when: list[str],
    recovery: str,
    observe: list[str],
    main_risk: str,
    guardrail: str,
) -> str:
    """Render a concise executive brief for the chat transcript.

    The full structured report remains in the artifact; this keeps the chat
    message readable while making the recommendation auditable at a glance.
    """

    def bullets(items: list[str]) -> str:
        return "\n".join(f"- {item}" for item in items)

    risk_lines = [*risks]
    if main_risk:
        risk_lines.insert(0, f"最大风险：{main_risk}")
    if guardrail:
        risk_lines.append(f"护栏：{guardrail}")
    if recovery:
        risk_lines.append(f"失败恢复：{recovery}")
    return (
        f"参谋判断：{situation}\n\n"
        f"关键判断：\n{bullets(judgments)}\n\n"
        f"明确建议：{title}\n{description}\n\n"
        f"为什么现在：{why_now}\n\n"
        f"决胜条件：{decisive_condition}\n\n"
        f"第一步：{first_move}\n产物：{deliverable}\n预期变化：{expected_state_change}\n\n"
        f"执行步骤：\n{bullets(steps)}\n\n"
        f"完成标准：\n{bullets(completion)}\n\n"
        f"暂缓事项：\n{bullets(not_now)}\n\n"
        f"风险与护栏：\n{bullets(risk_lines)}\n\n"
        f"反馈与改判：\n观察：\n{bullets(observe)}\n改判条件：\n{bullets(reconsider_when)}"
    )


def infer_scope(question: str, explicit: object = None) -> Literal["local", "global"]:
    if explicit in {"local", "global"}:
        return explicit
    if any(word in question for word in ("近期", "今年", "本月", "下月", "本周", "今天", "眼前")):
        return "local"
    return (
        "global"
        if any(word in question for word in ("长期", "战略", "全局", "整体", "年度", "方向"))
        else "local"
    )


_STAGE_LABELS = {
    "pre_interview_prep": "访谈前准备",
    "validate_assumption": "验证关键假设",
    "reduce_uncertainty": "降低关键不确定性",
    "clarify_goal": "明确目标",
    "choose_criterion": "确定筛选标准",
    "start_small": "启动最小行动",
    "form_recommendation": "形成建议",
}


def _stage_label(value: object) -> str | None:
    stage = _text(value)
    return _STAGE_LABELS.get(stage, stage) if stage else None


def classify_problem(question: str, mode: str) -> ProblemReason:
    normalized = question.strip()
    goal_unclear_words = (
        "不清楚目标",
        "目标不清楚",
        "目标不明确",
        "没想清",
        "不知道要达成",
        "不知道目标",
    )
    if (
        not normalized
        or normalized in {"怎么办", "下一步", "怎么看", "帮我决定"}
        or (
            any(word in normalized for word in goal_unclear_words)
            and "清楚目标" not in normalized
            and "目标清晰" not in normalized
        )
    ):
        return "goal_unclear"
    if any(word in normalized for word in ("拖延", "害怕", "不敢", "卡住", "迟迟", "阻力", "启动不了")):
        return "action_resistance"
    if any(word in normalized for word in ("多个", "很多", "太多", "都想", "难以取舍")) or normalized.count("方案") >= 3:
        return "too_many_options"
    if any(word in normalized for word in ("数据", "证据", "信息不足", "不了解", "市场", "政策")):
        return "information_insufficient"
    return "no_clear_blocker"


def contradiction_for(reason: ProblemReason, mode: str) -> str:
    if reason == "goal_unclear":
        return "真正要达成的结果尚未明确，行动容易变成无效忙碌。"
    if reason == "information_insufficient":
        return "行动速度与获得足够判断依据之间存在冲突。"
    if reason == "too_many_options":
        return "可选路径过多，比较成本正在挤压真正重要的决策标准。"
    if reason == "action_resistance":
        return "知道方向与愿意开始之间存在执行阻力。"
    return (
        "需要在行动速度、目标贡献和判断可靠性之间取得平衡。"
        if mode == "ask"
        else "需要在目标收益、行动速度与判断可靠性之间取得平衡。"
    )


def _option_from_text(index: int, title: str) -> DecisionOption:
    clean_title = title.strip() or f"方案 {index}"
    return DecisionOption(
        id=f"option-{index}",
        title=clean_title,
        summary="先用可逆的小范围行动验证该方案的关键假设。",
        benefits=["能快速获得真实反馈"],
        costs=["需要投入一轮验证时间"],
        risks=["验证结果可能不足以支持长期结论"],
    )


def extract_option_titles(question: str) -> list[str]:
    """Extract explicit A/B-style options without treating arbitrary prose as facts."""

    labels = re.findall(r"(?:方案|选项)?\s*([A-DＡ-Ｄ]|[一二三四]|[甲乙丙丁])", question, re.I)
    unique: list[str] = []
    for label in labels:
        normalized = label.translate(str.maketrans("ＡＢＣＤ", "ABCD"))
        title = f"方案 {normalized}"
        if title not in unique:
            unique.append(title)
    return unique[:4]


def default_decision_options(
    question: str,
    raw_options: object = None,
) -> list[DecisionOption]:
    options: list[DecisionOption] = []
    if isinstance(raw_options, list):
        for item in raw_options:
            if isinstance(item, str) and item.strip():
                options.append(_option_from_text(len(options) + 1, item))
            elif isinstance(item, dict):
                try:
                    options.append(DecisionOption.model_validate(item))
                except Exception:
                    continue
    if not options:
        options = [_option_from_text(index + 1, title) for index, title in enumerate(extract_option_titles(question))]
    if len(options) < 2:
        options = [
            _option_from_text(1, "先做最小可逆验证"),
            _option_from_text(2, "先补充关键信息再决定"),
        ]
    return options[:4]


def _fallback_action(reason: ProblemReason) -> ActionCandidate:
    candidates = {
        "goal_unclear": ActionCandidate(
            id="clarify-success",
            title="写下本周唯一成功标准",
            description="用一句话写清本周要达成的可观察结果，再只保留服务于它的动作。",
            completion_criteria=["写出一句可观察、可验证的成功标准"],
            impact=4,
            uncertainty_reduction=4,
            goal_contribution=5,
            executability=5,
            reversibility=5,
            opportunity_cost=1,
        ),
        "information_insufficient": ActionCandidate(
            id="verify-key-unknown",
            title="先验证一个决定性未知",
            description="列出最可能改变判断的一个未知，并设计一个最小验证动作；不要先扩张搜索范围。",
            completion_criteria=["明确一个未知", "完成一次最小验证并记录结果"],
            impact=4,
            uncertainty_reduction=5,
            goal_contribution=4,
            executability=4,
            reversibility=5,
            opportunity_cost=2,
        ),
        "too_many_options": ActionCandidate(
            id="set-decision-rule",
            title="先确定唯一筛选标准",
            description="写下这次选择最不能牺牲的一个标准，并删掉无法满足它的路径。",
            completion_criteria=["写出一个不可妥协标准", "把候选压缩到不超过两个"],
            impact=4,
            uncertainty_reduction=3,
            goal_contribution=5,
            executability=5,
            reversibility=5,
            opportunity_cost=1,
        ),
        "action_resistance": ActionCandidate(
            id="start-fifteen-minutes",
            title="只开工十五分钟",
            description="把目标缩小为十五分钟内能完成的第一步，完成后再决定是否继续。",
            completion_criteria=["完成一次不超过十五分钟的开工动作"],
            impact=3,
            uncertainty_reduction=3,
            goal_contribution=4,
            executability=5,
            reversibility=5,
            opportunity_cost=1,
        ),
        "no_clear_blocker": ActionCandidate(
            id="run-small-test",
            title="做一次最小可逆测试",
            description="先做一个能在今天完成、失败成本可控的最小测试，用真实反馈替代继续猜测。",
            completion_criteria=["完成一次最小测试", "记录结果与下一步判断"],
            impact=4,
            uncertainty_reduction=4,
            goal_contribution=4,
            executability=5,
            reversibility=5,
            opportunity_cost=2,
        ),
    }
    return candidates[reason]


def _gate_action(profile: DecisionProfile) -> ActionCandidate:
    mode = profile.recommended_mode
    title_by_mode = {
        "escalate": "先完成专业或责任边界确认",
        "clarify": "先确认关键条件是否具备",
        "decide": "先确认本次优先保护的价值",
    }
    description_by_mode = {
        "escalate": "不要直接执行高风险动作；先把事实、边界和责任人确认清楚，再决定是否继续。",
        "clarify": "先确认权限、资源或外部依赖，不把尚未确认的条件当作已具备。",
        "decide": "先让用户明确价值排序与可接受代价，再比较具体路径。",
    }
    title = title_by_mode.get(mode, title_by_mode["escalate"])
    description = description_by_mode.get(mode, description_by_mode["escalate"])
    return ActionCandidate(
        id=f"gate-{mode}",
        title=title,
        description=description,
        completion_criteria=["完成必要的专业、权限或价值边界确认"],
        impact=5,
        uncertainty_reduction=5,
        goal_contribution=5,
        executability=4,
        reversibility=5,
        opportunity_cost=1,
        expected_state_change="从未经确认的高风险状态转为具备明确边界的可决策状态",
        first_move="列出必须确认的事实、责任人和不能承受的后果",
        deliverable="一份边界确认记录",
        done_when=["确认事实、责任人和下一步边界"],
        timebox="在采取不可逆动作前完成",
        main_risk="把通用建议误当成针对个体的专业结论",
        guardrail="未完成确认前不执行不可逆或可能造成伤害的动作",
    )


def _mode_action(mode: str) -> ActionCandidate | None:
    if mode == "pause":
        return ActionCandidate(
            id="pause-and-review",
            title="暂停新增投入并做一次复盘",
            description="先冻结新增承诺与扩张动作，整理已有结果和继续投入的最低条件。",
            completion_criteria=["列出继续、调整、停止各自的触发条件"],
            impact=4,
            uncertainty_reduction=4,
            goal_contribution=4,
            executability=5,
            reversibility=5,
            opportunity_cost=1,
            expected_state_change="从盲目推进转为有边界的等待或复盘",
            first_move="暂停下一笔新增投入，并写下暂停原因",
            deliverable="一页复盘与恢复条件",
            done_when=["明确继续、调整或停止的触发条件"],
            timebox="本周内复盘一次",
            main_risk="暂停变成无限期拖延",
            guardrail="必须写出明确的复盘时间和恢复条件",
        )
    if mode == "stop":
        return ActionCandidate(
            id="stop-with-closure",
            title="停止扩张并完成收口",
            description="停止新增投入，保留必要记录和恢复路径，避免沉没成本继续扩大。",
            completion_criteria=["完成收口记录并关闭新增投入"],
            impact=4,
            uncertainty_reduction=3,
            goal_contribution=4,
            executability=5,
            reversibility=4,
            opportunity_cost=1,
            expected_state_change="从持续消耗转为可解释、可恢复的结束状态",
            first_move="列出必须保留的资产、责任和收口动作",
            deliverable="收口清单与恢复条件",
            done_when=["完成收口并记录停止依据"],
            timebox="在下一笔投入前完成",
            main_risk="停止过快导致重要资产或关系损失",
            guardrail="先保留证据、交接和可恢复路径，再关闭投入",
        )
    return None


def _continuation_action(
    status: str,
    snapshot: object,
) -> ActionCandidate | None:
    if status not in {"complete", "reconsider"}:
        return None
    previous_title = (
        _text(snapshot.get("action_title"))
        if isinstance(snapshot, dict)
        else ""
    ) or "上一轮主行动"
    if status == "complete":
        return ActionCandidate(
            id="review-completed-action",
            title="复盘已完成行动并决定是否继续",
            description=f"先核对“{previous_title}”的实际结果与预期差异，再决定继续、调整或停止。",
            completion_criteria=["记录实际结果与关键偏差", "明确继续、调整或停止"],
            impact=4,
            uncertainty_reduction=5,
            goal_contribution=5,
            executability=5,
            reversibility=5,
            opportunity_cost=1,
            expected_state_change="从已执行转为有证据支持的后续选择",
            first_move="写下实际结果、预期结果和两者的最大差异",
            deliverable="一页结果复盘与后续选择",
            done_when=["完成结果对照", "明确继续、调整或停止"],
            timebox="今天完成",
            main_risk="把完成动作误当成目标已经达成",
            guardrail="先记录事实和结果，再决定是否增加投入",
        )
    return ActionCandidate(
        id="reconsider-with-feedback",
        title="基于新反馈重新判断下一步",
        description=f"保留“{previous_title}”作为对照，明确新反馈改变了哪个假设，再重排可逆行动。",
        completion_criteria=["写清新反馈改变的假设", "形成一个新的可逆主行动"],
        impact=4,
        uncertainty_reduction=5,
        goal_contribution=5,
        executability=4,
        reversibility=5,
        opportunity_cost=1,
        expected_state_change="从原假设受挑战转为基于新证据的行动选择",
        first_move="列出新反馈支持、反驳和未解决的各一条事实",
        deliverable="一页假设更新与新行动判断",
        done_when=["明确被改变的假设", "选出一个可逆的新主行动"],
        timebox="本轮复盘内完成",
        main_risk="只因一次反例就完全推翻原方向",
        guardrail="区分事实、解释和待验证假设，不扩大结论",
    )


def was_reported_now(state: CounselState) -> bool:
    """Return whether this persisted counsel state contains a report-now choice."""

    return any(
        isinstance(item, dict) and item.get("selection") == "report_now"
        for item in state.get("interrupt_decisions", [])
    )


def normalize_summary(payload: dict[str, object] | None, response_text: str) -> str:
    """Extract a safe summary for modes whose full Skill is not implemented."""

    summary = _text(payload.get("summary")) if payload else None
    if summary:
        return summary
    return _safe_display(
        response_text,
        "暂时无法形成可展示的建议，请补充更多上下文。",
        payload,
    )


def normalize_ask(
    state: CounselState,
    payload: dict[str, object] | None,
    response_text: str,
) -> tuple[dict[str, object], str]:
    data = payload or {}
    question = state.get("raw_request", "")
    blocker = state.get("blocker_type")
    profile = profile_for(question, blocker if blocker in {
        "intent", "value", "information", "decision", "condition", "path", "execution", "verification"
    } else None)
    reason = data.get("problem_reason")
    if reason not in VALID_PROBLEM_REASONS:
        reason = state.get("problem_reason") or classify_problem(
            state.get("raw_request", ""), "ask"
        )
    fallback = _fallback_action(reason)
    continuation_status = state.get("continuation_status") or "new"
    previous_snapshot = state.get("decision_snapshot")
    continuation_action = _continuation_action(
        continuation_status,
        previous_snapshot,
    )
    candidates: list[ActionCandidate] = []
    raw_candidates = data.get("candidate_actions")
    if isinstance(raw_candidates, list):
        for item in raw_candidates:
            if isinstance(item, dict):
                try:
                    candidate_data = dict(item)
                    for field in (
                        "impact",
                        "uncertainty_reduction",
                        "goal_contribution",
                        "executability",
                        "reversibility",
                        "opportunity_cost",
                    ):
                        candidate_data[field] = _score_0_to_5(
                            candidate_data.get(field),
                        )
                    candidate = ActionCandidate.model_validate(candidate_data)
                except Exception:
                    continue
                if candidate.id not in {existing.id for existing in candidates}:
                    candidates.append(candidate)
    mode_action = _mode_action(profile.recommended_mode)
    if profile.hard_gate:
        candidates = [_gate_action(profile)]
    elif continuation_action:
        candidates = [continuation_action]
    elif mode_action:
        candidates = [mode_action]
    elif not candidates:
        candidates = [fallback]
    candidates = candidates[:3]
    # The model can describe and enrich candidates, but deterministic protocol
    # ranking owns the final choice. A valid model-selected id must not bypass
    # the hard-gate/lexicographic ordering contract.
    selected_id = max(
        candidates,
        key=lambda item: rank_action_keys(item.model_dump(mode="json")),
    ).id
    selected = next(item for item in candidates if item.id == selected_id)
    # Keep the user-visible recommendation and its commitment fields aligned
    # with the deterministically selected candidate, rather than trusting a
    # second, free-form top-level model selection.
    data = {
        **data,
        "action_title": selected.title,
        "action_description": selected.description,
    }
    if selected.completion_criteria:
        data["completion_criteria"] = selected.completion_criteria
    for field in (
        "first_move",
        "deliverable",
        "timebox",
        "expected_state_change",
        "main_risk",
        "guardrail",
    ):
        value = getattr(selected, field)
        if value:
            data[field] = value
    if selected.done_when:
        data["done_when"] = selected.done_when
    if continuation_status == "continue" and isinstance(previous_snapshot, dict):
        previous_title = _text(previous_snapshot.get("action_title"))
        previous_action = _text(previous_snapshot.get("current_action"))
        if previous_title:
            data = {**data, "action_title": previous_title}
        if previous_action:
            data = {**data, "action_description": previous_action}
    if continuation_action:
        data = {
            **data,
            "action_title": selected.title,
            "action_description": selected.description,
            "first_move": selected.first_move,
            "deliverable": selected.deliverable,
            "done_when": selected.done_when,
            "timebox": selected.timebox,
            "expected_state_change": selected.expected_state_change,
            "main_risk": selected.main_risk,
            "guardrail": selected.guardrail,
        }
    if profile.hard_gate:
        data = {
            **data,
            "action_title": selected.title,
            "action_description": selected.description,
        }
    description = _text(data.get("action_description")) or selected.description
    title = _text(data.get("action_title")) or selected.title
    contradiction = _text(data.get("main_contradiction")) \
        or state.get("main_contradiction") \
        or contradiction_for(reason, "ask")
    situation = _text(data.get("situation_assessment")) or (
        f"当前的主要矛盾是“{contradiction}”，应先处理最能改变判断的环节。"
    )
    judgments = _strings(data.get("key_judgments")) or [
        f"“{title}”比继续扩大讨论更能获得可验证反馈。",
        "先验证关键假设，再决定是否增加投入。",
    ]
    done_when = _strings(data.get("done_when")) or selected.done_when
    completion = _strings(data.get("completion_criteria")) or done_when or selected.completion_criteria or fallback.completion_criteria
    steps = _strings(data.get("execution_steps")) or [
        f"先完成：{description}",
        *[f"记录结果：{criterion}" for criterion in completion[:2]],
    ]
    risks = _strings(data.get("risk_controls")) or [
        "设置时间与投入上限；结果不支持时暂停扩张并重新判断。",
    ]
    why_now = _text(data.get("why_now")) or "这是当前信息下最值得优先推进、且失败成本可控的动作。"
    decisive_condition = (
        _text(data.get("decisive_condition"))
        or state.get("decisive_condition")
        or profile.decisive_condition
    )
    first_move = _text(data.get("first_move")) or selected.first_move or description
    deliverable = _text(data.get("deliverable")) or selected.deliverable or f"一份可检查的记录：{completion[0]}"
    timebox = _text(data.get("timebox")) or selected.timebox or ("今天" if state.get("time_horizon") == "today" else "本轮行动内")
    expected_state_change = _text(data.get("expected_state_change")) or selected.expected_state_change or profile.state_delta
    not_now = _strings(data.get("not_now")) or _strings(state.get("not_now")) or _strings(data.get("pause_or_stop")) or ["暂停同时推进多个方向，直到主行动完成。"]
    main_risk = _text(data.get("main_risk")) or selected.main_risk or "行动投入超过当前证据能支持的范围。"
    guardrail = _text(data.get("guardrail")) or selected.guardrail or "设置时间与投入上限，结果不支持时暂停扩张。"
    recovery = _text(data.get("recovery")) or "记录失败原因，回到决胜条件并缩小下一轮动作。"
    observe = _strings(data.get("observe")) or ["完成标准是否达成", "关键假设是否得到支持"]
    review_when = _text(data.get("review_when")) or "完成主行动后立即复盘"
    reconsider_when = _strings(data.get("reconsider_when")) or state.get("reconsider_when") or ["完成最小测试后结果不支持当前方向"]
    confidence_basis = _text(data.get("confidence_basis")) or state.get("confidence_basis") or "基于当前上下文和明确的完成标准。"
    user_decision_needed = (
        data.get("user_decision_needed")
        if isinstance(data.get("user_decision_needed"), dict)
        else state.get("user_decision_needed")
        or (profile.hard_gate.user_decision_needed if profile.hard_gate else None)
    )
    commitment_passed = commitment_complete(
        first_move=first_move,
        deliverable=deliverable,
        done_when=completion,
        expected_state_change=expected_state_change,
    )
    if not commitment_passed:
        first_move = first_move or description
        deliverable = deliverable or "一份可检查的记录"
        expected_state_change = expected_state_change or profile.state_delta
    plain_response = _safe_display(response_text, "", payload) if not payload else ""
    report_description = plain_response or description
    display_text = _ask_report_text(
        title=title,
        description=report_description,
        situation=situation,
        judgments=judgments,
        steps=steps,
        risks=risks,
        completion=completion,
        why_now=why_now,
        decisive_condition=decisive_condition,
        first_move=first_move,
        deliverable=deliverable,
        expected_state_change=expected_state_change,
        not_now=not_now,
        reconsider_when=reconsider_when,
        recovery=recovery,
        observe=observe,
        main_risk=main_risk,
        guardrail=guardrail,
    )
    reported_now = was_reported_now(state)
    state_confidence = state.get("confidence")
    need_research = False if reported_now or profile.hard_gate else (
        bool(state.get("need_research"))
        or bool(data.get("need_research"))
        or profile.recommended_mode == "research"
    )
    candidate_transitions = [
        {
            **item.model_dump(mode="json"),
            "lexicographic_rank": list(rank_action_keys(item.model_dump(mode="json"))),
            "commitment_test_passed": item.id == selected_id and commitment_passed,
        }
        for item in candidates
    ]
    updates: dict[str, object] = {
        "scope": infer_scope(question, data.get("scope") or state.get("scope")),
        "request_scope": infer_scope(question, data.get("request_scope") or state.get("scope")),
        "time_horizon": _text(data.get("time_horizon")) or state.get("time_horizon") or "custom",
        "desired_state": _text(data.get("desired_state")) or state.get("desired_state") or "把当前议题推进到可验证的下一状态。",
        "current_state": _text(data.get("current_state")) or state.get("current_state") or "已有议题输入，正在形成可执行判断。",
        "state_delta": _text(data.get("state_delta")) or state.get("state_delta") or profile.state_delta,
        "confirmed_facts": _strings(data.get("confirmed_facts")) or _strings(state.get("confirmed_facts")),
        "protected_interests": _strings(data.get("protected_interests")) or _strings(state.get("protected_interests")),
        "problem_reason": reason,
        "blocker_type": profile.blocker_type,
        "decisive_condition": decisive_condition,
        "recommended_mode": profile.recommended_mode,
        "candidate_state_transitions": candidate_transitions,
        "candidate_actions": candidate_transitions,
        "selected_action_id": selected_id,
        "selected_action": title,
        "action_title": title,
        "action_description": description,
        "first_move": first_move,
        "deliverable": deliverable,
        "done_when": completion,
        "timebox": timebox,
        "expected_state_change": expected_state_change,
        "not_now": not_now,
        "main_risk": main_risk,
        "guardrail": guardrail,
        "recovery": recovery,
        "observe": observe,
        "review_when": review_when,
        "confidence_basis": confidence_basis,
        "user_decision_needed": user_decision_needed,
        "continuation_status": continuation_status,
        "continuation_basis": state.get("continuation_basis") or "本轮使用 ask 决策协议完成判断。",
        "situation_assessment": situation,
        "key_judgments": judgments,
        "execution_steps": steps,
        "risk_controls": risks,
        "why_now": why_now,
        "completion_criteria": completion,
        "pause_or_stop": not_now,
        "assumptions": _strings(data.get("assumptions")) or ["当前建议基于现有上下文，未执行外部调研。"],
        "need_research": need_research,
        "reconsider_when": reconsider_when,
        "main_contradiction": contradiction,
        "current_stage": _stage_label(data.get("current_stage")) or "执行最小验证",
        "confidence": _bounded(
            data.get("confidence"),
            state_confidence if isinstance(state_confidence, (int, float)) else 60,
        ),
    }
    return updates, display_text


def normalize_decide(
    state: CounselState,
    payload: dict[str, object] | None,
    response_text: str,
) -> tuple[dict[str, object], str]:
    data = payload or {}
    raw_options = data.get("options") if isinstance(data.get("options"), list) else state.get("options")
    options = default_decision_options(state.get("raw_request", ""), raw_options)
    unique_options: list[DecisionOption] = []
    for option in options:
        if option.id not in {item.id for item in unique_options}:
            unique_options.append(option)
    options = (unique_options or default_decision_options(state.get("raw_request", "")))[:4]
    if len(options) < 2:
        options = default_decision_options(state.get("raw_request", ""))
    recommended = data.get("recommended_option_id")
    if not isinstance(recommended, str) or recommended not in {item.id for item in options}:
        recommended = options[0].id
    recommended_option = next(option for option in options if option.id == recommended)
    recommendation = _text(data.get("recommendation_reason"))
    if not recommendation:
        recommendation = (
            f"优先选择“{recommended_option.title}”，因为它能以较低成本先验证当前最关键的假设；"
            "其他方案暂不优先，直到验证结果证明它们更值得投入。"
        )
    opposition = _strings(data.get("opposition_view")) or [
        f"反方会质疑“{recommended_option.title}”是否已经有足够证据，建议把验证结果作为下一次改判依据。"
    ]
    unknowns = _strings(data.get("unknowns")) or _strings(state.get("unresolved_unknowns"))
    if not unknowns and state.get("need_research"):
        unknowns = ["哪些外部事实会实质改变当前方案排序"]
    goal = infer_goal(state.get("raw_request", ""))
    objectives = _strings(data.get("objectives")) or _strings(state.get("objectives")) or (
        [goal] if goal else ["达成真正想要的结果，而不是直接执行题面手段。"]
    )
    constraints = _strings(data.get("constraints")) or _strings(state.get("constraints"))
    facts = _strings(data.get("facts")) or _strings(state.get("facts"))
    assumptions = _strings(data.get("assumptions")) or _strings(state.get("assumptions")) or [
        "各方案的真实效果仍需通过小范围结果验证。"
    ]
    main_contradiction = (
        _text(data.get("main_contradiction"))
        or state.get("main_contradiction")
        or contradiction_for("no_clear_blocker", "decide")
    )
    reported_now = was_reported_now(state)
    state_confidence = state.get("confidence")
    updates: dict[str, object] = {
        "decision_question": _text(data.get("decision_question"))
        or state.get("decision_question")
        or (f"如何达成{goal}？" if goal else state.get("normalized_question", "当前决定")),
        "objectives": objectives,
        "constraints": constraints,
        "facts": facts,
        "assumptions": assumptions,
        "unresolved_unknowns": unknowns,
        "options": [item.model_dump(mode="json") for item in options],
        "opposition_view": opposition,
        "recommended_option_id": recommended,
        "recommendation_reason": recommendation,
        "main_contradiction": main_contradiction,
        "confidence": _bounded(
            data.get("confidence"),
            state_confidence if isinstance(state_confidence, (int, float)) else 60,
        ),
        "reconsider_when": _strings(data.get("reconsider_when"))
        or state.get("reconsider_when")
        or ["关键约束变化", "新证据改变方案排序"],
        "need_research": False
        if reported_now
        else bool(state.get("need_research")) or bool(data.get("need_research")),
    }
    display_text = _safe_display(response_text, recommendation, payload)
    return updates, display_text
