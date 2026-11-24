from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashSession
from app.modules.catalog.models import Product
from app.modules.orders.models import OrderItem
from app.modules.users.models import User, UserRole
from tests.factories import (
    auth_headers,
    create_business,
    create_product,
    create_user,
    login,
    open_cash_session,
)

URL = "/api/v1/orders"


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
def operator_auth(
    db_client: TestClient, db_session: Session, business: Business
) -> dict[str, str]:
    return auth_headers(login(db_client, create_user(db_session, business)))


@pytest.fixture
def cash(db_session: Session, owner: User) -> CashSession:
    return open_cash_session(db_session, owner)


@pytest.fixture
def arepa(db_session: Session, business: Business) -> Product:
    return create_product(db_session, business, name="Arepa", price=Decimal("18.50"))


@pytest.fixture
def juice(db_session: Session, business: Business) -> Product:
    return create_product(db_session, business, name="Suco", price=Decimal("7.00"))


def place(
    client: TestClient, headers: dict[str, str], *products: Product, **extra: object
) -> dict:
    items = [{"product_id": str(product.id), "quantity": 1} for product in products]
    response = client.post(URL, headers=headers, json={"items": items, **extra})
    assert response.status_code == 201, response.text
    return response.json()


def advance(client: TestClient, headers: dict[str, str], order: dict, status: str):
    return client.post(
        f"{URL}/{order['id']}/status", headers=headers, json={"status": status}
    )


def cancel(client: TestClient, headers: dict[str, str], order: dict, reason="Desistiu"):
    return client.post(
        f"{URL}/{order['id']}/cancel", headers=headers, json={"reason": reason}
    )


def test_operator_places_order_with_frozen_prices(
    db_client: TestClient,
    db_session: Session,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
    juice: Product,
) -> None:
    response = db_client.post(
        URL,
        headers=operator_auth,
        json={
            "customer_name": " João ",
            "items": [
                {"product_id": str(arepa.id), "quantity": 2, "notes": "sem cebola"},
                {"product_id": str(juice.id)},
            ],
        },
    )

    assert response.status_code == 201
    order = response.json()
    assert order["number"] == 1
    assert order["customer_name"] == "João"
    assert order["status"] == "new"
    assert order["cash_session_id"] == str(cash.id)
    assert order["total"] == "44.00"
    assert [
        (item["product_name"], item["unit_price"], item["quantity"], item["line_total"])
        for item in order["items"]
    ] == [("Arepa", "18.50", 2, "37.00"), ("Suco", "7.00", 1, "7.00")]
    assert order["items"][0]["notes"] == "sem cebola"

    # RN-007: mudar o preço depois não altera o pedido.
    arepa.price = Decimal("25.00")
    db_session.flush()
    stored = db_client.get(f"{URL}/{order['id']}", headers=operator_auth).json()
    assert stored["total"] == "44.00"
    assert stored["items"][0]["unit_price"] == "18.50"


