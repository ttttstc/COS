import json
import os
from pathlib import Path

import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from lyl_agent.artifacts import CounselArtifact, DecisionCard, NextActionCard
from lyl_agent.graph import build_graph
from lyl_agent.memory import MemoryRepository
from lyl_agent.reasoning import (
    classify_problem,
    infer_scope,
    normalize_ask,
    normalize_decide,
)
from lyl_agent.settings import load_settings


def graph_for_skill(tmp_path: Path, response: str = "not structured JSON") -> object:
    return build_graph(
        FakeListChatModel(responses=[response]),
        MemoryRepository(tmp_path / "memory.sqlite3"),
        InMemorySaver(),
    )


async def run_to_final(graph: object, prompt: str, mode: str, thread_id: str) -> dict[str, object]:
    config = {"configurable": {"thread_id": thread_id}}
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=prompt)]},
        config,
        context={"mode": mode},
    )
    while "__interrupt__" in result:
        pending = result["__interrupt__"][0]
        result = await graph.ainvoke(
            Command(resume={pending.id: "report_now"}),
            config,
            context={"mode": mode},
        )
    return result


@pytest.mark.parametrize(
    ("prompt", "reason"),
    [
        ("目标不清楚，我不知道下一步", "goal_unclear"),
        ("目标不明确，需要先界定", "goal_unclear"),
        ("我清楚目标但不知道先做什么", "no_clear_blocker"),
    ],
)
def test_problem_classification_handles_goal_wording_boundaries(
    prompt: str,
    reason: str,
) -> None:
    assert classify_problem(prompt, "ask") == reason


def test_scope_treats_current_year_direction_as_local() -> None:
    assert infer_scope("今年方向先做一次用户访谈") == "local"


@pytest.mark.parametrize(
    "reason",
    [
        "goal_unclear",
        "information_insufficient",
        "too_many_options",
        "action_resistance",
        "no_clear_blocker",
    ],
)
def test_fallback_action_exists_for_each_problem_reason(reason: str) -> None:
    updates, display = normalize_ask(
        {"raw_request": "下一步做什么？", "problem_reason": reason},
        None,
        "not structured JSON",
    )
    assert updates["candidate_actions"]
    assert updates["selected_action_id"]
    assert updates["completion_criteria"]
    assert updates["situation_assessment"]
    assert updates["key_judgments"]
    assert updates["execution_steps"]
    assert updates["risk_controls"]
    assert display


def test_model_0_to_10_scores_are_normalized_to_the_five_point_rubric() -> None:
    updates, _ = normalize_ask(
        {"raw_request": "下一步做什么？"},
        {
            "candidate_actions": [
                {
                    "id": "test",
                    "title": "测试",
                    "description": "做一次测试",
                    "impact": 8,
                    "uncertainty_reduction": 6,
                }
            ]
        },
        "",
    )
    candidate = updates["candidate_actions"][0]
    assert candidate["impact"] == 4
    assert candidate["uncertainty_reduction"] == 3


def test_probability_confidence_is_normalized_to_card_percentage() -> None:
    updates, _ = normalize_ask(
        {"raw_request": "下一步做什么？"},
        {"confidence": 0.8},
        "",
    )
    assert updates["confidence"] == 80


def test_ask_normalizer_applies_protocol_fields_and_hard_gate() -> None:
    updates, display = normalize_ask(
        {
            "raw_request": "6天新生儿应该吃什么奶粉",
            "problem_reason": "no_clear_blocker",
        },
        {
            "action_title": "直接买某品牌",
            "action_description": "马上购买并开始使用",
            "first_move": "下单",
            "deliverable": "购买记录",
            "done_when": ["买到奶粉"],
            "expected_state_change": "开始喂养",
            "candidate_actions": [
                {
                    "id": "unsafe",
                    "title": "直接买某品牌",
                    "description": "马上购买并开始使用",
                    "impact": 5,
                    "reversibility": 5,
                }
            ],
        },
        "",
    )
    assert updates["recommended_mode"] == "escalate"
    assert updates["user_decision_needed"]
    assert updates["action_title"] == "先完成专业或责任边界确认"
    assert updates["first_move"]
    assert updates["deliverable"]
    assert updates["done_when"]
    assert "风险与护栏" in display


