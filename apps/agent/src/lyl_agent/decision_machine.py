"""Deterministic decision protocol for the ask skill.

The model may enrich the language of a recommendation, but it does not get to
skip the protocol.  This module owns the stable, testable parts of ask-lyl:
blocker diagnosis, hard gates, mode selection, and continuation checks.
"""

from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Literal

BlockerType = Literal[
    "intent",
    "value",
    "information",
    "decision",
    "condition",
    "path",
    "execution",
    "verification",
]
RecommendedMode = Literal[
    "clarify",
    "research",
    "decide",
    "prepare",
    "act",
    "verify",
    "pause",
    "stop",
    "escalate",
]
ContinuationStatus = Literal["new", "continue", "complete", "reconsider"]


@dataclass(frozen=True)
class HardGate:
    mode: Literal["escalate", "clarify", "research", "decide"]
    reason: str
    user_decision_needed: dict[str, object] | None = None


@dataclass(frozen=True)
class DecisionProfile:
    blocker_type: BlockerType
    recommended_mode: RecommendedMode
    decisive_condition: str
    state_delta: str
    hard_gate: HardGate | None = None


_HIGH_RISK_WORDS = (
    "医疗",
    "医生",
    "用药",
    "药物",
    "新生儿",
    "婴儿",
    "孕期",
    "自杀",
    "伤害",
    "法律",
    "诉讼",
    "合同",
    "转账",
    "借贷",
    "投资",
    "全部积蓄",
    "删除生产",
    "永久删除",
    "不可逆",
)
_PERMISSION_WORDS = ("权限", "批准", "依赖", "等对方", "等审批", "无法访问", "没有资源")
_VALUE_WORDS = ("价值取舍", "时间还是", "钱还是", "关系还是", "更重要", "预算")
_INFORMATION_WORDS = ("数据", "证据", "信息不足", "不了解", "未知", "市场", "政策", "事实")
_DECISION_WORDS = ("选择", "选哪个", "决定", "拍板", "取舍", "a还是b", "方案", "优先级", "优先")
_PATH_WORDS = ("太大", "太复杂", "无从下手", "不知道怎么开始", "拆不开", "千头万绪")
_EXECUTION_WORDS = ("拖延", "害怕", "不敢", "卡住", "迟迟", "阻力", "启动不了", "懒得", "准备好", "直接")
_VERIFICATION_WORDS = ("完成", "做完", "验收", "结果", "反馈", "怎么判断", "标准")
_PAUSE_WORDS = ("暂停", "先不做", "等一等", "等待", "不值得继续")
_STOP_WORDS = ("停止", "放弃", "不值得", "不再继续", "终止")


def _has(text: str, words: tuple[str, ...]) -> bool:
    return any(word.lower() in text.lower() for word in words)


def hard_gate_for(question: str) -> HardGate | None:
    """Return a non-overridable gate before any candidate ranking."""

    normalized = question.strip()
    if _has(normalized, _HIGH_RISK_WORDS):
        return HardGate(
            mode="escalate",
            reason="该议题涉及医疗、法律、重大财务或不可逆损失，普通行动评分不能替代专业确认。",
            user_decision_needed={
                "type": "professional_confirmation",
                "question": "是否先获得合格专业人士或责任人的确认？",
                "required": True,
            },
        )
    if _has(normalized, _PERMISSION_WORDS):
        return HardGate(
            mode="clarify",
            reason="主行动依赖权限、资源或他人批准，当前不能假设条件已经具备。",
            user_decision_needed={
                "type": "condition_confirmation",
                "question": "关键权限或外部依赖是否已经确认？",
                "required": True,
            },
        )
    if _has(normalized, _VALUE_WORDS):
        return HardGate(
            mode="decide",
            reason="这是用户价值排序而非事实判断，参谋不能替用户隐藏取舍。",
            user_decision_needed={
                "type": "value_tradeoff",
                "question": "本次更优先保护哪一项价值？",
                "required": True,
            },
        )
    return None


def classify_blocker(question: str) -> BlockerType:
    """Classify the primary reason the user cannot take the next step."""

    normalized = question.strip()
    if not normalized or normalized in {"怎么办", "下一步", "下一步做什么", "怎么看", "帮我决定"}:
        return "intent"
    if _has(normalized, _PAUSE_WORDS) or _has(normalized, _STOP_WORDS):
        return "execution"
    if _has(normalized, ("重新判断", "反馈不支持", "新约束", "没效果", "失败")):
        return "execution"
    if _has(normalized, _VALUE_WORDS):
        return "value"
    if _has(normalized, _PERMISSION_WORDS):
        return "condition"
    if _has(normalized, _INFORMATION_WORDS):
        return "information"
    if _has(normalized, _VERIFICATION_WORDS) and _has(normalized, ("标准", "验收", "判断")):
        return "verification"
    if _has(normalized, _DECISION_WORDS):
        return "decision"
    if _has(normalized, _PATH_WORDS):
        return "path"
    if _has(normalized, ("不知道", "不清楚目标", "目标不明确", "没想清")):
        return "intent"
    if _has(normalized, _EXECUTION_WORDS):
        return "execution"
    if _has(normalized, _PATH_WORDS) or len(normalized) > 80:
        return "path"
    if normalized.count("方案") >= 2:
        return "decision"
    return "path"


