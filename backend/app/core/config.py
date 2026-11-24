from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DATABASE_URL_SCHEME = "postgresql+psycopg://"


class Settings(BaseSettings):
    """Configurações da aplicação, lidas do ambiente e do arquivo .env."""

    model_config = SettingsConfigDict(
        env_prefix="PONTOA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    app_name: str = "Pontoa API"
    environment: Literal["development", "test", "production"] = "development"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: list[str] = ["http://localhost:5173"]

    database_url: SecretStr
    session_ttl_hours: int = Field(default=12, ge=1, le=168)

    @field_validator("database_url")
    @classmethod
    def require_psycopg_driver(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().startswith(DATABASE_URL_SCHEME):
            message = f"PONTOA_DATABASE_URL deve começar com {DATABASE_URL_SCHEME}"
            raise ValueError(message)
        return value

    @model_validator(mode="after")
    def forbid_debug_in_production(self) -> Self:
        if self.environment == "production" and self.debug:
            raise ValueError("PONTOA_DEBUG não pode ser true em produção.")
        return self


@lru_cache
def get_settings() -> Settings:
    """Retorna uma instância única (cacheada) das configurações."""
    return Settings()
