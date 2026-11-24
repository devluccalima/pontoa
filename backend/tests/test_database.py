import uuid
from datetime import timedelta

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.db.models import Base
from app.modules.businesses.models import Business


def test_readiness_returns_ok_when_database_is_reachable(
    db_client: TestClient,
) -> None:
    response = db_client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_business_gets_defaults_from_model_and_database(db_session: Session) -> None:
    business = Business(name="Arepas da Feira")
    db_session.add(business)
    db_session.flush()
    db_session.refresh(business)

    assert business.id.version == 7
    assert business.timezone == "America/Sao_Paulo"
    assert business.active is True
    assert business.created_at.utcoffset() == timedelta(0)


def test_transactions_are_rolled_back_between_tests(db_session: Session) -> None:
    db_session.add(Business(name="Pastelaria Temporária"))
    db_session.commit()

    assert db_session.query(Business).count() == 1


def test_previous_test_left_no_data(db_session: Session) -> None:
    assert db_session.query(Business).count() == 0


def test_migrations_match_models(db_engine: Engine) -> None:
    with db_engine.connect() as connection:
        context = MigrationContext.configure(connection)
        differences = compare_metadata(context, Base.metadata)

    assert differences == []


def test_uuid_v7_is_time_ordered() -> None:
    first, second = uuid.uuid7(), uuid.uuid7()

    assert first < second
