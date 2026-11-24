from typing import Any

from app.core.config import Settings

UNREACHABLE_DATABASE_URL = "postgresql+psycopg://pontoa:segredo@127.0.0.1:1/pontoa"


def make_settings(**overrides: Any) -> Settings:
    """Settings isoladas: ignoram o .env e usam um banco inalcançável por padrão."""
    values: dict[str, Any] = {
        "environment": "test",
        "debug": False,
        "database_url": UNREACHABLE_DATABASE_URL,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)
