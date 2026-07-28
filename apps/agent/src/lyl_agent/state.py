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
    selected_memory_ids: list[str]
    file_ids: list[str]


class CounselState(TypedDict, total=False):
    """MVP state shared by all nodes in the single counsel graph."""

    messages: Annotated[list[AnyMessage], add_messages]
    mode: CounselMode
    scope: CounselScope
    raw_request: str
    normalized_question: str
    context_snapshot: dict[str, object]
    needs_clarification: bool
    need_research: bool
    current_stage: str
    stages: list[CounselStage]
    recommendation: dict[str, object]
    error: str


class CounselSkill(Protocol):
    """Reserved interface for later mode-specific behavior, not an Agent role."""

    async def invoke(self, state: CounselState) -> CounselState: ...
