import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app
from tests.helpers import UNREACHABLE_DATABASE_URL, make_settings


def test_reads_prefixed_environment_variables(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PONTOA_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("PONTOA_DATABASE_URL", UNREACHABLE_DATABASE_URL)

    settings = Settings(_env_file=None)

    assert settings.log_level == "DEBUG"


def test_rejects_unknown_environment() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="producao")


def test_forbids_debug_in_production() -> None:
    with pytest.raises(ValidationError, match="PONTOA_DEBUG"):
        make_settings(environment="production", debug=True)


def test_hides_docs_in_production() -> None:
    app = create_app(make_settings(environment="production"))
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/health").status_code == 200


def test_requires_database_url() -> None:
    with pytest.raises(ValidationError, match="database_url"):
        Settings(_env_file=None)


def test_rejects_database_url_without_psycopg_driver() -> None:
    with pytest.raises(ValidationError, match="postgresql\\+psycopg"):
        make_settings(database_url="postgresql://pontoa:segredo@127.0.0.1/pontoa")


def test_validation_errors_do_not_expose_database_password() -> None:
    with pytest.raises(ValidationError) as error:
        make_settings(database_url="postgresql://pontoa:segredo@127.0.0.1/pontoa")

    assert "segredo" not in str(error.value)


def test_database_url_is_masked_when_printed() -> None:
    settings = make_settings()

    assert "segredo" not in repr(settings)
