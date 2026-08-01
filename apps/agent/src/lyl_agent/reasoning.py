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
    return max(0, min(100, round(value)))


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


def _candidate_score(candidate: ActionCandidate) -> float:
    return round(
        0.30 * candidate.impact
        + 0.25 * candidate.uncertainty_reduction
        + 0.20 * candidate.goal_contribution
        + 0.10 * candidate.executability
        + 0.10 * candidate.reversibility
        - 0.05 * candidate.opportunity_cost,
        2,
    )


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
    reason = data.get("problem_reason")
    if reason not in VALID_PROBLEM_REASONS:
        reason = state.get("problem_reason") or classify_problem(
            state.get("raw_request", ""), "ask"
        )
    fallback = _fallback_action(reason)
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
    if not candidates:
        candidates = [fallback]
    candidates = candidates[:4]
    selected_id = data.get("selected_action_id")
    if not isinstance(selected_id, str) or selected_id not in {item.id for item in candidates}:
        selected_id = max(candidates, key=_candidate_score).id
    selected = next(item for item in candidates if item.id == selected_id)
    completion = _strings(data.get("completion_criteria")) or selected.completion_criteria or fallback.completion_criteria
    description = _text(data.get("action_description")) or selected.description
    title = _text(data.get("action_title")) or selected.title
    display_text = description if payload else _safe_display(response_text, description, payload)
    reported_now = was_reported_now(state)
    state_confidence = state.get("confidence")
    updates: dict[str, object] = {
        "scope": infer_scope(state.get("raw_request", ""), data.get("scope") or state.get("scope")),
        "problem_reason": reason,
        "candidate_actions": [
            {**item.model_dump(mode="json"), "score": _candidate_score(item)}
            for item in candidates
        ],
        "selected_action_id": selected_id,
        "action_title": title,
        "action_description": description,
        "completion_criteria": completion,
        "pause_or_stop": _strings(data.get("pause_or_stop")) or ["暂停同时推进多个方向，直到主行动完成。"],
        "assumptions": _strings(data.get("assumptions")) or ["当前建议基于现有上下文，未执行外部调研。"],
        "need_research": False
        if reported_now
        else bool(state.get("need_research"))
        or bool(data.get("need_research"))
        or reason == "information_insufficient",
        "reconsider_when": _strings(data.get("reconsider_when"))
        or state.get("reconsider_when")
        or ["完成最小测试后结果不支持当前方向"],
        "main_contradiction": _text(data.get("main_contradiction"))
        or state.get("main_contradiction")
        or contradiction_for(reason, "ask"),
        "current_stage": _text(data.get("current_stage")) or "执行最小验证",
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
