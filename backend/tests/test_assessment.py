"""Phase 2: timed questionnaire fail-closed gates, complete, resume."""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

from app.services.question_bank import get_question_bank

FULL_CONSENT = {
    "research_only": True,
    "no_diagnosis": True,
    "data_minimization": True,
}
INTAKE = {
    "age_range": "25-34",
    "language": "en",
    "accessibility_prefs": {
        "large_text": False,
        "reduced_motion": False,
        "screen_reader_hints": False,
    },
    "optional_context": None,
}


def _metrics(qid: str, answer: int = 3) -> dict[str, Any]:
    return {
        "question_id": qid,
        "answer_value": answer,
        "shown_at": "2026-08-08T12:00:00+00:00",
        "answered_at": "2026-08-08T12:00:05+00:00",
        "time_to_first_interaction_ms": 400,
        "total_time_on_question_ms": 5000,
        "answer_change_count": 1,
    }


def _to_intake(client: TestClient) -> str:
    sid = client.post("/api/v1/sessions").json()["id"]
    assert (
        client.post(f"/api/v1/sessions/{sid}/consent", json=FULL_CONSENT).status_code
        == 200
    )
    assert client.post(f"/api/v1/sessions/{sid}/intake", json=INTAKE).status_code == 200
    return sid


def test_bank_available(client: TestClient) -> None:
    response = client.get("/api/v1/assessment/questionnaire")
    assert response.status_code == 200
    body = response.json()
    assert body["bank_id"]
    assert body["required_count"] >= 1
    assert (
        "not an official" in body["label"].lower()
        or "research" in body["label"].lower()
    )
    assert len(body["items"]) == body["required_count"]


