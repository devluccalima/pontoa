from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashSession
from app.modules.catalog.models import Product
from app.modules.dashboard.service import today_in
from app.modules.orders.models import Order
from app.modules.payments.models import Payment
from app.modules.users.models import User, UserRole
from tests.factories import (
    auth_headers,
    create_business,
    create_product,
    create_user,
    login,
    open_cash_session,
)

URL = "/api/v1/dashboard"


@pytest.fixture
def business(db_session: Session) -> Business:
    return create_business(db_session)


@pytest.fixture
def owner(db_session: Session, business: Business) -> User:
    return create_user(db_session, business, role=UserRole.OWNER)


@pytest.fixture
def owner_auth(db_client: TestClient, owner: User) -> dict[str, str]:
    return auth_headers(login(db_client, owner))


@pytest.fixture
def cash(db_session: Session, owner: User) -> CashSession:
    return open_cash_session(db_session, owner)


@pytest.fixture
def arepa(db_session: Session, business: Business) -> Product:
    return create_product(db_session, business, name="Arepa", price=Decimal("18.00"))


@pytest.fixture
def juice(db_session: Session, business: Business) -> Product:
    return create_product(db_session, business, name="Suco", price=Decimal("7.00"))


def place(client: TestClient, headers: dict, *items: tuple[Product, int]) -> dict:
    response = client.post(
        "/api/v1/orders",
        headers=headers,
        json={
            "items": [
                {"product_id": str(product.id), "quantity": quantity}
                for product, quantity in items
            ]
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def pay(client: TestClient, headers: dict, order: dict, method: str, amount: str):
    response = client.post(
        f"/api/v1/orders/{order['id']}/payments",
        headers=headers,
        json={"method": method, "amount": amount},
    )
    assert response.status_code == 201, response.text
    return response.json()


def move_to(db: Session, order: dict, moment: datetime) -> None:
    """Simula um pedido (e seus pagamentos) registrado em outro momento."""
    db.execute(update(Order).where(Order.id == order["id"]).values(created_at=moment))
    db.execute(
        update(Payment).where(Payment.order_id == order["id"]).values(created_at=moment)
    )


def test_today_indicators(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
    juice: Product,
) -> None:
    first = place(db_client, owner_auth, (arepa, 2), (juice, 1))  # 43.00
    second = place(db_client, owner_auth, (arepa, 1))  # 18.00
    cancelled = place(db_client, owner_auth, (juice, 5))
    pay(db_client, owner_auth, first, "pix", "43.00")
    pay(db_client, owner_auth, second, "cash", "10.00")
    db_client.post(
        f"/api/v1/orders/{cancelled['id']}/cancel",
        headers=owner_auth,
        json={"reason": "Desistiu"},
    )

    body = db_client.get(URL, headers=owner_auth).json()

    assert body["sales_total"] == "61.00"
    assert body["orders_count"] == 2
    assert body["cancelled_count"] == 1
    assert body["average_ticket"] == "30.50"
    assert body["received_total"] == "53.00"
    assert body["received_by_method"] == [
        {"method": "pix", "amount": "43.00"},
        {"method": "cash", "amount": "10.00"},
        {"method": "card", "amount": "0.00"},
    ]
    assert body["receivable_total"] == "8.00"
    assert body["top_products"] == [
        {
            "product_id": str(arepa.id),
            "name": "Arepa",
            "quantity": 3,
            "revenue": "54.00",
        },
        {"product_id": str(juice.id), "name": "Suco", "quantity": 1, "revenue": "7.00"},
    ]


def test_empty_period_has_zeroed_indicators(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    body = db_client.get(URL, headers=owner_auth).json()

    assert body["sales_total"] == "0.00"
    assert body["orders_count"] == 0
    assert body["average_ticket"] == "0.00"
    assert body["top_products"] == []


def test_average_ticket_is_rounded_to_cents(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
    cash: CashSession,
) -> None:
    product = create_product(db_session, business, price=Decimal("10.00"))
    cheap = create_product(db_session, business, price=Decimal("0.01"))
    place(db_client, owner_auth, (product, 1))
    place(db_client, owner_auth, (product, 1))
    place(db_client, owner_auth, (cheap, 1))

    body = db_client.get(URL, headers=owner_auth).json()

    assert body["sales_total"] == "20.01"
    assert body["average_ticket"] == "6.67"


def test_period_uses_business_timezone(
    db_client: TestClient,
    db_session: Session,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    late_night = place(db_client, owner_auth, (arepa, 1))
    # 23h30 de 23/11 em São Paulo = 02h30 de 24/11 em UTC.
    move_to(db_session, late_night, datetime(2026, 11, 24, 2, 30, tzinfo=UTC))

    on_23 = db_client.get(
        URL, headers=owner_auth, params={"start": "2026-11-23", "end": "2026-11-23"}
    ).json()
    on_24 = db_client.get(
        URL, headers=owner_auth, params={"start": "2026-11-24", "end": "2026-11-24"}
    ).json()

    assert on_23["orders_count"] == 1
    assert on_24["orders_count"] == 0
    assert on_23["timezone"] == "America/Sao_Paulo"


def test_period_filters_orders_and_payments(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    today = today_in(business)
    old = place(db_client, owner_auth, (arepa, 1))
    pay(db_client, owner_auth, old, "card", "18.00")
    move_to(db_session, old, datetime.now(UTC) - timedelta(days=10))
    place(db_client, owner_auth, (arepa, 2))

    only_today = db_client.get(URL, headers=owner_auth).json()
    last_month = db_client.get(
        URL,
        headers=owner_auth,
        params={"start": str(today - timedelta(days=30)), "end": str(today)},
    ).json()

    assert only_today["sales_total"] == "36.00"
    assert only_today["received_total"] == "0.00"
    assert last_month["sales_total"] == "54.00"
    assert last_month["received_total"] == "18.00"


def test_voided_payments_are_not_received(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, (arepa, 1))
    payment = pay(db_client, owner_auth, order, "pix", "18.00")
    db_client.post(
        f"/api/v1/payments/{payment['id']}/void",
        headers=owner_auth,
        json={"reason": "Erro"},
    )

    body = db_client.get(URL, headers=owner_auth).json()

    assert body["received_total"] == "0.00"
    assert body["receivable_total"] == "18.00"


@pytest.mark.parametrize(
    "params",
    [
        {"start": "2026-11-10", "end": "2026-11-01"},
        {"start": "2024-01-01", "end": "2026-01-01"},
    ],
)
def test_invalid_periods_are_rejected(
    db_client: TestClient, owner_auth: dict[str, str], params: dict
) -> None:
    assert db_client.get(URL, headers=owner_auth, params=params).status_code == 409


def test_dashboard_is_for_owner_and_isolated(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    place(db_client, owner_auth, (arepa, 1))
    operator_auth = auth_headers(login(db_client, create_user(db_session, business)))
    stranger = create_user(db_session, create_business(db_session), role=UserRole.OWNER)

    operator = db_client.get(URL, headers=operator_auth)
    other = db_client.get(URL, headers=auth_headers(login(db_client, stranger)))

    assert operator.status_code == 403
    assert other.json()["orders_count"] == 0


def test_dates_default_to_today(
    db_client: TestClient, business: Business, owner_auth: dict[str, str]
) -> None:
    body = db_client.get(URL, headers=owner_auth).json()

    assert body["start"] == body["end"] == str(today_in(business))
    assert date.fromisoformat(body["start"])
