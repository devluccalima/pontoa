from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.security import hash_session_token
from app.modules.auth.models import UserSession
from app.modules.users.models import UserRole
from tests.factories import (
    DEFAULT_PASSWORD,
    auth_headers,
    create_business,
    create_user,
    login,
)

LOGIN_URL = "/api/v1/auth/login"
ME_URL = "/api/v1/auth/me"
LOGOUT_URL = "/api/v1/auth/logout"


def test_login_returns_token_user_and_business(
    db_client: TestClient, db_session: Session
) -> None:
    business = create_business(db_session, name="Arepas da Feira")
    user = create_user(db_session, business, role=UserRole.OWNER)

    response = db_client.post(
        LOGIN_URL, json={"email": user.email, "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == user.email
    assert body["user"]["role"] == "owner"
    assert body["business"]["name"] == "Arepas da Feira"
    assert "password_hash" not in body["user"]
    expires_at = datetime.fromisoformat(body["expires_at"])
    assert timedelta(hours=11) < expires_at - datetime.now(UTC) <= timedelta(hours=12)


def test_login_ignores_email_case_and_spaces(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))

    response = db_client.post(
        LOGIN_URL,
        json={"email": f"  {user.email.upper()} ", "password": DEFAULT_PASSWORD},
    )

    assert response.status_code == 200


def test_session_token_is_stored_only_as_hash(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))

    token = login(db_client, user)

    stored = db_session.scalar(select(UserSession.token_hash))
    assert stored == hash_session_token(token)
    assert stored != token


def test_login_failures_are_indistinguishable(
    db_client: TestClient, db_session: Session
) -> None:
    business = create_business(db_session)
    user = create_user(db_session, business)
    inactive = create_user(db_session, business, active=False)

    attempts = [
        {"email": user.email, "password": "senha-errada"},
        {"email": "ninguem@example.com", "password": DEFAULT_PASSWORD},
        {"email": inactive.email, "password": DEFAULT_PASSWORD},
    ]
    responses = [db_client.post(LOGIN_URL, json=attempt) for attempt in attempts]

    assert {response.status_code for response in responses} == {401}
    assert len({response.text for response in responses}) == 1
    assert responses[0].json()["error"]["message"] == "E-mail ou senha inválidos."
    assert responses[0].headers["www-authenticate"] == "Bearer"


def test_login_is_refused_when_business_is_inactive(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session, active=False))

    response = db_client.post(
        LOGIN_URL, json={"email": user.email, "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 401


def test_me_returns_current_user(db_client: TestClient, db_session: Session) -> None:
    user = create_user(db_session, create_business(db_session))
    token = login(db_client, user)

    response = db_client.get(ME_URL, headers=auth_headers(token))

    assert response.status_code == 200
    assert response.json()["user"]["id"] == str(user.id)


def test_protected_route_requires_token(db_client: TestClient) -> None:
    response = db_client.get(ME_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_protected_route_rejects_unknown_token(db_client: TestClient) -> None:
    response = db_client.get(ME_URL, headers=auth_headers("token-inventado"))

    assert response.status_code == 401


def test_expired_session_is_rejected(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))
    token = login(db_client, user)
    db_session.execute(
        update(UserSession).values(expires_at=func.now() - timedelta(seconds=1))
    )

    response = db_client.get(ME_URL, headers=auth_headers(token))

    assert response.status_code == 401


def test_logout_revokes_only_the_current_session(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))
    tablet, phone = login(db_client, user), login(db_client, user)

    response = db_client.post(LOGOUT_URL, headers=auth_headers(tablet))

    assert response.status_code == 204
    assert db_client.get(ME_URL, headers=auth_headers(tablet)).status_code == 401
    assert db_client.get(ME_URL, headers=auth_headers(phone)).status_code == 200


def test_deactivated_user_loses_access_immediately(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))
    token = login(db_client, user)

    user.active = False
    db_session.flush()

    assert db_client.get(ME_URL, headers=auth_headers(token)).status_code == 401


def test_login_cleans_up_expired_sessions(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))
    login(db_client, user)
    db_session.execute(
        update(UserSession).values(expires_at=func.now() - timedelta(seconds=1))
    )

    login(db_client, user)

    assert db_session.scalar(select(func.count(UserSession.id))) == 1


def test_deactivated_business_loses_access_immediately(
    db_client: TestClient, db_session: Session
) -> None:
    user = create_user(db_session, create_business(db_session))
    token = login(db_client, user)

    user.business.active = False
    db_session.flush()

    assert db_client.get(ME_URL, headers=auth_headers(token)).status_code == 401