def test_partial_decide_payload_fallbacks_follow_selected_option() -> None:
    updates, display = normalize_decide(
        {"raw_request": "该选哪个方案？"},
        {
            "options": [
                {"id": "a", "title": "方案 A", "summary": "A"},
                {"id": "b", "title": "方案 B", "summary": "B"},
            ],
            "recommended_option_id": "b",
        },
        "",
    )
    assert "方案 B" in updates["recommendation_reason"]
    assert "方案 B" in updates["opposition_view"][0]
    assert display == updates["recommendation_reason"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("prompt", "scope", "reason"),
    [
        ("我已经准备好，今天先访谈一个用户", "local", "no_clear_blocker"),
        ("我一直拖延发布，下一步先做什么", "local", "action_resistance"),
        ("我不知道下一步该做什么，因为目标没想清", "local", "goal_unclear"),
        ("我现在有太多方案，不知道先做哪个", "local", "too_many_options"),
        ("市场数据还不够，我下一步应该先做什么", "local", "information_insufficient"),
        ("长期产品方向接下来该优先推进什么", "global", "no_clear_blocker"),
        ("我在产品方向和销售方向都想推进，下一步做什么", "global", "too_many_options"),
        ("把首页文案改一个词后看反馈，下一步是什么", "local", "no_clear_blocker"),
    ],
)
async def test_ask_skill_covers_eight_realistic_scenarios(
    tmp_path: Path,
    prompt: str,
    scope: str,
    reason: str,
) -> None:
    result = await run_to_final(
        graph_for_skill(tmp_path),
        prompt,
        "ask",
        f"ask-{abs(hash(prompt))}",
    )
    card = CounselArtifact.model_validate(result["artifact"]).tabs.counsel
    assert isinstance(card, NextActionCard)
    assert card.scope == scope
    assert result["problem_reason"] == reason
    assert card.action_title
    assert card.action_description
    assert card.situation_assessment
    assert card.key_judgments
    assert card.execution_steps
    assert card.risk_controls
    assert card.decisive_condition
    assert card.recommended_mode
    assert card.first_move
    assert card.deliverable
    assert card.done_when
    assert card.expected_state_change
    assert card.not_now
    assert card.main_risk
    assert card.guardrail
    assert card.recovery
    assert card.observe
    assert card.review_when
    assert card.completion_criteria
    assert card.pause_or_stop
    assert 0 <= card.confidence <= 100


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "prompt",
    [
        "我应该选择方案 A 还是方案 B？",
        "我想做一个功能，但真正目标是验证用户是否需要它",
        "多个方案都想做，应该怎么取舍？",
        "请决定是否进入市场，但现在缺少市场数据",
        "这是一个重大且长期不可逆的方向：方案 A 还是方案 B",
        "选哪个方案能在两周内验证需求？",
        "方案 A 或方案 B，约束是预算有限",
        "我该先访谈还是先开发？",
    ],
)
async def test_decide_skill_covers_eight_realistic_scenarios(
    tmp_path: Path,
    prompt: str,
) -> None:
    result = await run_to_final(
        graph_for_skill(tmp_path),
        prompt,
        "decide",
        f"decide-{abs(hash(prompt))}",
    )
    card = CounselArtifact.model_validate(result["artifact"]).tabs.counsel
    assert isinstance(card, DecisionCard)
    assert 2 <= len(card.options) <= 4
    assert card.recommended_option_id in {option.id for option in card.options}
    assert card.recommendation_reason
    assert card.opposition_view
    assert card.objectives
    assert card.assumptions
    assert card.reconsider_when


@pytest.mark.asyncio
async def test_decide_reframes_a_user_supplied_means_as_a_goal(tmp_path: Path) -> None:
    result = await run_to_final(
        graph_for_skill(tmp_path),
        "我想做一个功能，但真正目标是验证用户是否需要它",
        "decide",
        "decide-goal-reframe",
    )
    card = CounselArtifact.model_validate(result["artifact"]).tabs.counsel
    assert isinstance(card, DecisionCard)
    assert card.decision_question == "如何达成验证用户是否需要它？"
    assert card.objectives == ["验证用户是否需要它"]


