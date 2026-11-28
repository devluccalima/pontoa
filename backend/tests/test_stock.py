import threading
import time
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.modules.auth.models import UserSession
from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashSession
from app.modules.catalog.models import Product
from app.modules.orders import service as orders
from app.modules.orders.models import Order, OrderItem
from app.modules.orders.schemas import OrderCreate
from app.modules.stock.models import StockMovement
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


def stock_url(product: Product | dict) -> str:
    product_id = product["id"] if isinstance(product, dict) else product.id
    return f"/api/v1/products/{product_id}/stock"


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


def set_stock(
    client: TestClient, headers: dict[str, str], product: Product, quantity: int
) -> dict:
    response = client.put(
        stock_url(product), headers=headers, json={"quantity": quantity}
    )
    assert response.status_code == 200, response.text
    return response.json()


def order(client: TestClient, headers: dict[str, str], *items: tuple[Product, int]):
    body = {
        "items": [
            {"product_id": str(product.id), "quantity": quantity}
            for product, quantity in items
        ]
    }
    return client.post(ORDERS, headers=headers, json=body)


def movements(client: TestClient, headers: dict[str, str], product: Product) -> list:
    response = client.get(f"{stock_url(product)}/movements", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_products_start_without_stock_control(
    db_client: TestClient, operator_auth: dict[str, str], arepa: Product
) -> None:
    response = db_client.get(f"/api/v1/products/{arepa.id}", headers=operator_auth)

    assert response.json()["stock_quantity"] is None


def test_owner_sets_and_adjusts_stock(
    db_client: TestClient, owner_auth: dict[str, str], owner: User, arepa: Product
) -> None:
    response = db_client.put(
        stock_url(arepa),
        headers=owner_auth,
        json={"quantity": 50, "reason": "  Produção do dia "},
    )
    assert response.status_code == 200
    assert response.json()["stock_quantity"] == 50

    assert set_stock(db_client, owner_auth, arepa, 30)["stock_quantity"] == 30

    latest, first = movements(db_client, owner_auth, arepa)
    assert first["kind"] == "adjustment"
    assert (first["quantity_change"], first["balance"]) == (50, 50)
    assert first["reason"] == "Produção do dia"
    assert first["created_by_id"] == str(owner.id)
    assert (latest["quantity_change"], latest["balance"]) == (-20, 30)
    assert latest["reason"] is None


def test_only_the_owner_manages_stock(
    db_client: TestClient, operator_auth: dict[str, str], arepa: Product
) -> None:
    url = stock_url(arepa)

    assert (
        db_client.put(url, headers=operator_auth, json={"quantity": 5}).status_code
        == 403
    )
    assert db_client.delete(url, headers=operator_auth).status_code == 403
    assert db_client.get(f"{url}/movements", headers=operator_auth).status_code == 403


@pytest.mark.parametrize(
    "body",
    [
        {"quantity": -1},
        {"quantity": 100_001},
        {"quantity": 1.5},
        {},
        {"quantity": 1, "x": 1},
    ],
)
def test_invalid_stock_is_rejected(
    db_client: TestClient, owner_auth: dict[str, str], arepa: Product, body: dict
) -> None:
    response = db_client.put(stock_url(arepa), headers=owner_auth, json=body)

    assert response.status_code == 422


def test_sale_takes_stock_and_records_the_order(
    db_client: TestClient,
    owner_auth: dict[str, str],
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
    juice: Product,
) -> None:
    set_stock(db_client, owner_auth, arepa, 10)

    response = order(db_client, operator_auth, (arepa, 2), (juice, 3), (arepa, 1))
    assert response.status_code == 201, response.text

    products = db_client.get("/api/v1/products", headers=operator_auth).json()
    stock = {product["name"]: product["stock_quantity"] for product in products}
    assert stock == {"Arepa": 7, "Suco": None}

    sale = movements(db_client, owner_auth, arepa)[0]
    assert sale["kind"] == "sale"
    assert (sale["quantity_change"], sale["balance"]) == (-3, 7)
    assert sale["order_id"] == response.json()["id"]


def test_sale_beyond_stock_is_refused_and_changes_nothing(
    db_client: TestClient,
    owner_auth: dict[str, str],
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
    juice: Product,
) -> None:
    set_stock(db_client, owner_auth, arepa, 1)
    set_stock(db_client, owner_auth, juice, 0)

    response = order(db_client, operator_auth, (juice, 1), (arepa, 2))

    assert response.status_code == 409
    assert response.json()["error"]["message"] == (
        "Estoque insuficiente: Arepa (disponível: 1), Suco (disponível: 0)."
    )
    assert db_client.get(ORDERS, headers=operator_auth).json() == []
    assert len(movements(db_client, owner_auth, arepa)) == 1

    # O número do pedido não foi consumido pela tentativa recusada.
    set_stock(db_client, owner_auth, juice, 5)
    assert order(db_client, operator_auth, (juice, 1)).json()["number"] == 1


def test_last_unit_can_be_sold(
    db_client: TestClient,
    owner_auth: dict[str, str],
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    set_stock(db_client, owner_auth, arepa, 1)

    assert order(db_client, operator_auth, (arepa, 1)).status_code == 201
    assert order(db_client, operator_auth, (arepa, 1)).status_code == 409


def test_cancelled_order_returns_stock(
    db_client: TestClient,
    owner_auth: dict[str, str],
    operator_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    set_stock(db_client, owner_auth, arepa, 5)
    placed = order(db_client, operator_auth, (arepa, 2)).json()

    response = db_client.post(
        f"{ORDERS}/{placed['id']}/cancel",
        headers=operator_auth,
        json={"reason": "Desistiu"},
    )
    assert response.status_code == 200

    back = movements(db_client, owner_auth, arepa)[0]
    assert back["kind"] == "cancellation"
    assert (back["quantity_change"], back["balance"]) == (2, 5)
    assert back["order_id"] == placed["id"]


def test_cancel_after_tracking_was_turned_off_leaves_product_unlimited(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    set_stock(db_client, owner_auth, arepa, 5)
    placed = order(db_client, owner_auth, (arepa, 2)).json()
    db_client.delete(stock_url(arepa), headers=owner_auth)

    db_client.post(
        f"{ORDERS}/{placed['id']}/cancel", headers=owner_auth, json={"reason": "Erro"}
    )

    product = db_client.get(f"/api/v1/products/{arepa.id}", headers=owner_auth).json()
    assert product["stock_quantity"] is None
    assert movements(db_client, owner_auth, arepa)[0]["kind"] == "tracking_off"


def test_turning_tracking_off_allows_unlimited_sales(
    db_client: TestClient,
    owner_auth: dict[str, str],
    cash: CashSession,
    arepa: Product,
) -> None:
    set_stock(db_client, owner_auth, arepa, 3)

    response = db_client.delete(stock_url(arepa), headers=owner_auth)
    assert response.status_code == 200
    assert response.json()["stock_quantity"] is None

    # Desligar de novo não registra outra movimentação.
    assert db_client.delete(stock_url(arepa), headers=owner_auth).status_code == 200
    off, _ = movements(db_client, owner_auth, arepa)
    assert off["kind"] == "tracking_off"
    assert (off["quantity_change"], off["balance"]) == (-3, None)

    assert order(db_client, owner_auth, (arepa, 50)).status_code == 201


def test_stock_of_other_business_is_not_found(
    db_client: TestClient,
    db_session: Session,
    owner_auth: dict[str, str],
) -> None:
    other = create_product(db_session, create_business(db_session), name="Outra")

    url = stock_url(other)
    assert (
        db_client.put(url, headers=owner_auth, json={"quantity": 1}).status_code == 404
    )
    assert db_client.delete(url, headers=owner_auth).status_code == 404
    assert db_client.get(f"{url}/movements", headers=owner_auth).status_code == 404


def test_database_rejects_negative_stock(db_session: Session, arepa: Product) -> None:
    arepa.stock_quantity = -1

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_sale_waits_for_concurrent_stock_change(db_engine: Engine) -> None:
    """Uma venda espera a outra transação que mexe no produto e vê o saldo novo.

    Sem o bloqueio da linha, a venda leria o saldo antigo (1) e venderia uma
    unidade que já foi vendida.
    """
    with Session(db_engine) as setup:
        business = create_business(setup)
        owner = create_user(setup, business, role=UserRole.OWNER)
        product = create_product(setup, business, name="Arepa", stock_quantity=1)
        open_cash_session(setup, owner)
        setup.commit()
        ids = business.id, owner.id, product.id

    outcome: dict[str, object] = {}

    def sell_last_unit() -> None:
        with Session(db_engine) as db:
            user = db.get(User, ids[1])
            assert user is not None
            data = OrderCreate.model_validate(
                {"items": [{"product_id": str(ids[2]), "quantity": 1}]}
            )
            try:
                orders.create_order(db, user, data)
                outcome["result"] = "sold"
            except BusinessRuleError as error:
                outcome["result"] = error.message

    try:
        with Session(db_engine) as other:
            # Outra venda em andamento já levou a última unidade.
            other.execute(select(Product).where(Product.id == ids[2]).with_for_update())
            other.execute(
                update(Product).where(Product.id == ids[2]).values(stock_quantity=0)
            )

            seller = threading.Thread(target=sell_last_unit)
            seller.start()
            time.sleep(0.5)
            assert seller.is_alive(), "a venda deveria esperar o bloqueio do produto"
            other.commit()
            seller.join(timeout=10)

        assert outcome["result"] == "Estoque insuficiente: Arepa (disponível: 0)."
    finally:
        with Session(db_engine) as cleanup:
            business_id, owner_id, _ = ids
            cleanup.execute(
                delete(StockMovement).where(StockMovement.business_id == business_id)
            )
            order_ids = select(Order.id).where(Order.business_id == business_id)
            cleanup.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
            cleanup.execute(delete(Order).where(Order.business_id == business_id))
            cleanup.execute(
                delete(CashSession).where(CashSession.business_id == business_id)
            )
            cleanup.execute(delete(Product).where(Product.business_id == business_id))
            cleanup.execute(delete(UserSession).where(UserSession.user_id == owner_id))
            cleanup.execute(delete(User).where(User.business_id == business_id))
            cleanup.execute(delete(Business).where(Business.id == business_id))
            cleanup.commit()
