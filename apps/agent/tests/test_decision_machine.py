import pytest

from lyl_agent.decision_machine import (
    classify_blocker,
    commitment_complete,
    continuation_for,
    hard_gate_for,
    profile_for,
    rank_action_keys,
)
from lyl_agent.reasoning import normalize_ask


@pytest.mark.parametrize(
    ("question", "blocker", "mode"),
    [
        ("目标太大，不知道怎么开始", "path", "prepare"),
        ("产品和销售都想推进，哪个优先？", "decision", "decide"),
        ("缺少市场数据，下一步怎么做？", "information", "research"),
        ("方案已经清楚，但我迟迟没拍板", "decision", "decide"),
        ("时间还是预算更重要？", "value", "decide"),
        ("还在等对方权限，下一步做什么？", "condition", "clarify"),
        ("我一直拖延发布", "execution", "act"),
        ("已经做完了，但不知道怎么验收", "verification", "verify"),
        ("这个项目先暂停", "execution", "pause"),
        ("这个方向不值得继续，应该停止", "execution", "stop"),
        ("下一步做什么", "intent", "clarify"),
        ("我不知道该先做什么", "intent", "clarify"),
    ],
)
def test_protocol_covers_issue_32_blockers_and_modes(
    question: str,
    blocker: str,
    mode: str,
) -> None:
    assert classify_blocker(question) == blocker
    profile = profile_for(question)
    assert profile.blocker_type == blocker
    assert profile.recommended_mode == mode
    assert profile.decisive_condition
    assert profile.state_delta


@pytest.mark.parametrize(
    "question",
    [
        "6天新生儿应该吃什么奶粉",
        "要不要签一个不可逆的长期合同",
        "我是否应该把全部积蓄投入这个项目",
        "如何处理法律诉讼",
    ],
)
def test_hard_gate_cannot_be_overridden_by_action_score(question: str) -> None:
    gate = hard_gate_for(question)
    assert gate is not None
    assert gate.mode == "escalate"
    assert gate.user_decision_needed
    assert profile_for(question).recommended_mode == "escalate"


def test_rank_is_lexicographic_not_a_weighted_sum() -> None:
    safe = {
        "goal_contribution": 4,
        "reversibility": 5,
        "uncertainty_reduction": 4,
        "executability": 4,
        "impact": 3,
        "opportunity_cost": 1,
    }
    risky_high_impact = {**safe, "impact": 5, "reversibility": 1}
    assert rank_action_keys(safe) > rank_action_keys(risky_high_impact)


def test_recommendation_keeps_at_most_three_candidates() -> None:
    candidates = [
        {
            "id": f"candidate-{index}",
            "title": f"候选 {index}",
            "description": "做一次可逆验证",
            "goal_contribution": 5 - index,
        }
        for index in range(5)
    ]
    updates, _ = normalize_ask(
        {"raw_request": "下一步做什么？"},
        {"candidate_actions": candidates},
        "",
    )
    assert len(updates["candidate_actions"]) == 3


def test_model_selected_id_cannot_bypass_deterministic_candidate_ranking() -> None:
    candidates = [
        {
            "id": "safe",
            "title": "先做可逆验证",
            "description": "用小范围动作验证关键假设。",
            "goal_contribution": 5,
            "reversibility": 5,
            "uncertainty_reduction": 4,
            "executability": 4,
            "impact": 4,
            "opportunity_cost": 1,
        },
        {
            "id": "risky",
            "title": "直接扩大投入",
            "description": "立即扩大范围并承担更高成本。",
            "goal_contribution": 4,
            "reversibility": 1,
            "uncertainty_reduction": 5,
            "executability": 5,
            "impact": 5,
            "opportunity_cost": 4,
        },
    ]
    updates, _ = normalize_ask(
        {"raw_request": "有两个方向，下一步怎么做？"},
        {
            "candidate_actions": candidates,
            "selected_action_id": "risky",
            "action_title": "直接扩大投入",
            "action_description": "立即扩大范围并承担更高成本。",
        },
        "",
    )
    assert updates["selected_action_id"] == "safe"
    assert updates["action_title"] == "先做可逆验证"


def test_continuation_reuses_previous_decision_until_new_evidence() -> None:
    snapshot = {
        "subject": "今天先访谈一个用户，下一步做什么",
        "current_action": "先写出三个开放式问题",
        "action_title": "准备访谈提纲",
    }
    status, basis = continuation_for("今天先访谈一个用户，下一步做什么", snapshot)
    assert status == "continue"
    assert basis
    status, _ = continuation_for("今天先访谈一个用户，已经完成了", snapshot)
    assert status == "complete"
    status, _ = continuation_for("今天先访谈一个用户，但访谈失败了", snapshot)
    assert status == "reconsider"
    status, _ = continuation_for("做完了", snapshot)
    assert status == "complete"
    status, _ = continuation_for("反馈是没有效果", snapshot)
    assert status == "reconsider"


def test_commitment_test_requires_start_output_done_and_state_change() -> None:
    assert commitment_complete(
        first_move="现在写第一行",
        deliverable="一页提纲",
        done_when=["完成三问"],
        expected_state_change="从模糊到可验证",
    )
    assert not commitment_complete(
        first_move="现在写第一行",
        deliverable="",
        done_when=["完成三问"],
        expected_state_change="从模糊到可验证",
    )
