"""Typed counsel artifacts and version transitions."""

from copy import deepcopy
import json
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from lyl_agent.state import CounselMode, CounselState

ArtifactType = Literal["next_action", "decision", "research", "diagnosis"]
ArtifactStatus = Literal["draft", "final", "superseded"]


class NextActionCard(BaseModel):
    scope: Literal["local", "global"] = "local"
    current_stage: str
    main_contradiction: str
    action_title: str
    action_description: str
    completion_criteria: list[str]
    why_now: str
    pause_or_stop: list[str]
    assumptions: list[str]
    confidence: int = Field(ge=0, le=100)
    need_research: bool
    reconsider_when: list[str]


class DecisionOption(BaseModel):
    id: str
    title: str
    summary: str
    benefits: list[str] = Field(default_factory=list)
    costs: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class DecisionCard(BaseModel):
    decision_question: str
    objectives: list[str]
    constraints: list[str]
    main_contradiction: str
    facts: list[str]
    assumptions: list[str]
    unknowns: list[str]
    options: list[DecisionOption]
    recommended_option_id: str
    recommendation_reason: str
    opposition_view: list[str]
    confidence: int = Field(ge=0, le=100)
    reconsider_when: list[str]


class ResearchCard(BaseModel):
    current_stage: str
    main_contradiction: str
    recommendation: str
    key_unknowns: list[str]
    proposed_angles: list[str]
    stop_conditions: list[str]
    confidence: int = Field(ge=0, le=100)
    reconsider_when: list[str]


class DiagnosisCard(BaseModel):
    main_contradiction: str
    strengths: list[dict[str, object]] = Field(default_factory=list)
    risk_patterns: list[dict[str, object]] = Field(default_factory=list)
    priority_improvement_id: str
    suggested_rule: str
    next_practice: str
    limitations: list[str]
    confidence: int = Field(ge=0, le=100)
    reconsider_when: list[str]


CounselCard = Annotated[
    NextActionCard | DecisionCard | ResearchCard | DiagnosisCard,
    Field(union_mode="left_to_right"),
]


class ArtifactTabs(BaseModel):
    counsel: CounselCard
    evidence: list[dict[str, object]] = Field(default_factory=list)
    history: list[dict[str, object]] = Field(default_factory=list)
    process: dict[str, object] | None = None


class CounselArtifact(BaseModel):
    artifact_type: ArtifactType
    title: str
    version: int = Field(ge=1)
    status: ArtifactStatus
    change_reason: str | None = None
    tabs: ArtifactTabs


ARTIFACT_TYPE_BY_MODE: dict[CounselMode, ArtifactType] = {
    "ask": "next_action",
    "decide": "decision",
    "research": "research",
    "diagnose": "diagnosis",
    "discuss": "next_action",
}
DEFAULT_RECONSIDER_WHEN = [
    "目标或关键约束发生变化",
    "出现与当前判断相冲突的新证据",
]


def _next_version(state: CounselState) -> int:
    # Every finalized run receives the next monotonic version; superseding the
    # previous final keeps history intact instead of rewriting its version.
    versions = state.get("artifact_versions", [])
    return max(
        (
            int(item.get("version", 0))
            for item in versions
            if isinstance(item, dict)
        ),
        default=0,
    ) + 1


def _artifact_evidence(records: object) -> list[dict[str, object]]:
    """Keep only renderable evidence and normalize its display dimensions."""

    if not isinstance(records, list):
        return []
    normalized: list[dict[str, object]] = []
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            continue
        title = record.get("title") or record.get("claim") or record.get("name")
        summary = record.get("summary") or record.get("description") or record.get("content")
        if not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(summary, str) or not summary.strip():
            continue
        item = dict(record)
        item["id"] = str(record.get("id") or f"evidence-{index}")
        item["title"] = title.strip()
        item["summary"] = summary.strip()
        item["relation"] = (
            record.get("relation")
            if record.get("relation") in {"support", "oppose", "limit", "context"}
            else "context"
        )
        item["relevance"] = (
            record.get("relevance")
            if record.get("relevance") in {"high", "medium", "low"}
            else "medium"
        )
        item["freshness"] = (
            record.get("freshness")
            if record.get("freshness") in {"high", "medium", "low"}
            else "medium"
        )
        source_name = record.get("source_name") or record.get("source")
        item["source_name"] = (
            source_name.strip() if isinstance(source_name, str) and source_name.strip() else "来源待补充"
        )
        normalized.append(item)
    return normalized


