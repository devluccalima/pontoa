import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app


def test_reads_prefixed_environment_variables(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PONTOA_LOG_LEVEL", "DEBUG")

    settings = Settings(_env_file=None)

    assert settings.log_level == "DEBUG"


def test_rejects_unknown_environment() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="producao")


def test_forbids_debug_in_production() -> None:
    with pytest.raises(ValidationError, match="PONTOA_DEBUG"):
        Settings(_env_file=None, environment="production", debug=True)


def test_hides_docs_in_production() -> None:
    app = create_app(Settings(_env_file=None, environment="production"))
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/health").status_code == 200