def test_orders_are_numbered_per_cash_session(
    db_client: TestClient,
    db_session: Session,
    owner: User,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    numbers = [place(db_client, owner_auth, arepa)["number"] for _ in range(3)]
    for order in db_client.get(URL, headers=owner_auth).json():
        advance(db_client, owner_auth, order, "delivered")
    db_client.post(
        "/api/v1/cash-sessions/current/close",
        headers=owner_auth,
        json={"counted_amount": "0"},
    )
    open_cash_session(db_session, owner)

    next_shift = place(db_client, owner_auth, arepa)

    assert numbers == [1, 2, 3]
    assert next_shift["number"] == 1


def test_orders_require_open_cash_session(
    db_client: TestClient, operator_auth: dict[str, str], arepa: Product
) -> None:
    response = db_client.post(
        URL, headers=operator_auth, json={"items": [{"product_id": str(arepa.id)}]}
    )

    assert response.status_code == 409
    assert "caixa está fechado" in response.json()["error"]["message"]


def test_inactive_product_cannot_be_sold(
    db_client: TestClient,
    db_session: Session,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    arepa.active = False
    db_session.flush()

    response = db_client.post(
        URL, headers=operator_auth, json={"items": [{"product_id": str(arepa.id)}]}
    )

    assert response.status_code == 409
    assert "Arepa" in response.json()["error"]["message"]


def test_product_from_other_business_cannot_be_sold(
    db_client: TestClient,
    db_session: Session,
    operator_auth: dict[str, str],
    cash: CashSession,
) -> None:
    foreign = create_product(db_session, create_business(db_session))

    response = db_client.post(
        URL, headers=operator_auth, json={"items": [{"product_id": str(foreign.id)}]}
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    "items",
    [[], [{"product_id": "00000000-0000-0000-0000-000000000000", "quantity": 0}]],
)
def test_invalid_items_are_rejected(
    db_client: TestClient, operator_auth: dict[str, str], cash: CashSession, items
) -> None:
    response = db_client.post(URL, headers=operator_auth, json={"items": items})

    assert response.status_code == 422


def test_order_moves_forward_and_records_delivery(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    statuses = [
        advance(db_client, operator_auth, order, status).json()["status"]
        for status in ("preparing", "ready", "delivered")
    ]

    assert statuses == ["preparing", "ready", "delivered"]
    stored = db_client.get(f"{URL}/{order['id']}", headers=operator_auth).json()
    assert stored["delivered_at"] is not None


def test_order_can_skip_steps_for_counter_sales(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    response = advance(db_client, operator_auth, order, "delivered")

    assert response.status_code == 200


@pytest.mark.parametrize("target", ["new", "preparing", "cancelled"])
def test_order_cannot_move_backwards_or_cancel_through_status(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
    target: str,
) -> None:
    order = place(db_client, operator_auth, arepa)
    advance(db_client, operator_auth, order, "ready")

    assert advance(db_client, operator_auth, order, target).status_code == 409


def test_operator_cancels_new_order_with_reason(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    response = cancel(db_client, operator_auth, order, "Cliente desistiu")

    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "cancelled"
    assert body["cancel_reason"] == "Cliente desistiu"
    assert body["cancelled_at"] is not None
    assert advance(db_client, operator_auth, order, "preparing").status_code == 409
    assert cancel(db_client, operator_auth, order).status_code == 409


def test_operator_cannot_cancel_after_preparation_starts(
    db_client: TestClient,
    owner: User,
    owner_auth: dict[str, str],
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)
    advance(db_client, operator_auth, order, "preparing")

    by_operator = cancel(db_client, operator_auth, order)
    by_owner = cancel(db_client, owner_auth, order)

    assert by_operator.status_code == 403
    assert by_owner.status_code == 200
    assert by_owner.json()["cancelled_by_id"] == str(owner.id)


def test_cancel_reason_is_required(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    assert cancel(db_client, operator_auth, order, "  ").status_code == 422


def test_listing_filters_by_status_and_defaults_to_open_session(
    db_client: TestClient,
    db_session: Session,
    owner: User,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    first = place(db_client, owner_auth, arepa)
    second = place(db_client, owner_auth, arepa)
    advance(db_client, owner_auth, second, "ready")

    everything = db_client.get(URL, headers=owner_auth).json()
    queue = db_client.get(
        URL, headers=owner_auth, params={"status": ["new", "preparing"]}
    ).json()

    assert [order["number"] for order in everything] == [1, 2]
    assert [order["id"] for order in queue] == [first["id"]]


def test_listing_without_open_session_is_empty(
    db_client: TestClient, operator_auth: dict[str, str]
) -> None:
    assert db_client.get(URL, headers=operator_auth).json() == []


def test_orders_are_isolated_by_business(
    db_client: TestClient,
    db_session: Session,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    stranger = create_user(db_session, create_business(db_session), role=UserRole.OWNER)
    stranger_auth = auth_headers(login(db_client, stranger))
    open_cash_session(db_session, stranger)

    responses = [
        db_client.get(f"{URL}/{order['id']}", headers=stranger_auth),
        advance(db_client, stranger_auth, order, "delivered"),
        cancel(db_client, stranger_auth, order),
    ]

    assert {response.status_code for response in responses} == {404}
    assert db_client.get(URL, headers=stranger_auth).json() == []
    other_session = db_client.get(
        URL, headers=stranger_auth, params={"cash_session_id": str(cash.id)}
    )
    assert other_session.json() == []


def test_cash_cannot_close_with_orders_in_progress(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    pending = place(db_client, owner_auth, arepa)
    done = place(db_client, owner_auth, arepa)
    advance(db_client, owner_auth, done, "delivered")
    close_url = "/api/v1/cash-sessions/current/close"

    blocked = db_client.post(
        close_url, headers=owner_auth, json={"counted_amount": "0"}
    )
    cancel(db_client, owner_auth, pending)
    allowed = db_client.post(
        close_url, headers=owner_auth, json={"counted_amount": "0"}
    )

    assert blocked.status_code == 409
    assert "1 pedido(s) em andamento" in blocked.json()["error"]["message"]
    assert allowed.status_code == 200


def test_database_rejects_inconsistent_line_total(
    db_client: TestClient,
    db_session: Session,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)
    item = db_session.get(OrderItem, order["items"][0]["id"])
    assert item is not None

    item.line_total = Decimal("1.00")
    with pytest.raises(IntegrityError, match="ck_order_items_line_total_matches"):
        db_session.flush()
