"""Phase 7: generic 500s must not swallow known HTTP errors."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from tests.test_assessment import FULL_CONSENT
from tests.test_sessions import _create


def test_unhandled_exception_returns_generic_internal_error(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "err.db"))
    get_settings.cache_clear()
    test_app = create_app()

    @test_app.get("/__test_unhandled")
    def _boom() -> None:
        raise RuntimeError("secret boom traceback SELECT * FROM sessions")

    with TestClient(test_app, raise_server_exceptions=False) as client:
        response = client.get("/__test_unhandled")

    get_settings.cache_clear()
    assert response.status_code == 500
    assert response.json() == {"detail": "internal_error"}
    blob = json.dumps(response.json()).lower() + response.text.lower()
    assert "boom" not in blob
    assert "traceback" not in blob
    assert "select * from" not in blob
    assert "sessions" not in blob


def test_http_errors_are_not_converted_to_500(client: TestClient) -> None:
    missing = "00000000-0000-0000-0000-000000000000"
    not_found = client.get(f"/api/v1/results/{missing}")
    assert not_found.status_code == 404
    assert not_found.json()["detail"] == "session_not_found"

    created = _create(client)
    sid = created["id"]
    forbidden = client.get(f"/api/v1/results/{sid}")
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "consent_required"

    invalid = client.post(
        f"/api/v1/sessions/{sid}/consent",
        json={"research_only": True},
    )
    assert invalid.status_code == 422
    assert invalid.status_code != 500

    assert (
        client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT).status_code
        == 200
    )
    conflict = client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT)
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == "consent_already_recorded"