def _default_mode(blocker: BlockerType, question: str) -> RecommendedMode:
    if _has(question, _STOP_WORDS):
        return "stop"
    if _has(question, _PAUSE_WORDS):
        return "pause"
    return {
        "intent": "clarify",
        "value": "decide",
        "information": "research",
        "decision": "decide",
        "condition": "prepare",
        "path": "prepare",
        "execution": "act",
        "verification": "verify",
    }[blocker]


def profile_for(question: str, blocker: BlockerType | None = None) -> DecisionProfile:
    normalized = question.strip()
    blocker_type = blocker or classify_blocker(normalized)
    gate = hard_gate_for(normalized)
    mode: RecommendedMode = gate.mode if gate else _default_mode(blocker_type, normalized)  # type: ignore[assignment]
    decisive = {
        "intent": "用一句话确认要改变的结果，避免把手段误当成目标。",
        "value": "用户明确本次要保护的首要价值与可接受代价。",
        "information": "只补齐一个会实质改变方向的承重事实。",
        "decision": "明确唯一筛选标准并完成一次可解释的取舍。",
        "condition": "关键权限、资源或外部依赖得到确认。",
        "path": "把目标裁剪成今天能开始、能产出、能验收的一步。",
        "execution": "完成一个不超过当前能力边界的可观察开工动作。",
        "verification": "形成可检查的产物，并能据此判断继续、调整或停止。",
    }[blocker_type]
    delta = {
        "intent": "从目标模糊转为可验证的目标陈述",
        "value": "从价值冲突转为用户确认的优先顺序",
        "information": "从关键未知转为承重事实",
        "decision": "从并列路径转为一个可解释的选择",
        "condition": "从受阻状态转为具备行动条件",
        "path": "从过大路径转为最小可验证动作",
        "execution": "从知道该做什么转为真正开始",
        "verification": "从已执行转为可判断结果",
    }[blocker_type]
    return DecisionProfile(
        blocker_type=blocker_type,
        recommended_mode=mode,
        decisive_condition=gate.reason if gate else decisive,
        state_delta=delta,
        hard_gate=gate,
    )


def continuation_for(
    question: str,
    snapshot: dict[str, object] | None,
) -> tuple[ContinuationStatus, str]:
    """Decide whether a repeated ask should continue, complete, or reconsider."""

    if not isinstance(snapshot, dict):
        return "new", "没有可复用的上一轮正式建议。"
    subject = snapshot.get("subject")
    if not isinstance(subject, str) or not subject.strip():
        return "new", "上一轮没有保存可比对的议题主题。"
    similarity = SequenceMatcher(
        None,
        "".join(subject.lower().split()),
        "".join(question.lower().split()),
    ).ratio()
    if similarity < 0.45 and subject not in question and question not in subject:
        return "new", "本轮议题与上一轮主题差异较大。"
    normalized = question.lower()
    if _has(normalized, ("已完成", "做完了", "完成了", "结果是", "反馈是")):
        return "complete", "用户报告原行动已有结果，应先核对结果再决定后续。"
    if _has(normalized, ("失败", "不行", "没效果", "改变了", "新约束", "重新判断")):
        return "reconsider", "用户报告了结果、失败或新约束，需要基于变化改判。"
    return "continue", "议题主题延续，上一轮主行动仍应作为当前判断基线。"


def rank_action_keys(candidate: dict[str, object]) -> tuple[int, int, int, int, int, int]:
    """Lexicographic ranking for debug fallback; never a weighted sum."""

    def score(name: str, default: int = 3) -> int:
        value = candidate.get(name)
        return value if isinstance(value, int) and not isinstance(value, bool) else default

    # Preserve user intent and reversibility before speed or raw impact.
    return (
        score("goal_contribution"),
        score("reversibility"),
        score("uncertainty_reduction"),
        score("executability"),
        score("impact"),
        -score("opportunity_cost", 2),
    )


def commitment_complete(
    *,
    first_move: str | None,
    deliverable: str | None,
    done_when: list[str],
    expected_state_change: str | None,
) -> bool:
    """Check the three commitment-test questions for a proposed action."""

    return bool(first_move and deliverable and done_when and expected_state_change)
