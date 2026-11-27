from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.models import UserRole
from tests.factories import auth_headers, create_business, create_user, login

BUSINESS_URL = "/api/v1/business"


def test_user_sees_own_business(db_client: TestClient, db_session: Session) -> None:
    business = create_business(db_session, name="Arepas da Feira")
    operator = create_user(db_session, business)

    response = db_client.get(
        BUSINESS_URL, headers=auth_headers(login(db_client, operator))
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(business.id),
        "name": "Arepas da Feira",
        "timezone": "America/Sao_Paulo",
    }


def test_owner_updates_business(db_client: TestClient, db_session: Session) -> None:
    owner = create_user(db_session, create_business(db_session), role=UserRole.OWNER)

    response = db_client.patch(
        BUSINESS_URL,
        headers=auth_headers(login(db_client, owner)),
        json={"name": "Arepas do Lucca", "timezone": "America/Manaus"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Arepas do Lucca"
    assert response.json()["timezone"] == "America/Manaus"


def test_business_name_is_trimmed_and_cannot_be_blank(
    db_client: TestClient, db_session: Session
) -> None:
    owner = create_user(db_session, create_business(db_session), role=UserRole.OWNER)
    headers = auth_headers(login(db_client, owner))

    trimmed = db_client.patch(
        BUSINESS_URL, headers=headers, json={"name": "  Arepas  "}
    )
    blank = db_client.patch(BUSINESS_URL, headers=headers, json={"name": "   "})

    assert trimmed.json()["name"] == "Arepas"
    assert blank.status_code == 422


def test_unknown_timezone_is_rejected(
    db_client: TestClient, db_session: Session
) -> None:
    owner = create_user(db_session, create_business(db_session), role=UserRole.OWNER)

    response = db_client.patch(
        BUSINESS_URL,
        headers=auth_headers(login(db_client, owner)),
        json={"timezone": "Brasil/Feira"},
    )

    assert response.status_code == 422


def test_operator_cannot_update_business(
    db_client: TestClient, db_session: Session
) -> None:
    operator = create_user(db_session, create_business(db_session))

    response = db_client.patch(
        BUSINESS_URL,
        headers=auth_headers(login(db_client, operator)),
        json={"name": "Outro nome"},
    )

    assert response.status_code == 403