@pytest.mark.live
@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("mode", "prompt"),
    [
        ("ask", "我已经准备好，今天先访谈一个用户"),
        ("ask", "我一直拖延发布，下一步先做什么"),
        ("ask", "我不知道下一步该做什么，因为目标没想清"),
        ("ask", "我现在有太多方案，不知道先做哪个"),
        ("ask", "市场数据还不够，我下一步应该先做什么"),
        ("ask", "长期产品方向接下来该优先推进什么"),
        ("ask", "我在产品方向和销售方向都想推进，下一步做什么"),
        ("ask", "把首页文案改一个词后看反馈，下一步是什么"),
        ("decide", "我应该选择方案 A 还是方案 B？"),
        ("decide", "我想做一个功能，但真正目标是验证用户是否需要它"),
        ("decide", "多个方案都想做，应该怎么取舍？"),
        ("decide", "请决定是否进入市场，但现在缺少市场数据"),
        ("decide", "这是一个重大且长期不可逆的方向：方案 A 还是方案 B"),
        ("decide", "选哪个方案能在两周内验证需求？"),
        ("decide", "方案 A 或方案 B，约束是预算有限"),
        ("decide", "我该先访谈还是先开发？"),
    ],
)
async def test_configured_model_covers_issue_8_and_9_scenarios(
    tmp_path: Path,
    mode: str,
    prompt: str,
) -> None:
    if os.getenv("LYL_LIVE_TEST") != "1":
        pytest.skip("Set LYL_LIVE_TEST=1 to run configured model scenarios")
    assert load_settings().model_provider != "stub"
    graph = build_graph(
        memory_repository=MemoryRepository(tmp_path / "live-memory.sqlite3"),
        checkpointer=InMemorySaver(),
    )
    result = await run_to_final(
        graph,
        prompt,
        mode,
        f"live-{mode}-{abs(hash(prompt))}",
    )
    artifact = CounselArtifact.model_validate(result["artifact"])
    assert artifact.status == "final"
    if mode == "ask":
        assert isinstance(artifact.tabs.counsel, NextActionCard)
        assert artifact.tabs.counsel.action_description
        assert artifact.tabs.counsel.key_judgments
        assert artifact.tabs.counsel.execution_steps
        assert artifact.tabs.counsel.risk_controls
        assert artifact.tabs.counsel.completion_criteria
    else:
        assert isinstance(artifact.tabs.counsel, DecisionCard)
        assert 2 <= len(artifact.tabs.counsel.options) <= 4
        assert artifact.tabs.counsel.recommended_option_id


@pytest.mark.live
@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("prompt", "blocker", "mode"),
    [
        ("项目目标明确，但任务太大无法启动，下一步做什么？", "path", "prepare"),
        ("产品和销售都想推进，我需要判断全局优先级", "decision", "decide"),
        ("缺少一个会改变方向的关键事实，下一步怎么办？", "information", "research"),
        ("信息已经够了，但我迟迟没有拍板", "decision", "decide"),
        ("时间和预算发生取舍，这次应该优先保护什么？", "value", "decide"),
        ("外部依赖和权限尚未具备，下一步做什么？", "condition", "clarify"),
        ("我已经知道该做什么，但一直拖延启动", "execution", "act"),
        ("工作做完了一部分，但没有验收标准", "verification", "verify"),
        ("当前最佳选择是暂停，不想继续扩大投入", "execution", "pause"),
        ("这个目标已经不值得继续，应该停止", "execution", "stop"),
        ("6天新生儿应该吃什么奶粉", "path", "escalate"),
        ("同一个项目我已经完成上一轮动作，反馈不支持原假设，重新判断下一步", "execution", "act"),
    ],
)
async def test_configured_model_covers_issue_32_decision_protocol(
    tmp_path: Path,
    prompt: str,
    blocker: str,
    mode: str,
) -> None:
    if os.getenv("LYL_LIVE_TEST") != "1":
        pytest.skip("Set LYL_LIVE_TEST=1 to run configured model scenarios")
    graph = build_graph(
        memory_repository=MemoryRepository(tmp_path / "issue32-live-memory.sqlite3"),
        checkpointer=InMemorySaver(),
    )
    result = await run_to_final(
        graph,
        prompt,
        "ask",
        f"issue32-live-{abs(hash(prompt))}",
    )
    card = CounselArtifact.model_validate(result["artifact"]).tabs.counsel
    assert isinstance(card, NextActionCard)
    assert card.blocker_type == blocker
    assert card.recommended_mode == mode
    assert card.decisive_condition
    assert card.action_title
    assert card.first_move
    assert card.deliverable
    assert card.done_when
    assert card.expected_state_change
    assert card.not_now
    assert card.main_risk
    assert card.guardrail
    assert card.recovery
    assert card.observe
    assert card.reconsider_when


