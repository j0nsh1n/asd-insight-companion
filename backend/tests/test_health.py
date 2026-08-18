import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VITE_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
)


def test_health_returns_ok() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "asd-insight-companion"
    assert "version" in body


@pytest.mark.parametrize("origin", VITE_ORIGINS)
def test_health_cors_allows_vite_origin(origin: str) -> None:
    response = client.get(
        "/api/v1/health",
        headers={"Origin": origin},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers.get("access-control-allow-origin") == origin


@pytest.mark.parametrize("origin", VITE_ORIGINS)
def test_health_cors_preflight_options(origin: str) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code in (200, 204)
    assert response.headers.get("access-control-allow-origin") == origin
    allow_methods = response.headers.get("access-control-allow-methods", "")
    assert "GET" in allow_methods.upper()


def test_root_returns_service_info() -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "asd-insight-companion"
    assert body["health"] == "/api/v1/health"


def test_health_sets_security_headers() -> None:
    response = client.get("/api/v1/health")
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "no-referrer"
    assert response.headers.get("cache-control") == "no-store"


def test_docs_hidden_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    from app.core.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    with TestClient(create_app()) as prod_client:
        assert prod_client.get("/docs").status_code == 404
        assert prod_client.get("/openapi.json").status_code == 404
    get_settings.cache_clear()
