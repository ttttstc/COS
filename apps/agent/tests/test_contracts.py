from lyl_agent.contracts import CounselSession, HandoffContract, core_mode_for_legacy


def test_core_contract_preserves_legacy_modes_without_route_rewrite() -> None:
    assert core_mode_for_legacy("ask") == "next_action"
    assert core_mode_for_legacy("research") == "deep_research"
    assert core_mode_for_legacy("diagnose") == "historical_reflection"
    assert core_mode_for_legacy("unknown") == "discuss"


def test_counsel_session_and_handoff_are_strict_structured_envelopes() -> None:
    session = CounselSession(
        issue_id="thread-1",
        subject="当前议题",
        user_intent="我需要先做什么",
        active_mode="next_action",
        facts=[{"content": "已确认事实"}],
    )
    handoff = HandoffContract(
        from_mode="next_action",
        to_mode="deep_research",
        reason="关键未知会改变主行动",
        user_goal="确认是否值得继续投入",
        expected_output="一份可引用的判断依据",
        estimated_depth="quick",
        preserved_context={"unknowns": ["市场规模"]},
        needs_user_confirmation=True,
        return_to="next_action",
    )

    assert session.model_dump(mode="json")["active_mode"] == "next_action"
    assert handoff.model_dump(mode="json")["return_to"] == "next_action"