@pytest.mark.asyncio
async def test_structured_model_output_populates_both_skill_cards(tmp_path: Path) -> None:
    ask_payload = {
        "scope": "global",
        "problem_reason": "action_resistance",
        "main_contradiction": "执行阻力",
        "candidate_actions": [
            {
                "id": "talk",
                "title": "访谈一位用户",
                "description": "今天完成一次用户访谈",
                "completion_criteria": ["完成一次访谈"],
                "impact": 100,
                "uncertainty_reduction": 80,
                "goal_contribution": 80,
                "executability": 80,
                "reversibility": 100,
                "opportunity_cost": 1,
            }
        ],
        "selected_action_id": "talk",
        "action_title": "访谈一位用户",
        "action_description": "今天完成一次用户访谈",
        "situation_assessment": "验证拖延的根因是缺少真实反馈",
        "key_judgments": ["先获得真实反馈，再扩大投入"],
        "execution_steps": ["联系用户", "完成访谈", "记录结论"],
        "risk_controls": ["控制在今天完成"],
        "why_now": "今天即可获得关键反馈",
        "completion_criteria": ["完成一次访谈"],
        "pause_or_stop": ["暂停扩张功能"],
        "assumptions": ["可以联系用户"],
        "confidence": 82,
        "reconsider_when": ["访谈不支持当前方向"],
    }
    result = await run_to_final(
        graph_for_skill(tmp_path, json.dumps(ask_payload, ensure_ascii=False)),
        "我一直拖延验证，下一步做什么？",
        "ask",
        "ask-structured",
    )
    ask_card = CounselArtifact.model_validate(result["artifact"]).tabs.counsel
    assert isinstance(ask_card, NextActionCard)
    assert ask_card.action_title == "访谈一位用户"
    assert ask_card.situation_assessment == "验证拖延的根因是缺少真实反馈"
    assert ask_card.execution_steps == ["联系用户", "完成访谈", "记录结论"]
    assert ask_card.completion_criteria == ["完成一次访谈"]
    assert ask_card.confidence == 82
    assert "明确建议：访谈一位用户" in result["messages"][-1].content
    assert "执行步骤：" in result["messages"][-1].content

    decide_payload = {
        "decision_question": "如何用最低成本验证用户需求？",
        "objectives": ["获得真实需求反馈"],
        "constraints": ["两周内完成"],
        "facts": ["已有一批候选用户"],
        "assumptions": ["候选用户愿意接受访谈"],
        "unknowns": ["用户是否愿意付费"],
        "main_contradiction": "验证速度与证据质量",
        "options": [
            {
                "id": "interview",
                "title": "先访谈",
                "summary": "快速理解需求",
                "benefits": ["成本低"],
                "costs": ["样本偏差"],
                "risks": ["口头意愿不代表购买"],
            },
            {
                "id": "prototype",
                "title": "先做原型",
                "summary": "用行为反馈验证",
                "benefits": ["反馈更接近真实行为"],
                "costs": ["投入更多时间"],
                "risks": ["可能过早构建"],
            },
        ],
        "recommended_option_id": "prototype",
        "recommendation_reason": "先访谈，因为可逆且直接减少关键未知。",
        "opposition_view": ["访谈结果可能高估真实付费意愿。"],
        "confidence": 78,
        "reconsider_when": ["访谈无法区分真实需求"],
    }
    result = await run_to_final(
        graph_for_skill(tmp_path, json.dumps(decide_payload, ensure_ascii=False)),
        "我该先访谈还是先做原型？",
        "decide",
        "decide-structured",
    )
    decide_card = CounselArtifact.model_validate(result["artifact"]).tabs.counsel
    assert isinstance(decide_card, DecisionCard)
    assert decide_card.decision_question == "如何用最低成本验证用户需求？"
    assert decide_card.recommended_option_id == "prototype"
    assert len(decide_card.options) == 2
    assert len(decide_card.opposition_view) >= 1
    assert result["messages"][-1].content == decide_card.recommendation_reason
