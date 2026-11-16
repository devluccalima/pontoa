import logging

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.core.logging_config import RequestIdFilter

SECRET_INPUT = "senha-super-secreta"


class ItemIn(BaseModel):
    name: str
    quantity: int = Field(gt=0)


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Cliente com rotas que existem apenas nos testes."""
    router = APIRouter(prefix="/test")

    @router.post("/items")
    async def create_item(item: ItemIn) -> ItemIn:
        return item

    @router.get("/not-found")
    async def raise_not_found() -> None:
        raise NotFoundError()

    @router.get("/conflict")
    async def raise_conflict() -> None:
        raise BusinessRuleError("O caixa já está fechado.")

    @router.get("/boom")
    async def raise_unexpected() -> None:
        raise RuntimeError(SECRET_INPUT)

    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


def assert_error_envelope(body: dict, code: str) -> None:
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "details"}
    assert body["error"]["code"] == code


def test_unknown_route_returns_404_envelope(client: TestClient) -> None:
    response = client.get("/api/v1/nao-existe")

    assert response.status_code == 404
    assert_error_envelope(response.json(), "not_found")


def test_wrong_method_keeps_allow_header(client: TestClient) -> None:
    response = client.post("/health")

    assert response.status_code == 405
    assert response.headers["allow"] == "GET"
    assert_error_envelope(response.json(), "method_not_allowed")


def test_validation_error_lists_fields_without_echoing_input(
    client: TestClient,
) -> None:
    response = client.post("/test/items", json={"name": SECRET_INPUT, "quantity": 0})

    body = response.json()
    assert response.status_code == 422
    assert_error_envelope(body, "validation_error")
    assert body["error"]["details"] == [
        {
            "field": "body.quantity",
            "message": "Input should be greater than 0",
            "type": "greater_than",
        }
    ]
    assert SECRET_INPUT not in response.text


def test_not_found_error_maps_to_404(client: TestClient) -> None:
    response = client.get("/test/not-found")

    assert response.status_code == 404
    assert_error_envelope(response.json(), "not_found")


def test_business_rule_error_maps_to_409(client: TestClient) -> None:
    response = client.get("/test/conflict")

    assert response.status_code == 409
    assert_error_envelope(response.json(), "business_rule_violation")
    assert response.json()["error"]["message"] == "O caixa já está fechado."


def test_unhandled_error_is_logged_but_hidden_from_client(
    client: TestClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.handler.addFilter(RequestIdFilter())

    response = client.get("/test/boom")

    assert response.status_code == 500
    assert_error_envelope(response.json(), "internal_error")
    assert SECRET_INPUT not in response.text
    assert "Traceback" not in response.text

    error_logs = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert len(error_logs) == 1
    assert error_logs[0].exc_info is not None
    assert error_logs[0].request_id == response.headers["x-request-id"]
