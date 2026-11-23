import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cli import ask_password, create_business
from app.core.exceptions import BusinessRuleError
from app.core.security import verify_password
from app.modules.users.models import User, UserRole


def test_create_business_creates_owner(db_session: Session) -> None:
    business = create_business(
        db_session,
        name="Arepas da Feira",
        timezone="America/Sao_Paulo",
        owner_name="Lucca",
        owner_email="Lucca@Example.com",
        owner_password="senha-forte-123",
    )

    owner = db_session.scalar(select(User).where(User.business_id == business.id))
    assert owner is not None
    assert owner.role == UserRole.OWNER
    assert owner.email == "lucca@example.com"
    assert verify_password("senha-forte-123", owner.password_hash)


def test_create_business_rejects_unknown_timezone(db_session: Session) -> None:
    with pytest.raises(ValueError, match="Fuso horário"):
        create_business(
            db_session,
            name="X",
            timezone="Brasil/Feira",
            owner_name="Lucca",
            owner_email="lucca@example.com",
            owner_password="senha-forte-123",
        )


def test_create_business_rejects_duplicate_owner_email(db_session: Session) -> None:
    values = {
        "name": "X",
        "timezone": "America/Sao_Paulo",
        "owner_name": "Lucca",
        "owner_email": "lucca@example.com",
        "owner_password": "senha-forte-123",
    }
    create_business(db_session, **values)

    with pytest.raises(BusinessRuleError):
        create_business(db_session, **values)


def test_ask_password_requires_confirmation() -> None:
    answers = iter(["senha-1", "senha-2"])

    with pytest.raises(SystemExit, match="não conferem"):
        ask_password(lambda _: next(answers))
