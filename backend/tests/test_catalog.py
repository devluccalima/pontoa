from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.businesses.models import Business
from app.modules.catalog.models import Category, Product
from app.modules.users.models import UserRole
from tests.factories import auth_headers, create_business, create_user, login

CATEGORIES_URL = "/api/v1/categories"
PRODUCTS_URL = "/api/v1/products"


@pytest.fixture
def business(db_session: Session) -> Business:
    return create_business(db_session)


@pytest.fixture
def owner_auth(
    db_client: TestClient, db_session: Session, business: Business
) -> dict[str, str]:
    owner = create_user(db_session, business, role=UserRole.OWNER)
    return auth_headers(login(db_client, owner))


@pytest.fixture
def operator_auth(
    db_client: TestClient, db_session: Session, business: Business
) -> dict[str, str]:
    operator = create_user(db_session, business)
    return auth_headers(login(db_client, operator))


def add_category(db: Session, business: Business, **values: object) -> Category:
    category = Category(business_id=business.id, **{"name": "Arepas", **values})
    db.add(category)
    db.flush()
    return category


def add_product(db: Session, business: Business, **values: object) -> Product:
    product = Product(
        business_id=business.id,
        **{"name": "Arepa de queijo", "price": Decimal("18.00"), **values},
    )
    db.add(product)
    db.flush()
    return product


def test_owner_creates_category_and_product(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    category = db_client.post(
        CATEGORIES_URL, headers=owner_auth, json={"name": "  Arepas  "}
    )
    assert category.status_code == 201
    assert category.json()["name"] == "Arepas"

    product = db_client.post(
        PRODUCTS_URL,
        headers=owner_auth,
        json={
            "name": "Arepa de queijo",
            "price": "18.50",
            "category_id": category.json()["id"],
        },
    )

    assert product.status_code == 201
    body = product.json()
    assert body["price"] == "18.50"
    assert body["category_id"] == category.json()["id"]
    assert body["active"] is True


def test_price_keeps_cents_exactly(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    response = db_client.post(
        PRODUCTS_URL, headers=owner_auth, json={"name": "Suco", "price": 0.1}
    )

    assert response.json()["price"] == "0.10"


@pytest.mark.parametrize("price", ["-1", "1.234", "100000000.00", "abc"])
def test_invalid_prices_are_rejected(
    db_client: TestClient, owner_auth: dict[str, str], price: str
) -> None:
    response = db_client.post(
        PRODUCTS_URL, headers=owner_auth, json={"name": "Suco", "price": price}
    )

    assert response.status_code == 422


def test_names_are_unique_per_business_ignoring_case(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    add_category(db_session, business, name="Bebidas")
    add_product(db_session, business, name="Suco")
    add_product(db_session, create_business(db_session), name="Pastel")

    category = db_client.post(
        CATEGORIES_URL, headers=owner_auth, json={"name": "BEBIDAS"}
    )
    product = db_client.post(
        PRODUCTS_URL, headers=owner_auth, json={"name": "suco", "price": "5"}
    )
    other_business_name = db_client.post(
        PRODUCTS_URL, headers=owner_auth, json={"name": "Pastel", "price": "9"}
    )

    assert category.status_code == 409
    assert product.status_code == 409
    assert other_business_name.status_code == 201


def test_renaming_to_own_name_is_allowed(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    product = add_product(db_session, business, name="Suco")

    response = db_client.patch(
        f"{PRODUCTS_URL}/{product.id}", headers=owner_auth, json={"name": "SUCO"}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "SUCO"


def test_operator_reads_but_cannot_change_catalog(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    operator_auth: dict[str, str],
) -> None:
    product = add_product(db_session, business)

    assert db_client.get(PRODUCTS_URL, headers=operator_auth).status_code == 200
    assert db_client.get(CATEGORIES_URL, headers=operator_auth).status_code == 200
    changes = [
        db_client.post(CATEGORIES_URL, headers=operator_auth, json={"name": "X"}),
        db_client.post(
            PRODUCTS_URL, headers=operator_auth, json={"name": "X", "price": "1"}
        ),
        db_client.patch(
            f"{PRODUCTS_URL}/{product.id}", headers=operator_auth, json={"price": "1"}
        ),
    ]
    assert {response.status_code for response in changes} == {403}


def test_catalog_requires_login(db_client: TestClient) -> None:
    assert db_client.get(PRODUCTS_URL).status_code == 401


def test_listing_is_ordered_filtered_and_isolated(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    drinks = add_category(db_session, business, name="Bebidas")
    add_product(db_session, business, name="Suco", position=2, category_id=drinks.id)
    add_product(db_session, business, name="Água", position=1, category_id=drinks.id)
    add_product(db_session, business, name="Arepa", position=1)
    add_product(db_session, business, name="Antiga", active=False)
    add_product(db_session, create_business(db_session), name="Pastel")

    everything = db_client.get(PRODUCTS_URL, headers=owner_auth).json()
    active = db_client.get(
        PRODUCTS_URL, headers=owner_auth, params={"active": "true"}
    ).json()
    in_drinks = db_client.get(
        PRODUCTS_URL, headers=owner_auth, params={"category_id": str(drinks.id)}
    ).json()

    assert [p["name"] for p in everything] == ["Antiga", "Água", "Arepa", "Suco"]
    assert "Antiga" not in [p["name"] for p in active]
    assert [p["name"] for p in in_drinks] == ["Água", "Suco"]


def test_records_from_other_business_are_not_found(
    db_client: TestClient, db_session: Session, owner_auth: dict[str, str]
) -> None:
    stranger = create_business(db_session)
    product = add_product(db_session, stranger)
    category = add_category(db_session, stranger)

    responses = [
        db_client.get(f"{PRODUCTS_URL}/{product.id}", headers=owner_auth),
        db_client.patch(
            f"{PRODUCTS_URL}/{product.id}", headers=owner_auth, json={"price": "1"}
        ),
        db_client.patch(
            f"{CATEGORIES_URL}/{category.id}", headers=owner_auth, json={"name": "X"}
        ),
    ]

    assert {response.status_code for response in responses} == {404}
    db_session.refresh(product)
    assert product.price == Decimal("18.00")


def test_product_cannot_use_category_from_other_business(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    foreign = add_category(db_session, create_business(db_session))
    product = add_product(db_session, business)

    created = db_client.post(
        PRODUCTS_URL,
        headers=owner_auth,
        json={"name": "Novo", "price": "1", "category_id": str(foreign.id)},
    )
    moved = db_client.patch(
        f"{PRODUCTS_URL}/{product.id}",
        headers=owner_auth,
        json={"category_id": str(foreign.id)},
    )

    assert created.status_code == 404
    assert moved.status_code == 404


def test_product_update_changes_price_and_clears_category(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    category = add_category(db_session, business)
    product = add_product(db_session, business, category_id=category.id)

    response = db_client.patch(
        f"{PRODUCTS_URL}/{product.id}",
        headers=owner_auth,
        json={"price": "20.00", "category_id": None, "active": False},
    )

    body = response.json()
    assert body["price"] == "20.00"
    assert body["category_id"] is None
    assert body["active"] is False


def test_required_fields_cannot_be_set_to_null(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    product = add_product(db_session, business)

    response = db_client.patch(
        f"{PRODUCTS_URL}/{product.id}", headers=owner_auth, json={"price": None}
    )

    assert response.status_code == 422


def test_database_rejects_negative_price(
    db_session: Session, business: Business
) -> None:
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError, match="ck_products_price_not_negative"):
        add_product(db_session, business, price=Decimal("-1"))
