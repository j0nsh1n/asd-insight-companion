"""Phase 5: research-session summary — no diagnostic score."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.models.result import ResearchSessionSummary
from tests.test_features import _complete_questionnaire, _valid_payload

PROHIBITED = (
    "diagnosis",
    "autistic",
    "autism probability",
    "risk score",
    "high risk",
    "low risk",
    "likely autistic",
    "unlikely autistic",
)


def _explanation_blob(body: dict) -> str:
    exp = body["explanation"]
    return " ".join(
        [
            exp["summary"],
            " ".join(exp["available_data"]),
            " ".join(exp["unavailable_or_limited_data"]),
            " ".join(exp["limitations"]),
            " ".join(exp["next_steps"]),
        ]
    ).lower()


def test_results_complete_questionnaire_and_usable_video(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    assert (
        client.post("/api/v1/assessment/features", json=_valid_payload(sid)).status_code
        == 200
    )
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert body["data_quality"]["questionnaire_completed"] is True
    assert body["data_quality"]["video_task_status"] == "completed"
    assert (
        body["data_quality"]["overall_quality_label"] == "usable_for_research_display"
    )
    assert body["safety"]["not_a_diagnosis"] is True
    assert body["safety"]["no_clinical_probability_provided"] is True
    dumped = json.dumps(body).lower()
    assert "score" not in dumped
    assert "risk" not in dumped
    assert "frames" not in dumped
    assert "base64" not in dumped
    assert "landmark" not in dumped
    assert "autism_probability" not in dumped
    blob = _explanation_blob(body)
    for term in PROHIBITED:
        assert term not in blob, term


def test_results_legacy_payload_without_data_quality_is_skipped(
    client: TestClient,
) -> None:
    sid = _complete_questionnaire(client)
    legacy = _valid_payload(sid)
    del legacy["data_quality"]
    from app.db import get_connection

    with get_connection() as conn:
        conn.execute(
            "UPDATE sessions SET feature_payload = ? WHERE id = ?",
            (json.dumps(legacy), sid),
        )
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["data_quality"]["video_task_status"] == "skipped"
    assert "score" not in json.dumps(body).lower()


def test_results_no_features_row_is_partial_skip(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "partial"
    assert body["data_quality"]["video_task_status"] == "skipped"
    assert body["research_task_observations"]["video_task_summary"] is None


def test_results_video_skipped_is_partial(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    skipped = _valid_payload(
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
    assert client.post("/api/v1/assessment/features", json=skipped).status_code == 200
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "partial"
    assert body["data_quality"]["video_task_status"] == "skipped"
    video = body["research_task_observations"]["video_task_summary"]
    assert video["task_completed"] is False
    assert video["attention_estimates_available"] is False
    assert "skipped" in body["explanation"]["summary"].lower()
    blob = _explanation_blob(body)
    for term in PROHIBITED:
        assert term not in blob, term


def test_results_watched_clip_without_samples_is_not_skipped(
    client: TestClient,
) -> None:
    sid = _complete_questionnaire(client)
    watched = _valid_payload(
        sid,
        sample_count=0,
        tracking_ratio=0,
        single_face_ratio=0,
        dropped_frame_ratio=0,
        valid_tracking_duration_ms=0,
        task_completed=True,
        data_quality="unavailable",
        mean_abs_yaw_deg=0,
        mean_abs_pitch_deg=0,
        mean_blink_estimate=None,
    )
    assert client.post("/api/v1/assessment/features", json=watched).status_code == 200
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["data_quality"]["video_task_status"] == "insufficient_tracking"
    assert "skipped" not in body["explanation"]["summary"].lower()
    assert "finished" in body["explanation"]["summary"].lower()
    blob = _explanation_blob(body)
    for term in PROHIBITED:
        assert term not in blob, term


def test_results_low_tracking_is_limited(client: TestClient) -> None:
    sid = _complete_questionnaire(client)
    low = _valid_payload(
        sid,
        sample_count=40,
        tracking_ratio=0.4,
        dropped_frame_ratio=0.5,
        valid_tracking_duration_ms=3000,
        data_quality="low",
    )
    assert client.post("/api/v1/assessment/features", json=low).status_code == 200
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "partial"
    assert body["data_quality"]["overall_quality_label"] == "limited"
    assert "risk" not in json.dumps(body).lower()
    assert "score" not in json.dumps(body).lower()
    blob = _explanation_blob(body)
    for term in PROHIBITED:
        assert term not in blob, term


def test_results_insufficient_tracking_is_not_a_clinical_score(
    client: TestClient,
) -> None:
    sid = _complete_questionnaire(client)
    weak = _valid_payload(
        sid,
        sample_count=40,
        tracking_ratio=0.1,
        valid_tracking_duration_ms=500,
        data_quality="ok",
    )
    posted = client.post("/api/v1/assessment/features", json=weak)
    assert posted.status_code == 200
    assert posted.json()["quality"] == "insufficient"
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "insufficient_data"
    assert body["data_quality"]["video_task_status"] == "insufficient_tracking"
    assert body["data_quality"]["overall_quality_label"] == "insufficient"
    video = body["research_task_observations"]["video_task_summary"]
    assert video["attention_estimates_available"] is False
    assert "score" not in json.dumps(body).lower()
    assert "risk" not in json.dumps(body).lower()
    blob = _explanation_blob(body)
    for term in PROHIBITED:
        assert term not in blob, term


def test_results_missing_questionnaire_insufficient(client: TestClient) -> None:
    sid = client.post("/api/v1/sessions").json()["id"]
    from tests.test_assessment import FULL_CONSENT

    assert (
        client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT).status_code
        == 200
    )
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "insufficient_data"
    assert body["data_quality"]["questionnaire_completed"] is False
    assert body["research_task_observations"]["questionnaire_response_pattern"] is None


def test_results_unknown_session_404(client: TestClient) -> None:
    response = client.get(
        "/api/v1/results/00000000-0000-0000-0000-000000000000",
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "session_not_found"


def test_results_no_consent_403(client: TestClient) -> None:
    sid = client.post("/api/v1/sessions").json()["id"]
    response = client.get(f"/api/v1/results/{sid}")
    assert response.status_code == 403
    assert response.json()["detail"] == "consent_required"


def test_results_schema_rejects_extra_fields() -> None:
    payload = {
        "session_id": "x",
        "status": "complete",
        "data_quality": {
            "questionnaire_completed": True,
            "questionnaire_item_count": 10,
            "video_task_status": "completed",
            "tracking_ratio": 0.8,
            "calibration_status": "not_available",
            "overall_quality_label": "usable_for_research_display",
        },
        "research_task_observations": {},
        "explanation": {
            "summary": "ok",
            "available_data": [],
            "unavailable_or_limited_data": [],
            "limitations": [],
            "next_steps": [],
        },
        "safety": {
            "research_only": True,
            "not_a_diagnosis": True,
            "no_clinical_probability_provided": True,
        },
        "autism_risk": 0.9,
    }
    with pytest.raises(ValidationError) as exc:
        ResearchSessionSummary.model_validate(payload)
    assert "autism_risk" in str(exc.value)
