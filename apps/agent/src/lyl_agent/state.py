"""State shared by the minimal LangGraph."""

from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Minimal message-only state required by Agent Chat UI."""

    messages: Annotated[list[AnyMessage], add_messages]
