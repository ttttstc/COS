"""Chat model construction kept separate for test injection."""

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from lyl_agent.settings import ModelConfigurationError, Settings


def create_chat_model(settings: Settings) -> BaseChatModel:
    """Create a configured provider model or the no-key local stub."""

    provider = settings.model_provider.strip().lower()
    if provider == "stub":
        return FakeListChatModel(responses=[settings.stub_response], sleep=0.01)

    if settings.model_api_key is None:
        raise ModelConfigurationError(
            "LYL_MODEL_API_KEY is required when LYL_MODEL_PROVIDER is not stub."
        )

    options: dict[str, object] = {
        "model": settings.model,
        "model_provider": provider,
        "api_key": settings.model_api_key.get_secret_value(),
    }
    if settings.model_base_url:
        options["base_url"] = settings.model_base_url

    try:
        return init_chat_model(**options)
    except Exception as error:
        raise ModelConfigurationError(
            "Unable to initialize the configured model provider. "
            "Check LYL_MODEL_PROVIDER, LYL_MODEL, and the installed integration."
        ) from error
