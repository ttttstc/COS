from pathlib import Path

import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage, HumanMessage

from lyl_agent.graph import build_graph
from lyl_agent.settings import ModelConfigurationError, Settings, load_settings


def test_graph_compiles_with_expected_nodes() -> None:
    compiled = build_graph(FakeListChatModel(responses=["ready"]))

    assert set(compiled.get_graph().nodes) == {"__start__", "chat", "__end__"}


@pytest.mark.asyncio
async def test_fake_model_produces_response_without_api_key() -> None:
    compiled = build_graph(FakeListChatModel(responses=["baseline response"]))

    result = await compiled.ainvoke({"messages": [HumanMessage(content="hello")]})

    assert isinstance(result["messages"][-1], AIMessage)
    assert result["messages"][-1].content == "baseline response"


@pytest.mark.asyncio
async def test_messages_are_appended() -> None:
    compiled = build_graph(FakeListChatModel(responses=["first", "second"]))
    first = await compiled.ainvoke({"messages": [HumanMessage(content="one")]})
    second = await compiled.ainvoke(
        {"messages": [*first["messages"], HumanMessage(content="two")]}
    )

    assert [message.content for message in second["messages"]] == [
        "one",
        "first",
        "two",
        "second",
    ]


def test_missing_required_configuration_has_readable_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("LYL_MODEL_PROVIDER", raising=False)
    monkeypatch.delenv("LYL_MODEL", raising=False)
    monkeypatch.chdir(Path(__file__).parent)

    with pytest.raises(ModelConfigurationError, match="LYL_MODEL_PROVIDER"):
        load_settings()


def test_stub_settings_do_not_require_api_key() -> None:
    settings = Settings(
        _env_file=None,
        model_provider="stub",
        model="local-stub",
    )

    assert settings.model_api_key is None