def _decision_options(
    state: CounselState,
    recommendation: str,
) -> tuple[list[DecisionOption], str]:
    options: list[DecisionOption] = []
    raw_options = state.get("options", [])
    if isinstance(raw_options, list):
        for item in raw_options:
            if not isinstance(item, dict):
                continue
            try:
                options.append(DecisionOption.model_validate(item))
            except Exception:
                continue
    if not options:
        options = [
            DecisionOption(
                id="small-test",
                title="先做最小可逆验证",
                summary="用低成本行动验证当前建议的关键假设。",
            ),
            DecisionOption(
                id="collect-evidence",
                title="先补充关键证据",
                summary="先补齐会改变方案排序的关键信息，再重新比较。",
            ),
        ]
    if len(options) == 1:
        alternative_id = "collect-evidence" if options[0].id != "collect-evidence" else "small-test"
        options.append(
            DecisionOption(
                id=alternative_id,
                title=(
                    "先补充关键证据"
                    if alternative_id == "collect-evidence"
                    else "先做最小可逆验证"
                ),
                summary=(
                    "先补齐会改变方案排序的关键信息，再重新比较。"
                    if alternative_id == "collect-evidence"
                    else "用低成本行动验证当前建议的关键假设。"
                ),
            )
        )
    options = options[:4]
    recommended = state.get("recommended_option_id")
    if not isinstance(recommended, str) or recommended not in {
        option.id for option in options
    }:
        recommended = options[0].id
    return options, recommended


def _research_fields(state: CounselState) -> tuple[list[str], list[str], list[str]]:
    plan = state.get("research_plan") or {}

    def strings(key: str) -> list[str]:
        value = plan.get(key)
        return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []

    return strings("key_unknowns"), strings("proposed_angles"), strings("stop_conditions")


def _history_records(snapshot: object) -> list[dict[str, object]]:
    if not isinstance(snapshot, dict):
        return []
    labels = {
        "goals": "长期目标",
        "matters": "持续事项",
        "decisions": "历史决策",
        "patterns": "历史模式",
        "constraints": "长期约束",
    }
    records: list[dict[str, object]] = []
    for group, label in labels.items():
        items = snapshot.get(group)
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("content"), dict):
                continue
            content = item["content"]
            summary = content.get("summary")
            records.append(
                {
                    "id": str(item.get("id", f"{group}-{len(records)}")),
                    "title": str(content.get("title") or content.get("name") or label),
                    "summary": (
                        summary
                        if isinstance(summary, str)
                        else json.dumps(content, ensure_ascii=False, separators=(",", ":"))
                    ),
                    "source_name": "长期记忆",
                    "captured_at": item.get("updated_at"),
                    "confidence": round(float(item.get("confidence", 0)) * 100),
                }
            )
    return records


def _draft_card(state: CounselState) -> CounselCard:
    mode = state.get("mode", "discuss")
    question = state.get("normalized_question") or state.get("raw_request", "当前议题")
    contradiction = state.get("main_contradiction") or "正在识别当前议题的主要矛盾。"
    confidence_value = state.get("confidence")
    confidence = confidence_value if isinstance(confidence_value, (int, float)) else 60
    reconsider_when = state.get("reconsider_when") or DEFAULT_RECONSIDER_WHEN
    if mode == "decide":
        options, recommended_option_id = _decision_options(
            state,
            state.get("recommendation_reason") or "正在形成建议。",
        )
        return DecisionCard(
            decision_question=state.get("decision_question") or question,
            objectives=state.get("objectives", []),
            constraints=state.get("constraints", []),
            main_contradiction=contradiction,
            facts=state.get("facts", []),
            assumptions=state.get("assumptions", []),
            unknowns=state.get("unresolved_unknowns", []),
            options=options,
            recommended_option_id=recommended_option_id,
            recommendation_reason=state.get("recommendation_reason") or "正在形成建议。",
            opposition_view=state.get("opposition_view", []),
            confidence=confidence,
            reconsider_when=reconsider_when,
        )
    if mode == "research":
        unknowns, angles, stops = _research_fields(state)
        return ResearchCard(
            current_stage="形成调研判断",
            main_contradiction=contradiction,
            recommendation="正在形成建议。",
            key_unknowns=unknowns,
            proposed_angles=angles,
            stop_conditions=stops,
            confidence=confidence,
            reconsider_when=reconsider_when,
        )
    if mode == "diagnose":
        return DiagnosisCard(
            main_contradiction=contradiction,
            priority_improvement_id="pending",
            suggested_rule="正在形成建议。",
            next_practice="正在形成建议。",
            limitations=["历史证据仍待后续诊断 Skill 完善。"],
            confidence=confidence,
            reconsider_when=reconsider_when,
        )
    return NextActionCard(
        scope=state.get("scope") if state.get("scope") in {"local", "global"} else "local",
        current_stage="形成建议",
        main_contradiction=contradiction,
        action_title=state.get("action_title") or "先完成一个最小可逆动作",
        action_description=state.get("action_description") or "参谋正在整理当前议题。",
        completion_criteria=state.get("completion_criteria") or ["完成一次最小动作并记录结果"],
        why_now="先用低成本行动获得真实反馈。",
        pause_or_stop=state.get("pause_or_stop") or ["暂停同时推进多个方向。"],
        assumptions=state.get("assumptions") or ["当前建议基于现有上下文，未执行外部调研。"],
        confidence=confidence,
        need_research=state.get("need_research", False),
        reconsider_when=reconsider_when,
    )


