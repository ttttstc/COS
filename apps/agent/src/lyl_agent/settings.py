"""Environment-backed model configuration."""

from pydantic import SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class ModelConfigurationError(RuntimeError):
    """Raised when the model cannot be configured safely."""


class Settings(BaseSettings):
    """Settings loaded lazily when a chat run starts."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="LYL_",
        extra="ignore",
    )

    model_provider: str
    model: str
    model_api_key: SecretStr | None = None
    model_base_url: str | None = None
    stub_response: str = "Local LangGraph baseline is connected."


def load_settings() -> Settings:
    """Load settings and replace validation internals with a readable error."""

    try:
        return Settings()
    except ValidationError as error:
        raise ModelConfigurationError(
            "Agent model is not configured. Set LYL_MODEL_PROVIDER and "
            "LYL_MODEL in apps/agent/.env."
        ) from error
