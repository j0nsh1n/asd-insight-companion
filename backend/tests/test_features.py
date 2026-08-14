"""Phase 4C: numeric feature ingest — no raw media, no autism score."""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

from app.services.question_bank import get_question_bank
from tests.test_assessment import FULL_CONSENT, INTAKE, _metrics


def _complete_questionnaire(client: TestClient) -> str:
    sid = client.post("/api/v1/sessions").json()["id"]
    assert (
        client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT).status_code
        == 200
    )
    assert client.post(f"/api/v1/sessions/{sid}/intake", json=INTAKE).status_code == 200
    bank = get_question_bank()
    for item in bank.items:
        assert (
            client.post(
                "/api/v1/assessment/question-response",
                json={"session_id": sid, **_metrics(item.id)},
            ).status_code
            == 200
        )
    done = client.post(
        "/api/v1/assessment/questionnaire/complete",
        json={"session_id": sid},
    )
    assert done.status_code == 200
    return sid


def _valid_payload(session_id: str, **overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "session_id": session_id,
        "task_version": "social-interaction-v1",
        "sample_count": 40,
        "duration_ms": 8000,
        "tracking_ratio": 0.8,
        "single_face_ratio": 0.75,
        "dropped_frame_ratio": 0.1,
        "valid_tracking_duration_ms": 6400,
        "task_completed": True,
        "data_quality": "ok",
        "mean_abs_yaw_deg": 6.0,
        "mean_abs_pitch_deg": 4.0,
        "mean_blink_estimate": 0.2,
        "media_uploaded": False,
    }
    body.update(overrides)
    return body


def test_features_accepted_numeric_only(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    response = client.post("/api/v1/assessment/features", json=_valid_payload(sid))
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["quality"] == "ok"
    assert "score" not in body
    assert "risk" not in body
    assert "autism" not in str(body).lower()


def test_features_rejects_extra_frame_field(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    payload = _valid_payload(sid, frames=[{"t": 1}])
    response = client.post("/api/v1/assessment/features", json=payload)
    assert response.status_code == 422


def test_features_rejects_raw_media_field(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    payload = _valid_payload(sid, image_base64="AAAA")
    response = client.post("/api/v1/assessment/features", json=payload)
    assert response.status_code == 422


def test_features_rejects_media_uploaded_true(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    payload = _valid_payload(sid, media_uploaded=True)
    response = client.post("/api/v1/assessment/features", json=payload)
    assert response.status_code == 422


def test_features_rejects_ratio_out_of_range(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    payload = _valid_payload(sid, tracking_ratio=1.5)
    response = client.post("/api/v1/assessment/features", json=payload)
    assert response.status_code == 422


def test_features_rejects_before_questionnaire_complete(client: TestClient) -> None:
    sid = client.post("/api/v1/sessions").json()["id"]
    response = client.post("/api/v1/assessment/features", json=_valid_payload(sid))
    assert response.status_code == 403
    assert response.json()["detail"] == "questionnaire_not_complete"


def test_features_unknown_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/assessment/features",
        json=_valid_payload("00000000-0000-0000-0000-000000000000"),
    )
    assert response.status_code == 404


def test_features_double_post_409(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    assert (
        client.post("/api/v1/assessment/features", json=_valid_payload(sid)).status_code
        == 200
    )
    again = client.post("/api/v1/assessment/features", json=_valid_payload(sid))
    assert again.status_code == 409
    assert again.json()["detail"] == "features_already_recorded"


def test_features_quality_unavailable_when_no_samples(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    payload = _valid_payload(
        sid,
        sample_count=0,
        tracking_ratio=0,
        single_face_ratio=0,
        dropped_frame_ratio=0,
        valid_tracking_duration_ms=0,
        task_completed=False,
        data_quality="unavailable",
        mean_abs_yaw_deg=0,
        mean_abs_pitch_deg=0,
        mean_blink_estimate=None,
    )
    response = client.post("/api/v1/assessment/features", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert response.json()["quality"] == "unavailable"


def test_features_ignores_mismatched_client_data_quality(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    payload = _valid_payload(sid, data_quality="unavailable")
    response = client.post("/api/v1/assessment/features", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["quality"] == "ok"
    assert body["detail"] == "numeric_features_stored;client_quality_mismatch"


def test_concurrent_features_exactly_one_success(client: TestClient) -> None:
    import json
    import sqlite3
    from concurrent.futures import ThreadPoolExecutor, as_completed

    from app.db import get_db_path

    sid = _complete_questionnaire(client)
    payload = _valid_payload(sid)
    n = 8

    def post_features() -> int:
        return client.post("/api/v1/assessment/features", json=payload).status_code

    with ThreadPoolExecutor(max_workers=n) as pool:
        codes = [
            f.result()
            for f in as_completed(pool.submit(post_features) for _ in range(n))
        ]

    assert codes.count(200) == 1, codes
    assert codes.count(409) == n - 1, codes
    assert all(c in (200, 409) for c in codes), codes

    conn = sqlite3.connect(get_db_path())
    try:
        row = conn.execute(
            "SELECT feature_payload FROM sessions WHERE id = ?",
            (sid,),
        ).fetchone()
    finally:
        conn.close()
    assert row is not None and row[0]
    stored = json.loads(str(row[0]))
    assert stored == payload
