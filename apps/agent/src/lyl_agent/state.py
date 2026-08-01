"""State and Run Context for the single LYL counsel graph."""

from typing import Annotated, Literal, Protocol, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

CounselMode = Literal["ask", "decide", "research", "diagnose", "discuss"]
CounselScope = Literal["local", "global"]
CounselStageStatus = Literal[
    "pending", "running", "completed", "blocked", "skipped"
]


class CounselStage(TypedDict, total=False):
    """Observable progress emitted in the graph state."""

    id: str
    title: str
    status: CounselStageStatus
    summary: str


class CounselContext(TypedDict, total=False):
    """Run Context supplied by the client without becoming persisted input."""

    mode: CounselMode
    scope: CounselScope
    user_id: str
    thread_id: str
    selected_memory_ids: list[str]
    file_ids: list[str]
    value_tradeoffs: list[str]
    options_from_user: list[str]
    objectives: list[str]
    constraints: list[str]


class CounselState(TypedDict, total=False):
    """MVP state shared by all nodes in the single counsel graph.

    Issue #5 writes the retrieval fields (``user_id``, ``thread_id``,
    ``selected_memory_ids``, and ``context_snapshot``); Issues #8 and #9 write
    the ask/decide reasoning fields below. Other mode-specific fields remain
    placeholders for their later Skills.
    """

    messages: Annotated[list[AnyMessage], add_messages]
    user_id: str
    thread_id: str
    mode: CounselMode
    scope: CounselScope | None
    raw_request: str
    normalized_question: str
    objectives: list[str]
    constraints: list[str]
    value_tradeoffs: list[str]
    problem_reason: str
    candidate_actions: list[dict[str, object]]
    selected_action_id: str
    action_title: str
    action_description: str
    completion_criteria: list[str]
    pause_or_stop: list[str]
    facts: list[str]
    assumptions: list[str]
    decision_question: str
    recommended_option_id: str
    recommendation_reason: str
    selected_memory_ids: list[str]
    context_snapshot: dict[str, object]
    historical_patterns: list[dict[str, object]]
    needs_clarification: bool
    need_research: bool
    research_plan: dict[str, object] | None
    evidence: list[dict[str, object]]
    unresolved_unknowns: list[str]
    main_contradiction: str | None
    options: list[dict[str, object]]
    opposition_view: list[str]
    confidence: int | None
    reconsider_when: list[str]
    current_stage: str | None
    stages: list[CounselStage]
    recommendation: dict[str, object] | None
    ui: list[dict[str, object]]
    artifact: dict[str, object] | None
    artifact_versions: list[dict[str, object]]
    interrupt_count: int
    interrupt_decisions: list[dict[str, object]]
    memory_proposals: list[dict[str, object]]
    decision_record_id: str | None
    feedback: dict[str, object] | None
    error: str | None


class CounselSkill(Protocol):
    """Reserved interface for later mode-specific behavior, not an Agent role."""

    async def invoke(self, state: CounselState) -> CounselState: ...
