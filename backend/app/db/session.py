from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings

CONNECT_TIMEOUT_SECONDS = 5


def create_db_engine(settings: Settings) -> Engine:
    """Cria o engine; nenhuma conexão é aberta até o primeiro uso.

    Toda conexão usa UTC, independentemente da configuração do servidor.
    """
    return create_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,
        connect_args={
            "options": "-c timezone=UTC",
            "connect_timeout": CONNECT_TIMEOUT_SECONDS,
        },
    )


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)


def get_db(request: Request) -> Iterator[Session]:
    """Dependência do FastAPI: uma sessão por requisição."""
    session_factory: sessionmaker[Session] = request.app.state.session_factory
    with session_factory() as session:
        yield session
