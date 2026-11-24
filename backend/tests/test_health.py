from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_returns_503_when_database_is_unreachable(
    client: TestClient,
) -> None:
    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "service_unavailable"
    assert "segredo" not in response.text