def test_response_rejected_before_intake(client: TestClient) -> None:
    sid = client.post("/api/v1/sessions").json()["id"]
    bank = get_question_bank()
    qid = bank.items[0].id
    response = client.post(
        "/api/v1/assessment/question-response",
        json={"session_id": sid, **_metrics(qid)},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "questionnaire_not_available"


def test_response_unknown_session(client: TestClient) -> None:
    bank = get_question_bank()
    response = client.post(
        "/api/v1/assessment/question-response",
        json={
            "session_id": "00000000-0000-0000-0000-000000000000",
            **_metrics(bank.items[0].id),
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "session_not_found"


def test_unknown_question_id(client: TestClient) -> None:
    sid = _to_intake(client)
    response = client.post(
        "/api/v1/assessment/question-response",
        json={"session_id": sid, **_metrics("not_a_real_id")},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "unknown_question_id"


def test_happy_path_complete_and_score(client: TestClient) -> None:
    sid = _to_intake(client)
    bank = get_question_bank()
    for item in bank.items:
        r = client.post(
            "/api/v1/assessment/question-response",
            json={"session_id": sid, **_metrics(item.id, answer=2)},
        )
        assert r.status_code == 200, r.text
        assert r.json()["response"]["question_id"] == item.id

    progress = client.get(f"/api/v1/assessment/questionnaire/progress/{sid}")
    assert progress.status_code == 200
    assert progress.json()["answered_count"] == bank.required_count
    assert progress.json()["stage"] == "questionnaire_in_progress"

    done = client.post(
        "/api/v1/assessment/questionnaire/complete",
        json={"session_id": sid},
    )
    assert done.status_code == 200
    body = done.json()
    assert body["stage"] == "questionnaire_complete"
    assert body["questionnaire"]["score"] is not None
    assert body["questionnaire"]["item_count"] == bank.required_count
    assert body["questionnaire"]["bank_id"] == bank.bank_id
    assert body["questionnaire"]["timing"]["item_count"] == bank.required_count
    assert (
        body["questionnaire"]["timing"]["total_answer_changes"] == bank.required_count
    )

    # Reverse-scored items: answer 2 on 1-4 scale -> reverse = 3
    # Non-reverse: 2. Score = sum.
    scale = [o.value for o in bank.scale]
    smin, smax = min(scale), max(scale)
    expected = 0
    for item in bank.items:
        val = 2
        if item.reverse_scored:
            val = smin + smax - val
        expected += val
    assert body["questionnaire"]["score"] == expected


def test_incomplete_complete_rejected(client: TestClient) -> None:
    sid = _to_intake(client)
    bank = get_question_bank()
    first = bank.items[0].id
    assert (
        client.post(
            "/api/v1/assessment/question-response",
            json={"session_id": sid, **_metrics(first)},
        ).status_code
        == 200
    )
    response = client.post(
        "/api/v1/assessment/questionnaire/complete",
        json={"session_id": sid},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "questionnaire_incomplete"


def test_resume_mid_questionnaire(client: TestClient) -> None:
    sid = _to_intake(client)
    bank = get_question_bank()
    first = bank.items[0].id
    second = bank.items[1].id
    client.post(
        "/api/v1/assessment/question-response",
        json={"session_id": sid, **_metrics(first, answer=4)},
    )
    progress = client.get(f"/api/v1/assessment/questionnaire/progress/{sid}")
    assert progress.status_code == 200
    body = progress.json()
    assert body["stage"] == "questionnaire_in_progress"
    assert first in body["answered"]
    assert body["answered"][first]["answer_value"] == 4
    assert body["next_question_id"] == second
    assert body["answered_count"] == 1


def test_rejects_invalid_shown_at_timestamp(client: TestClient) -> None:
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {"session_id": sid, **_metrics(qid), "shown_at": "banana"}
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 422
    assert "shown_at" in response.text


def test_rejects_reversed_timestamps(client: TestClient) -> None:
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {
        "session_id": sid,
        **_metrics(qid),
        "shown_at": "2026-08-08T12:00:10+00:00",
        "answered_at": "2026-08-08T12:00:00+00:00",
    }
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 422
    assert "answered_at" in response.text


def test_mixed_tz_naive_shown_aware_answered_earlier_is_422(
    client: TestClient,
) -> None:
    """Naive shown_at + aware answered_at (earlier) must be 422, not 500."""
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {
        "session_id": sid,
        **_metrics(qid),
        "shown_at": "2026-08-08T06:00:00",
        "answered_at": "2026-08-08T05:59:00Z",
    }
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 422
    assert response.status_code != 500


def test_mixed_tz_aware_shown_naive_answered_earlier_is_422(
    client: TestClient,
) -> None:
    """Aware shown_at + naive answered_at (earlier) must be 422, not 500."""
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {
        "session_id": sid,
        **_metrics(qid),
        "shown_at": "2026-08-08T06:00:05Z",
        "answered_at": "2026-08-08T06:00:00",
    }
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 422
    assert response.status_code != 500


def test_mixed_tz_valid_pair_is_200(client: TestClient) -> None:
    """Naive shown_at + aware answered_at later must succeed."""
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {
        "session_id": sid,
        **_metrics(qid),
        "shown_at": "2026-08-08T06:00:00",
        "answered_at": "2026-08-08T06:00:05Z",
    }
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 200


def test_rejects_huge_duration(client: TestClient) -> None:
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {
        "session_id": sid,
        **_metrics(qid),
        "time_to_first_interaction_ms": 100,
        "total_time_on_question_ms": 3_600_001,
    }
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 422
    assert "total_time_on_question_ms" in response.text


def test_rejects_total_time_less_than_first_interaction(client: TestClient) -> None:
    sid = _to_intake(client)
    qid = get_question_bank().items[0].id
    payload = {
        "session_id": sid,
        **_metrics(qid),
        "time_to_first_interaction_ms": 5000,
        "total_time_on_question_ms": 100,
    }
    response = client.post("/api/v1/assessment/question-response", json=payload)
    assert response.status_code == 422
    assert "total_time_on_question_ms" in response.text


def test_complete_stores_bank_id(client: TestClient) -> None:
    sid = _to_intake(client)
    bank = get_question_bank()
    for item in bank.items:
        client.post(
            "/api/v1/assessment/question-response",
            json={"session_id": sid, **_metrics(item.id)},
        )
    done = client.post(
        "/api/v1/assessment/questionnaire/complete",
        json={"session_id": sid},
    )
    assert done.status_code == 200
    assert done.json()["questionnaire"]["bank_id"] == bank.bank_id


def test_concurrent_first_answers_stage_flips_once(client: TestClient) -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    sid = _to_intake(client)
    bank = get_question_bank()
    # Distinct first answers on different items so upserts do not collide.
    items = bank.items[:8]
    assert len(items) >= 8

    def post_one(item_id: str) -> int:
        return client.post(
            "/api/v1/assessment/question-response",
            json={"session_id": sid, **_metrics(item_id)},
        ).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(post_one, item.id) for item in items]
        codes = [f.result() for f in as_completed(futures)]

    assert all(c == 200 for c in codes), codes
    session = client.get(f"/api/v1/sessions/{sid}").json()
    assert session["stage"] == "questionnaire_in_progress"
    assert session["questionnaire"]["started_at"]


def test_double_complete_409(client: TestClient) -> None:
    sid = _to_intake(client)
    bank = get_question_bank()
    for item in bank.items:
        client.post(
            "/api/v1/assessment/question-response",
            json={"session_id": sid, **_metrics(item.id)},
        )
    assert (
        client.post(
            "/api/v1/assessment/questionnaire/complete",
            json={"session_id": sid},
        ).status_code
        == 200
    )
    again = client.post(
        "/api/v1/assessment/questionnaire/complete",
        json={"session_id": sid},
    )
    assert again.status_code == 409
    assert again.json()["detail"] == "questionnaire_already_complete"

    # Further responses rejected
    blocked = client.post(
        "/api/v1/assessment/question-response",
        json={"session_id": sid, **_metrics(bank.items[0].id)},
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"] == "questionnaire_already_complete"
