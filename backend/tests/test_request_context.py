import logging

import pytest
from fastapi.testclient import TestClient


def test_each_response_has_unique_request_id(client: TestClient) -> None:
    first = client.get("/health").headers["x-request-id"]
    second = client.get("/health").headers["x-request-id"]

    assert len(first) == 32
    assert first != second


def test_client_supplied_request_id_is_ignored(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "injetado"})

    assert response.headers["x-request-id"] != "injetado"


def test_cors_allows_only_configured_origins(client: TestClient) -> None:
    allowed = client.get("/health", headers={"Origin": "http://localhost:5173"})
    blocked = client.get("/health", headers={"Origin": "http://site-malicioso.com"})

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in blocked.headers


def test_cors_exposes_request_id_to_browser(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})

    exposed = response.headers["access-control-expose-headers"].lower()
    assert "x-request-id" in exposed


def test_access_log_level_depends_on_path_and_status(
    client: TestClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG, logger="app.core.request_context")

    client.get("/health")
    client.post("/health")
    client.get("/api/v1/nao-existe")

    access_logs = [
        (record.args[1], record.args[2], record.levelno)
        for record in caplog.records
        if record.name == "app.core.request_context"
    ]
    assert access_logs == [
        ("/health", 200, logging.DEBUG),
        ("/health", 405, logging.INFO),
        ("/api/v1/nao-existe", 404, logging.INFO),
    ]
