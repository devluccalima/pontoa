from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashSession
from app.modules.users.models import User, UserRole
from tests.factories import auth_headers, create_business, create_user, login

URL = "/api/v1/cash-sessions"


@pytest.fixture
def business(db_session: Session) -> Business:
    return create_business(db_session)


@pytest.fixture
def owner(db_session: Session, business: Business) -> User:
    return create_user(db_session, business, role=UserRole.OWNER)


@pytest.fixture
def owner_auth(db_client: TestClient, owner: User) -> dict[str, str]:
    return auth_headers(login(db_client, owner))


def open_cash(
    client: TestClient, headers: dict[str, str], amount: str = "50.00"
) -> dict:
    response = client.post(URL, headers=headers, json={"opening_amount": amount})
    assert response.status_code == 201, response.text
    return response.json()


def move(
    client: TestClient, headers: dict[str, str], kind: str, amount: str
) -> TestClient:
    return client.post(
        f"{URL}/current/movements",
        headers=headers,
        json={"kind": kind, "amount": amount, "description": "Troco"},
    )


def test_no_open_cash_session_at_start(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    response = db_client.get(f"{URL}/current", headers=owner_auth)

    assert response.status_code == 200
    assert response.json() == {"session": None}


def test_owner_opens_cash_session(
    db_client: TestClient, owner: User, owner_auth: dict[str, str]
) -> None:
    session = open_cash(db_client, owner_auth, "50.00")

    assert session["is_open"] is True
    assert session["opened_by_id"] == str(owner.id)
    assert session["summary"] == {
        "opening_amount": "50.00",
        "deposits": "0.00",
        "withdrawals": "0.00",
        "cash_payments": "0.00",
        "expected_amount": "50.00",
    }
    current = db_client.get(f"{URL}/current", headers=owner_auth).json()
    assert current["session"]["id"] == session["id"]


def test_only_one_open_cash_session_per_business(
    db_client: TestClient, db_session: Session, owner_auth: dict[str, str]
) -> None:
    open_cash(db_client, owner_auth)
    other_owner = create_user(
        db_session, create_business(db_session), role=UserRole.OWNER
    )

    second = db_client.post(URL, headers=owner_auth, json={"opening_amount": "0"})
    other_business = db_client.post(
        URL,
        headers=auth_headers(login(db_client, other_owner)),
        json={"opening_amount": "0"},
    )

    assert second.status_code == 409
    assert other_business.status_code == 201


def test_database_enforces_single_open_session(
    db_session: Session, business: Business, owner: User
) -> None:
    for _ in range(2):
        db_session.add(
            CashSession(
                business_id=business.id,
                opened_by_id=owner.id,
                opening_amount=Decimal("0"),
            )
        )

    with pytest.raises(IntegrityError, match="uq_cash_sessions_business_id_open"):
        db_session.flush()


def test_movements_change_expected_amount(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    open_cash(db_client, owner_auth, "50.00")

    assert move(db_client, owner_auth, "deposit", "30.00").status_code == 201
    assert move(db_client, owner_auth, "withdrawal", "20.50").status_code == 201

    summary = db_client.get(f"{URL}/current", headers=owner_auth).json()["session"][
        "summary"
    ]
    assert summary == {
        "opening_amount": "50.00",
        "deposits": "30.00",
        "withdrawals": "20.50",
        "cash_payments": "0.00",
        "expected_amount": "59.50",
    }


def test_withdrawal_cannot_exceed_cash_in_drawer(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    open_cash(db_client, owner_auth, "50.00")

    response = move(db_client, owner_auth, "withdrawal", "50.01")

    assert response.status_code == 409
    assert "R$ 50.00" in response.json()["error"]["message"]


@pytest.mark.parametrize("amount", ["0", "-5"])
def test_movement_amount_must_be_positive(
    db_client: TestClient, owner_auth: dict[str, str], amount: str
) -> None:
    open_cash(db_client, owner_auth)

    assert move(db_client, owner_auth, "deposit", amount).status_code == 422


def test_movements_require_open_cash_session(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    response = move(db_client, owner_auth, "deposit", "10")

    assert response.status_code == 409
    assert "caixa está fechado" in response.json()["error"]["message"]


def test_close_records_count_and_difference(
    db_client: TestClient, owner: User, owner_auth: dict[str, str]
) -> None:
    open_cash(db_client, owner_auth, "50.00")
    move(db_client, owner_auth, "deposit", "10.00")

    response = db_client.post(
        f"{URL}/current/close",
        headers=owner_auth,
        json={"counted_amount": "58.00", "notes": "Faltou troco"},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["is_open"] is False
    assert body["closed_by_id"] == str(owner.id)
    assert body["counted_amount"] == "58.00"
    assert body["summary"]["expected_amount"] == "60.00"
    assert body["difference"] == "-2.00"
    assert body["closing_notes"] == "Faltou troco"
    assert db_client.get(f"{URL}/current", headers=owner_auth).json() == {
        "session": None
    }


def test_closing_requires_open_cash_session(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    response = db_client.post(
        f"{URL}/current/close", headers=owner_auth, json={"counted_amount": "0"}
    )

    assert response.status_code == 409


def test_cash_can_be_reopened_after_closing(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    first = open_cash(db_client, owner_auth)
    db_client.post(
        f"{URL}/current/close", headers=owner_auth, json={"counted_amount": "50"}
    )

    second = open_cash(db_client, owner_auth, "0")

    history = db_client.get(URL, headers=owner_auth).json()
    assert [session["id"] for session in history] == [second["id"], first["id"]]


def test_history_and_movements_are_isolated_by_business(
    db_client: TestClient, db_session: Session, owner_auth: dict[str, str]
) -> None:
    other_owner = create_user(
        db_session, create_business(db_session), role=UserRole.OWNER
    )
    other_session = open_cash(db_client, auth_headers(login(db_client, other_owner)))

    assert db_client.get(URL, headers=owner_auth).json() == []
    responses = [
        db_client.get(f"{URL}/{other_session['id']}", headers=owner_auth),
        db_client.get(f"{URL}/{other_session['id']}/movements", headers=owner_auth),
    ]
    assert {response.status_code for response in responses} == {404}


def test_session_movements_are_listed_in_order(
    db_client: TestClient, owner_auth: dict[str, str]
) -> None:
    session = open_cash(db_client, owner_auth)
    move(db_client, owner_auth, "deposit", "10")
    move(db_client, owner_auth, "withdrawal", "5")

    response = db_client.get(f"{URL}/{session['id']}/movements", headers=owner_auth)

    assert [item["kind"] for item in response.json()] == ["deposit", "withdrawal"]


def test_operator_sees_cash_state_but_cannot_operate_it(
    db_client: TestClient,
    db_session: Session,
    business: Business,
    owner_auth: dict[str, str],
) -> None:
    open_cash(db_client, owner_auth)
    operator_auth = auth_headers(login(db_client, create_user(db_session, business)))

    current = db_client.get(f"{URL}/current", headers=operator_auth)
    changes = [
        move(db_client, operator_auth, "withdrawal", "1"),
        db_client.post(
            f"{URL}/current/close", headers=operator_auth, json={"counted_amount": "0"}
        ),
        db_client.get(URL, headers=operator_auth),
    ]

    assert current.status_code == 200
    assert current.json()["session"] is not None
    assert {response.status_code for response in changes} == {403}
