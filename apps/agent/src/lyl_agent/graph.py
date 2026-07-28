"""Minimal START -> chat -> END graph for Issue #2."""

import logging

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from lyl_agent.models import create_chat_model
from lyl_agent.settings import load_settings
from lyl_agent.state import AgentState

logger = logging.getLogger(__name__)


def build_graph(model: BaseChatModel | None = None) -> CompiledStateGraph:
    """Build the minimal graph, optionally injecting a fake model for tests."""

    async def chat(state: AgentState) -> AgentState:
        active_model = model or create_chat_model(load_settings())
        logger.info(
            "agent.chat.started",
            extra={"event": "agent.chat.started", "message_count": len(state["messages"])},
        )
        response = await active_model.ainvoke(state["messages"])
        logger.info(
            "agent.chat.completed",
            extra={"event": "agent.chat.completed"},
        )
        return {"messages": [response]}

    builder = StateGraph(AgentState)
    builder.add_node("chat", chat)
    builder.add_edge(START, "chat")
    builder.add_edge("chat", END)
    return builder.compile()


graph = build_graph()