def build_draft_artifact(state: CounselState) -> CounselArtifact:
    mode = state.get("mode", "discuss")
    question = state.get("normalized_question") or state.get("raw_request") or "当前议题"
    snapshot = state.get("context_snapshot")
    return CounselArtifact(
        artifact_type=ARTIFACT_TYPE_BY_MODE[mode],
        title=question[:80],
        version=_next_version(state),
        status="draft",
        change_reason=(
            "基于新一轮议题输入重新评估"
            if state.get("artifact_versions")
            else None
        ),
        tabs=ArtifactTabs(
            counsel=_draft_card(state),
            evidence=_artifact_evidence(state.get("evidence", [])),
            history=_history_records(snapshot),
            process=state.get("research_plan"),
        ),
    )


def finalize_artifact(
    state: CounselState,
    recommendation: str,
) -> tuple[CounselArtifact, list[dict[str, object]]]:
    raw = state.get("artifact")
    draft = (CounselArtifact.model_validate(raw) if raw else build_draft_artifact(state)).model_copy(
        deep=True
    )
    card = draft.tabs.counsel
    if isinstance(card, NextActionCard):
        if state.get("scope") in {"local", "global"}:
            card.scope = state["scope"]
        card.current_stage = state.get("current_stage") or card.current_stage
        card.main_contradiction = state.get("main_contradiction") or card.main_contradiction
        card.completion_criteria = state.get("completion_criteria") or card.completion_criteria
        card.pause_or_stop = state.get("pause_or_stop") or card.pause_or_stop
        card.assumptions = state.get("assumptions") or card.assumptions
        if state.get("confidence") is not None:
            card.confidence = state["confidence"]
        card.need_research = state.get("need_research", card.need_research)
        card.reconsider_when = state.get("reconsider_when") or card.reconsider_when
        card.action_title = state.get("action_title") or recommendation
        card.action_description = recommendation
        card.why_now = "这是当前信息下最值得优先推进的方向。"
    elif isinstance(card, DecisionCard):
        card.decision_question = state.get("decision_question") or card.decision_question
        card.objectives = state.get("objectives") or card.objectives
        card.constraints = state.get("constraints") or card.constraints
        card.main_contradiction = state.get("main_contradiction") or card.main_contradiction
        card.facts = state.get("facts") or card.facts
        card.assumptions = state.get("assumptions") or card.assumptions
        card.unknowns = state.get("unresolved_unknowns") or card.unknowns
        card.options, card.recommended_option_id = _decision_options(state, recommendation)
        card.recommendation_reason = recommendation
        card.opposition_view = state.get("opposition_view") or card.opposition_view
        if state.get("confidence") is not None:
            card.confidence = state["confidence"]
        card.reconsider_when = state.get("reconsider_when") or card.reconsider_when
    elif isinstance(card, ResearchCard):
        card.recommendation = recommendation
    else:
        card.priority_improvement_id = "current-priority"
        card.suggested_rule = recommendation
        card.next_practice = recommendation

    final = draft.model_copy(update={"status": "final"}, deep=True)
    versions: list[dict[str, object]] = []
    for item in state.get("artifact_versions", []):
        if not isinstance(item, dict):
            continue
        previous = deepcopy(item)
        if previous.get("status") == "final":
            previous["status"] = "superseded"
        versions.append(previous)
    versions.append(final.model_dump(mode="json"))
    return final, versions


def artifact_summary(artifact: CounselArtifact) -> str:
    card = artifact.tabs.counsel
    if isinstance(card, NextActionCard):
        return card.action_description
    if isinstance(card, DecisionCard):
        return card.recommendation_reason
    if isinstance(card, ResearchCard):
        return card.recommendation
    return card.suggested_rule
