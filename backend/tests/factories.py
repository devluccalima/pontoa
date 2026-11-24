"""Criação de dados de teste com valores padrão razoáveis."""

from decimal import Decimal
from itertools import count

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashSession
from app.modules.catalog.models import Product
from app.modules.users.models import User, UserRole

DEFAULT_PASSWORD = "senha-forte-123"
_DEFAULT_PASSWORD_HASH = hash_password(DEFAULT_PASSWORD)
_sequence = count(1)


def create_business(db: Session, **overrides: object) -> Business:
    values: dict[str, object] = {"name": f"Barraca {next(_sequence)}"}
    values.update(overrides)
    business = Business(**values)
    db.add(business)
    db.flush()
    return business


def create_user(
    db: Session,
    business: Business,
    role: UserRole = UserRole.OPERATOR,
    password: str | None = None,
    **overrides: object,
) -> User:
    number = next(_sequence)
    values: dict[str, object] = {
        "name": f"Pessoa {number}",
        "email": f"pessoa{number}@example.com",
        "password_hash": hash_password(password)
        if password
        else _DEFAULT_PASSWORD_HASH,
    }
    values.update(overrides)
    user = User(business_id=business.id, role=role, **values)
    db.add(user)
    db.flush()
    return user


def login(client: TestClient, user: User, password: str = DEFAULT_PASSWORD) -> str:
    response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_product(db: Session, business: Business, **overrides: object) -> Product:
    values: dict[str, object] = {
        "name": f"Produto {next(_sequence)}",
        "price": Decimal("10.00"),
    }
    values.update(overrides)
    product = Product(business_id=business.id, **values)
    db.add(product)
    db.flush()
    return product


def open_cash_session(
    db: Session, user: User, opening_amount: str = "0.00"
) -> CashSession:
    session = CashSession(
        business_id=user.business_id,
        opened_by_id=user.id,
        opening_amount=Decimal(opening_amount),
    )
    db.add(session)
    db.flush()
    return session
