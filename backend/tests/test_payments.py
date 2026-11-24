from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashSession
from app.modules.catalog.models import Product
from app.modules.orders.models import Order
from app.modules.payments.models import Payment, PaymentMethod
from app.modules.users.models import User, UserRole
from tests.factories import (
    auth_headers,
    create_business,
    create_product,
    create_user,
    login,
    open_cash_session,
)

ORDERS = "/api/v1/orders"
CASH = "/api/v1/cash-sessions"


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
    return open_cash_session(db_session, owner, "20.00")


@pytest.fixture
def arepa(db_session: Session, business: Business) -> Product:
    return create_product(db_session, business, name="Arepa", price=Decimal("18.50"))


def place(client: TestClient, headers: dict[str, str], product: Product, qty=2):
    response = client.post(
        ORDERS,
        headers=headers,
        json={"items": [{"product_id": str(product.id), "quantity": qty}]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def pay(client: TestClient, headers: dict[str, str], order: dict, **body: object):
    return client.post(f"{ORDERS}/{order['id']}/payments", headers=headers, json=body)


def get_order(client: TestClient, headers: dict[str, str], order: dict) -> dict:
    return client.get(f"{ORDERS}/{order['id']}", headers=headers).json()


def void(client: TestClient, headers: dict[str, str], payment: dict, reason="Erro"):
    return client.post(
        f"/api/v1/payments/{payment['id']}/void",
        headers=headers,
        json={"reason": reason},
    )


def test_new_order_is_unpaid(
    db_client: TestClient, operator_auth: dict[str, str], cash: CashSession, arepa
) -> None:
    order = place(db_client, operator_auth, arepa)

    assert order["payment_status"] == "unpaid"
    assert order["paid_amount"] == "0.00"
    assert order["amount_due"] == "37.00"


def test_operator_receives_full_payment_by_pix(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    response = pay(db_client, operator_auth, order, method="pix", amount="37.00")

    assert response.status_code == 201
    payment = response.json()
    assert payment["method"] == "pix"
    assert payment["cash_session_id"] == str(cash.id)
    assert payment["change"] is None
    stored = get_order(db_client, operator_auth, order)
    assert stored["payment_status"] == "paid"
    assert stored["amount_due"] == "0.00"
    # RN-002: pagar não muda o status operacional.
    assert stored["status"] == "new"


def test_split_payment_with_cash_change(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    card = pay(db_client, operator_auth, order, method="card", amount="17.00")
    partial = get_order(db_client, operator_auth, order)
    money = pay(
        db_client,
        operator_auth,
        order,
        method="cash",
        amount="20.00",
        received_amount="50.00",
    )

    assert card.status_code == 201
    assert partial["payment_status"] == "partial"
    assert partial["amount_due"] == "20.00"
    assert money.json()["change"] == "30.00"
    assert get_order(db_client, operator_auth, order)["payment_status"] == "paid"


def test_payment_cannot_exceed_amount_due(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)

    too_much = pay(db_client, operator_auth, order, method="pix", amount="37.01")
    pay(db_client, operator_auth, order, method="pix", amount="37.00")
    already_paid = pay(db_client, operator_auth, order, method="pix", amount="1")

    assert too_much.status_code == 409
    assert "R$ 37.00" in too_much.json()["error"]["message"]
    assert already_paid.status_code == 409


@pytest.mark.parametrize(
    "body",
    [
        {"method": "pix", "amount": "0"},
        {"method": "pix", "amount": "10", "received_amount": "20"},
        {"method": "cash", "amount": "10", "received_amount": "5"},
        {"method": "cheque", "amount": "10"},
    ],
)
def test_invalid_payments_are_rejected(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
    body: dict,
) -> None:
    order = place(db_client, operator_auth, arepa)

    assert pay(db_client, operator_auth, order, **body).status_code == 422


def test_order_can_be_delivered_before_payment(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)
    db_client.post(
        f"{ORDERS}/{order['id']}/status",
        headers=operator_auth,
        json={"status": "delivered"},
    )

    pending = db_client.get(f"{ORDERS}/pending-payments", headers=operator_auth)

    assert [item["id"] for item in pending.json()] == [order["id"]]
    assert (
        pay(db_client, operator_auth, order, method="cash", amount="37.00").status_code
        == 201
    )
    assert (
        db_client.get(f"{ORDERS}/pending-payments", headers=operator_auth).json() == []
    )


def test_unpaid_order_can_be_received_in_a_later_cash_session(
    db_client: TestClient,
    db_session: Session,
    owner: User,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    db_client.post(
        f"{ORDERS}/{order['id']}/status",
        headers=owner_auth,
        json={"status": "delivered"},
    )
    db_client.post(
        f"{CASH}/current/close", headers=owner_auth, json={"counted_amount": "20.00"}
    )
    next_cash = open_cash_session(db_session, owner)

    pending = db_client.get(f"{ORDERS}/pending-payments", headers=owner_auth).json()
    payment = pay(db_client, owner_auth, order, method="cash", amount="37.00").json()

    assert [item["id"] for item in pending] == [order["id"]]
    assert payment["cash_session_id"] == str(next_cash.id)


def test_payments_require_open_cash_session(
    db_client: TestClient,
    db_session: Session,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    db_client.post(
        f"{ORDERS}/{order['id']}/status",
        headers=owner_auth,
        json={"status": "delivered"},
    )
    db_client.post(
        f"{CASH}/current/close", headers=owner_auth, json={"counted_amount": "0"}
    )

    response = pay(db_client, owner_auth, order, method="pix", amount="37.00")

    assert response.status_code == 409


def test_cash_payments_enter_expected_amount_without_change(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    first, second = (
        place(db_client, owner_auth, arepa),
        place(db_client, owner_auth, arepa),
    )
    pay(
        db_client,
        owner_auth,
        first,
        method="cash",
        amount="37.00",
        received_amount="50",
    )
    pay(db_client, owner_auth, second, method="pix", amount="37.00")

    summary = db_client.get(f"{CASH}/current", headers=owner_auth).json()["session"][
        "summary"
    ]

    assert summary["cash_payments"] == "37.00"
    assert summary["expected_amount"] == "57.00"


def test_withdrawal_can_use_cash_received(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    pay(db_client, owner_auth, order, method="cash", amount="37.00")

    response = db_client.post(
        f"{CASH}/current/movements",
        headers=owner_auth,
        json={"kind": "withdrawal", "amount": "57.00", "description": "Depósito"},
    )

    assert response.status_code == 201


def test_owner_voids_payment_and_order_becomes_unpaid(
    db_client: TestClient,
    owner: User,
    owner_auth: dict[str, str],
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)
    payment = pay(db_client, operator_auth, order, method="cash", amount="37.00").json()

    by_operator = void(db_client, operator_auth, payment)
    by_owner = void(db_client, owner_auth, payment, "Pix registrado como dinheiro")
    again = void(db_client, owner_auth, payment)

    assert by_operator.status_code == 403
    assert by_owner.status_code == 200
    assert by_owner.json()["is_voided"] is True
    assert by_owner.json()["voided_by_id"] == str(owner.id)
    assert again.status_code == 409
    assert get_order(db_client, owner_auth, order)["payment_status"] == "unpaid"
    summary = db_client.get(f"{CASH}/current", headers=owner_auth).json()["session"][
        "summary"
    ]
    assert summary["cash_payments"] == "0.00"
    history = db_client.get(f"{ORDERS}/{order['id']}/payments", headers=owner_auth)
    assert [item["is_voided"] for item in history.json()] == [True]


def test_payment_from_closed_cash_session_cannot_be_voided(
    db_client: TestClient,
    db_session: Session,
    owner: User,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    payment = pay(db_client, owner_auth, order, method="pix", amount="37.00").json()
    db_client.post(
        f"{ORDERS}/{order['id']}/status",
        headers=owner_auth,
        json={"status": "delivered"},
    )
    db_client.post(
        f"{CASH}/current/close", headers=owner_auth, json={"counted_amount": "20"}
    )
    open_cash_session(db_session, owner)

    response = void(db_client, owner_auth, payment)

    assert response.status_code == 409


def test_paid_order_cannot_be_cancelled_until_payment_is_voided(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    payment = pay(db_client, owner_auth, order, method="pix", amount="10.00").json()
    cancel_url = f"{ORDERS}/{order['id']}/cancel"

    blocked = db_client.post(cancel_url, headers=owner_auth, json={"reason": "Erro"})
    void(db_client, owner_auth, payment)
    allowed = db_client.post(cancel_url, headers=owner_auth, json={"reason": "Erro"})

    assert blocked.status_code == 409
    assert "Estorne" in blocked.json()["error"]["message"]
    assert allowed.status_code == 200


def test_cancelled_order_cannot_be_paid_and_is_not_pending(
    db_client: TestClient,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, operator_auth, arepa)
    db_client.post(
        f"{ORDERS}/{order['id']}/cancel", headers=operator_auth, json={"reason": "Erro"}
    )

    response = pay(db_client, operator_auth, order, method="pix", amount="1")

    assert response.status_code == 409
    assert (
        db_client.get(f"{ORDERS}/pending-payments", headers=operator_auth).json() == []
    )


def test_payments_are_isolated_by_business(
    db_client: TestClient,
    db_session: Session,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    order = place(db_client, owner_auth, arepa)
    payment = pay(db_client, owner_auth, order, method="pix", amount="1").json()
    stranger = create_user(db_session, create_business(db_session), role=UserRole.OWNER)
    stranger_auth = auth_headers(login(db_client, stranger))
    open_cash_session(db_session, stranger)

    responses = [
        pay(db_client, stranger_auth, order, method="pix", amount="1"),
        db_client.get(f"{ORDERS}/{order['id']}/payments", headers=stranger_auth),
        void(db_client, stranger_auth, payment),
    ]

    assert {response.status_code for response in responses} == {404}
    assert (
        db_client.get(f"{ORDERS}/pending-payments", headers=stranger_auth).json() == []
    )


def test_database_keeps_paid_amount_within_total(
    db_client: TestClient,
    db_session: Session,
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    created = place(db_client, operator_auth, arepa)
    order = db_session.get(Order, created["id"])
    assert order is not None

    order.paid_amount = order.total + 1
    with pytest.raises(IntegrityError, match="ck_orders_paid_amount_in_range"):
        db_session.flush()


def test_database_rejects_received_amount_for_non_cash(
    db_session: Session, business: Business, owner: User, cash: CashSession, arepa
) -> None:
    order = Order(
        business_id=business.id,
        cash_session_id=cash.id,
        number=99,
        total=Decimal("10"),
        created_by_id=owner.id,
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(
        Payment(
            business_id=business.id,
            order_id=order.id,
            cash_session_id=cash.id,
            method=PaymentMethod.PIX,
            amount=Decimal("10"),
            received_amount=Decimal("20"),
            created_by_id=owner.id,
        )
    )

    with pytest.raises(IntegrityError, match="ck_payments_received_amount_only_cash"):
        db_session.flush()
