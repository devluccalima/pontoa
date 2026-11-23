from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Engine, make_url
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import create_db_engine, get_db
from app.main import create_app
from tests.helpers import make_settings

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


class TestDatabaseSettings(BaseSettings):
    """Lê apenas a URL do banco de testes (ambiente ou .env)."""

    model_config = SettingsConfigDict(
        env_prefix="PONTOA_",
        env_file=".env",
        extra="ignore",
        hide_input_in_errors=True,
    )

    test_database_url: SecretStr | None = None


@pytest.fixture
def settings() -> Settings:
    return make_settings()


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def db_engine() -> Iterator[Engine]:
    """Banco de testes migrado até a última versão, uma vez por sessão."""
    secret = TestDatabaseSettings().test_database_url
    if secret is None:
        pytest.fail("Defina PONTOA_TEST_DATABASE_URL no backend/.env.")

    url = secret.get_secret_value()
    database = make_url(url).database or ""
    if not database.endswith("_test"):
        pytest.fail("O banco de testes precisa terminar em '_test'.")

    engine = create_db_engine(make_settings(database_url=url))
    with engine.begin() as connection:
        config = Config(ALEMBIC_INI)
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    """Sessão dentro de uma transação desfeita ao final de cada teste."""
    with db_engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()


@pytest.fixture
def db_client(app: FastAPI, db_session: Session) -> Iterator[TestClient]:
    """Cliente cuja API usa a sessão transacional do teste."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()
