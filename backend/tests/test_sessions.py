"""Phase 1: anonymous sessions, consent fail-closed, intake gates, resume."""

from __future__ import annotations

from fastapi.testclient import TestClient

FULL_CONSENT = {
    "research_only": True,
    "no_diagnosis": True,
    "data_minimization": True,
}

INTAKE = {
    "age_range": "25-34",
    "language": "en",
    "accessibility_prefs": {
        "large_text": True,
        "reduced_motion": False,
        "screen_reader_hints": False,
    },
    "optional_context": "self-referred research interest",
}


def _create(client: TestClient) -> dict:
    response = client.post("/api/v1/sessions")
    assert response.status_code == 201
    body = response.json()
    assert body["stage"] == "created"
    assert body["id"]
    return body


def test_create_session_anonymous(client: TestClient) -> None:
    body = _create(client)
    assert body["consent"]["research_only"] is False
    assert body["consent"]["consented_at"] is None
    assert body["intake"] is None


def test_no_consent_blocks_intake(client: TestClient) -> None:
    session = _create(client)
    response = client.post(f"/api/v1/sessions/{session['id']}/intake", json=INTAKE)
    assert response.status_code == 403
    assert response.json()["detail"] == "consent_required"
    # Stage unchanged
    got = client.get(f"/api/v1/sessions/{session['id']}")
    assert got.status_code == 200
    assert got.json()["stage"] == "created"


def test_incomplete_consent_rejected(client: TestClient) -> None:
    session = _create(client)
    incomplete = {
        "research_only": True,
        "no_diagnosis": True,
        "data_minimization": False,
    }
    response = client.post(
        f"/api/v1/sessions/{session['id']}/consent",
        json=incomplete,
    )
    assert response.status_code == 422
    got = client.get(f"/api/v1/sessions/{session['id']}")
    assert got.json()["stage"] == "created"
    assert got.json()["consent"]["research_only"] is False


def test_missing_consent_fields_rejected(client: TestClient) -> None:
    session = _create(client)
    response = client.post(
        f"/api/v1/sessions/{session['id']}/consent",
        json={"research_only": True},
    )
    assert response.status_code == 422
    assert client.get(f"/api/v1/sessions/{session['id']}").json()["stage"] == "created"


def test_invalid_session_safe_error(client: TestClient) -> None:
    missing = "00000000-0000-0000-0000-000000000000"
    for method, path, kwargs in (
        ("get", f"/api/v1/sessions/{missing}", {}),
        ("post", f"/api/v1/sessions/{missing}/consent", {"json": FULL_CONSENT}),
        ("post", f"/api/v1/sessions/{missing}/intake", {"json": INTAKE}),
    ):
        response = getattr(client, method)(path, **kwargs)
        assert response.status_code == 404, path
        body = response.json()
        assert body["detail"] == "session_not_found"
        assert "Traceback" not in str(body)


def test_resume_after_consent_and_intake(client: TestClient) -> None:
    session = _create(client)
    sid = session["id"]

    consented = client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT)
    assert consented.status_code == 200
    body = consented.json()
    assert body["stage"] == "consented"
    assert body["consent"]["research_only"] is True
    assert body["consent"]["no_diagnosis"] is True
    assert body["consent"]["data_minimization"] is True
    assert body["consent"]["consented_at"]

    resumed = client.get(f"/api/v1/sessions/{sid}")
    assert resumed.status_code == 200
    assert resumed.json()["stage"] == "consented"

    intake = client.post(f"/api/v1/sessions/{sid}/intake", json=INTAKE)
    assert intake.status_code == 200
    done = intake.json()
    assert done["stage"] == "intake_complete"
    assert done["intake"]["age_range"] == "25-34"
    assert done["intake"]["language"] == "en"
    assert done["intake"]["accessibility_prefs"]["large_text"] is True
    assert done["intake"]["optional_context"] == "self-referred research interest"

    final = client.get(f"/api/v1/sessions/{sid}")
    assert final.status_code == 200
    assert final.json()["stage"] == "intake_complete"
    assert final.json()["intake"]["age_range"] == "25-34"


def test_double_consent_returns_409(client: TestClient) -> None:
    session = _create(client)
    sid = session["id"]
    assert (
        client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT).status_code
        == 200
    )
    again = client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT)
    assert again.status_code == 409
    assert again.json()["detail"] == "consent_already_recorded"


def test_double_intake_returns_409(client: TestClient) -> None:
    session = _create(client)
    sid = session["id"]
    client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT)
    assert client.post(f"/api/v1/sessions/{sid}/intake", json=INTAKE).status_code == 200
    again = client.post(f"/api/v1/sessions/{sid}/intake", json=INTAKE)
    assert again.status_code == 409
    assert again.json()["detail"] == "intake_already_recorded"


def test_intake_rejects_invalid_age_range(client: TestClient) -> None:
    session = _create(client)
    sid = session["id"]
    client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT)
    bad = {**INTAKE, "age_range": "under-18"}
    response = client.post(f"/api/v1/sessions/{sid}/intake", json=bad)
    assert response.status_code == 422


def test_concurrent_consent_exactly_one_success(client: TestClient) -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    session = _create(client)
    sid = session["id"]
    n = 8

    def post_consent() -> int:
        return client.post(
            f"/api/v1/sessions/{sid}/consent",
            json=FULL_CONSENT,
        ).status_code

    with ThreadPoolExecutor(max_workers=n) as pool:
        codes = [
            f.result()
            for f in as_completed(pool.submit(post_consent) for _ in range(n))
        ]

    assert codes.count(200) == 1, codes
    assert codes.count(409) == n - 1, codes
    assert all(c in (200, 409) for c in codes), codes

    final = client.get(f"/api/v1/sessions/{sid}")
    assert final.status_code == 200
    body = final.json()
    assert body["stage"] == "consented"
    consented_at = body["consent"]["consented_at"]
    assert consented_at

    # Losers must not overwrite consented_at
    for _ in range(n):
        again = client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT)
        assert again.status_code == 409
    after = client.get(f"/api/v1/sessions/{sid}").json()
    assert after["consent"]["consented_at"] == consented_at
    assert after["stage"] == "consented"


def test_concurrent_intake_exactly_one_success(client: TestClient) -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    session = _create(client)
    sid = session["id"]
    assert (
        client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT).status_code
        == 200
    )
    consented_at = client.get(f"/api/v1/sessions/{sid}").json()["consent"][
        "consented_at"
    ]
    n = 8

    def post_intake() -> int:
        return client.post(
            f"/api/v1/sessions/{sid}/intake",
            json=INTAKE,
        ).status_code

    with ThreadPoolExecutor(max_workers=n) as pool:
        codes = [
            f.result() for f in as_completed(pool.submit(post_intake) for _ in range(n))
        ]

    assert codes.count(200) == 1, codes
    assert codes.count(409) == n - 1, codes
    assert all(c in (200, 409) for c in codes), codes

    final = client.get(f"/api/v1/sessions/{sid}")
    assert final.status_code == 200
    body = final.json()
    assert body["stage"] == "intake_complete"
    assert body["consent"]["consented_at"] == consented_at
