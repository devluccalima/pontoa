import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.models import User, UserRole
from tests.factories import (
    DEFAULT_PASSWORD,
    auth_headers,
    create_business,
    create_user,
    login,
)

USERS_URL = "/api/v1/users"


def owner_headers(client: TestClient, db: Session) -> tuple[dict[str, str], User]:
    owner = create_user(db, create_business(db), role=UserRole.OWNER)
    return auth_headers(login(client, owner)), owner


def test_owner_creates_operator(db_client: TestClient, db_session: Session) -> None:
    headers, owner = owner_headers(db_client, db_session)

    response = db_client.post(
        USERS_URL,
        headers=headers,
        json={
            "name": "Maria",
            "email": "Maria@Example.com",
            "password": "senha-da-maria",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "maria@example.com"
    assert body["role"] == "operator"
    assert "password" not in body and "password_hash" not in body
    created = db_session.get(User, uuid.UUID(body["id"]))
    assert created is not None
    assert created.business_id == owner.business_id
    assert created.password_hash.startswith("$argon2id$")


def test_new_user_can_log_in(db_client: TestClient, db_session: Session) -> None:
    headers, _ = owner_headers(db_client, db_session)
    db_client.post(
        USERS_URL,
        headers=headers,
        json={"name": "Maria", "email": "maria@example.com", "password": "senha-123"},
    )

    response = db_client.post(
        "/api/v1/auth/login",
        json={"email": "maria@example.com", "password": "senha-123"},
    )

    assert response.status_code == 200


def test_duplicate_email_is_rejected(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)

    response = db_client.post(
        USERS_URL,
        headers=headers,
        json={"name": "Outro", "email": owner.email.upper(), "password": "senha-123"},
    )

    assert response.status_code == 409


def test_short_password_is_rejected(db_client: TestClient, db_session: Session) -> None:
    headers, _ = owner_headers(db_client, db_session)

    response = db_client.post(
        USERS_URL,
        headers=headers,
        json={"name": "Maria", "email": "maria@example.com", "password": "123"},
    )

    assert response.status_code == 422
    assert "123" not in response.text


def test_operator_cannot_manage_users(
    db_client: TestClient, db_session: Session
) -> None:
    operator = create_user(db_session, create_business(db_session))
    headers = auth_headers(login(db_client, operator))

    assert db_client.get(USERS_URL, headers=headers).status_code == 403
    response = db_client.post(
        USERS_URL,
        headers=headers,
        json={"name": "X", "email": "x@example.com", "password": "senha-123"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_list_shows_only_users_from_own_business(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)
    colleague = create_user(db_session, owner.business)
    stranger = create_user(db_session, create_business(db_session))

    response = db_client.get(USERS_URL, headers=headers)

    ids = {user["id"] for user in response.json()}
    assert ids == {str(owner.id), str(colleague.id)}
    assert str(stranger.id) not in ids


def test_user_from_other_business_is_not_found(
    db_client: TestClient, db_session: Session
) -> None:
    headers, _ = owner_headers(db_client, db_session)
    stranger = create_user(db_session, create_business(db_session))

    get_response = db_client.get(f"{USERS_URL}/{stranger.id}", headers=headers)
    patch_response = db_client.patch(
        f"{USERS_URL}/{stranger.id}", headers=headers, json={"active": False}
    )

    assert get_response.status_code == 404
    assert patch_response.status_code == 404
    db_session.refresh(stranger)
    assert stranger.active is True


def test_deactivating_user_ends_their_sessions(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)
    operator = create_user(db_session, owner.business)
    operator_token = login(db_client, operator)

    response = db_client.patch(
        f"{USERS_URL}/{operator.id}", headers=headers, json={"active": False}
    )

    assert response.status_code == 200
    me = db_client.get("/api/v1/auth/me", headers=auth_headers(operator_token))
    assert me.status_code == 401


def test_password_change_ends_sessions_and_accepts_new_password(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)
    operator = create_user(db_session, owner.business)
    old_token = login(db_client, operator)

    db_client.patch(
        f"{USERS_URL}/{operator.id}",
        headers=headers,
        json={"password": "senha-nova-456"},
    )

    me = db_client.get("/api/v1/auth/me", headers=auth_headers(old_token))
    assert me.status_code == 401
    login(db_client, operator, password="senha-nova-456")
    old_login = db_client.post(
        "/api/v1/auth/login",
        json={"email": operator.email, "password": DEFAULT_PASSWORD},
    )
    assert old_login.status_code == 401


def test_last_active_owner_cannot_be_demoted_or_deactivated(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)
    url = f"{USERS_URL}/{owner.id}"

    demote = db_client.patch(url, headers=headers, json={"role": "operator"})
    deactivate = db_client.patch(url, headers=headers, json={"active": False})

    assert demote.status_code == 409
    assert deactivate.status_code == 409


def test_owner_can_step_down_when_another_owner_exists(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)
    create_user(db_session, owner.business, role=UserRole.OWNER)

    response = db_client.patch(
        f"{USERS_URL}/{owner.id}", headers=headers, json={"role": "operator"}
    )

    assert response.status_code == 200
    assert response.json()["role"] == "operator"


def test_inactive_owner_can_be_demoted(
    db_client: TestClient, db_session: Session
) -> None:
    headers, owner = owner_headers(db_client, db_session)
    former = create_user(db_session, owner.business, role=UserRole.OWNER, active=False)

    response = db_client.patch(
        f"{USERS_URL}/{former.id}", headers=headers, json={"role": "operator"}
    )

    assert response.status_code == 200


def test_unknown_role_is_rejected(db_client: TestClient, db_session: Session) -> None:
    headers, owner = owner_headers(db_client, db_session)

    response = db_client.patch(
        f"{USERS_URL}/{owner.id}", headers=headers, json={"role": "admin"}
    )

    assert response.status_code == 422
