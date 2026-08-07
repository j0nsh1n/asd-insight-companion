from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "asd-insight-companion"
    assert "version" in body


def test_health_cors_allows_vite_origin() -> None:
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://127.0.0.1:5173"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"


def test_root_returns_service_info() -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "asd-insight-companion"
    assert body["health"] == "/api/v1/health"
