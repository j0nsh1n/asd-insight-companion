"""Timed questionnaire: record responses, progress, and completion."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal, cast

from fastapi import HTTPException

from app.db import get_connection
from app.models.assessment import (
    FeatureIngestResult,
    FeaturePayload,
    QuestionnaireCompleteRequest,
    QuestionnaireProgress,
    QuestionResponseRequest,
    QuestionResponseResult,
    StoredQuestionResponse,
)
from app.models.session import (
    QuestionnaireTimingSummary,
    SessionResponse,
    SessionStage,
)
from app.services import sessions as session_service
from app.services.question_bank import (
    get_item_map,
    get_question_bank,
    get_scale_values,
)
from app.services.scoring import compute_questionnaire_scores


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _stored_from_row(row: sqlite3.Row) -> StoredQuestionResponse:
    return StoredQuestionResponse(
        question_id=str(row["question_id"]),
        answer_value=int(row["answer_value"]),
        shown_at=str(row["shown_at"]),
        answered_at=str(row["answered_at"]),
        time_to_first_interaction_ms=int(row["time_to_first_interaction_ms"]),
        total_time_on_question_ms=int(row["total_time_on_question_ms"]),
        answer_change_count=int(row["answer_change_count"]),
    )


def _load_responses(
    conn: sqlite3.Connection, session_id: str
) -> dict[str, StoredQuestionResponse]:
    cur = conn.execute(
        """
        SELECT question_id, answer_value, shown_at, answered_at,
               time_to_first_interaction_ms, total_time_on_question_ms,
               answer_change_count
        FROM question_responses
        WHERE session_id = ?
        """,
        (session_id,),
    )
    return {str(row["question_id"]): _stored_from_row(row) for row in cur.fetchall()}


def _next_unanswered(
    ordered_ids: list[str], answered: dict[str, StoredQuestionResponse]
) -> str | None:
    for qid in ordered_ids:
        if qid not in answered:
            return qid
    return None


def _require_session_row(conn: sqlite3.Connection, session_id: str) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM sessions WHERE id = ?",
        (session_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="session_not_found")
    return cast(sqlite3.Row, row)


def _assert_questionnaire_writable(stage: SessionStage) -> None:
    if stage == SessionStage.QUESTIONNAIRE_COMPLETE:
        raise HTTPException(status_code=409, detail="questionnaire_already_complete")
    if stage not in (
        SessionStage.INTAKE_COMPLETE,
        SessionStage.QUESTIONNAIRE_IN_PROGRESS,
    ):
        raise HTTPException(status_code=403, detail="questionnaire_not_available")


def record_question_response(body: QuestionResponseRequest) -> QuestionResponseResult:
    """Upsert one question answer + metrics; start questionnaire if needed."""
    bank = get_question_bank()
    items = get_item_map()
    if body.question_id not in items:
        raise HTTPException(status_code=422, detail="unknown_question_id")
    scale = get_scale_values()
    if body.answer_value not in scale:
        raise HTTPException(status_code=422, detail="invalid_answer_value")

    now = _utc_now()
    # IMMEDIATE serializes writers so complete cannot commit mid-upsert.
    with get_connection(immediate=True) as conn:
        row = _require_session_row(conn, body.session_id)
        stage = SessionStage(str(row["stage"]))
        _assert_questionnaire_writable(stage)

        # Single atomic stage flip on first answer.
        if stage == SessionStage.INTAKE_COMPLETE:
            cur = conn.execute(
                """
                UPDATE sessions SET
                    stage = ?,
                    updated_at = ?,
                    questionnaire_started_at = COALESCE(questionnaire_started_at, ?)
                WHERE id = ? AND stage = ?
                """,
                (
                    SessionStage.QUESTIONNAIRE_IN_PROGRESS.value,
                    now,
                    now,
                    body.session_id,
                    SessionStage.INTAKE_COMPLETE.value,
                ),
            )
            if cur.rowcount != 1:
                row = _require_session_row(conn, body.session_id)
                stage = SessionStage(str(row["stage"]))
                _assert_questionnaire_writable(stage)

        # Stage-conditional upsert: never write after questionnaire_complete.
        cur = conn.execute(
            """
            INSERT INTO question_responses (
                session_id, question_id, shown_at, answered_at,
                time_to_first_interaction_ms, total_time_on_question_ms,
                answer_change_count, answer_value, updated_at
            )
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
            WHERE EXISTS (
                SELECT 1 FROM sessions
                WHERE id = ?
                  AND stage IN (?, ?)
            )
            ON CONFLICT(session_id, question_id) DO UPDATE SET
                shown_at = excluded.shown_at,
                answered_at = excluded.answered_at,
                time_to_first_interaction_ms = excluded.time_to_first_interaction_ms,
                total_time_on_question_ms = excluded.total_time_on_question_ms,
                answer_change_count = excluded.answer_change_count,
                answer_value = excluded.answer_value,
                updated_at = excluded.updated_at
            WHERE EXISTS (
                SELECT 1 FROM sessions
                WHERE id = excluded.session_id
                  AND stage IN (?, ?)
            )
            """,
            (
                body.session_id,
                body.question_id,
                body.shown_at,
                body.answered_at,
                body.time_to_first_interaction_ms,
                body.total_time_on_question_ms,
                body.answer_change_count,
                body.answer_value,
                now,
                body.session_id,
                SessionStage.INTAKE_COMPLETE.value,
                SessionStage.QUESTIONNAIRE_IN_PROGRESS.value,
                SessionStage.INTAKE_COMPLETE.value,
                SessionStage.QUESTIONNAIRE_IN_PROGRESS.value,
            ),
        )
        if cur.rowcount != 1:
            row = _require_session_row(conn, body.session_id)
            stage = SessionStage(str(row["stage"]))
            _assert_questionnaire_writable(stage)
            raise HTTPException(status_code=409, detail="invalid_stage")

        conn.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (now, body.session_id),
        )

        answered = _load_responses(conn, body.session_id)
        ordered = [item.id for item in bank.items]
        stored = answered[body.question_id]

    session = session_service.get_session(body.session_id)
    return QuestionResponseResult(
        session=session,
        response=stored,
        answered_count=len(answered),
        required_count=bank.required_count,
        next_question_id=_next_unanswered(ordered, answered),
    )


def get_progress(session_id: str) -> QuestionnaireProgress:
    """Return answered map and next question for resume."""
    bank = get_question_bank()
    ordered = [item.id for item in bank.items]
    with get_connection() as conn:
        row = _require_session_row(conn, session_id)
        stage = SessionStage(str(row["stage"]))
        if stage not in (
            SessionStage.INTAKE_COMPLETE,
            SessionStage.QUESTIONNAIRE_IN_PROGRESS,
            SessionStage.QUESTIONNAIRE_COMPLETE,
        ):
            raise HTTPException(status_code=403, detail="questionnaire_not_available")
        answered = _load_responses(conn, session_id)

    session = session_service.get_session(session_id)
    # Derive next_id from the same stage as the returned session payload.
    next_id = (
        None
        if session.stage == SessionStage.QUESTIONNAIRE_COMPLETE
        else _next_unanswered(ordered, answered)
    )
    return QuestionnaireProgress(
        session_id=session_id,
        stage=session.stage,
        bank_id=bank.bank_id,
        required_count=bank.required_count,
        answered_count=len(answered),
        answered=answered,
        next_question_id=next_id,
        ordered_question_ids=ordered,
        session=session,
    )


def complete_questionnaire(body: QuestionnaireCompleteRequest) -> SessionResponse:
    """Finalize questionnaire when all required items are answered."""
    bank = get_question_bank()
    items = get_item_map()
    required_ids = [item.id for item in bank.items if item.required]
    scale_vals = sorted(get_scale_values())
    scale_min, scale_max = scale_vals[0], scale_vals[-1]

    now = _utc_now()
    with get_connection(immediate=True) as conn:
        row = _require_session_row(conn, body.session_id)
        stage = SessionStage(str(row["stage"]))
        if stage == SessionStage.QUESTIONNAIRE_COMPLETE:
            raise HTTPException(
                status_code=409, detail="questionnaire_already_complete"
            )
        if stage not in (
            SessionStage.INTAKE_COMPLETE,
            SessionStage.QUESTIONNAIRE_IN_PROGRESS,
        ):
            raise HTTPException(status_code=403, detail="questionnaire_not_available")

        answered = _load_responses(conn, body.session_id)
        missing = [qid for qid in required_ids if qid not in answered]
        if missing:
            raise HTTPException(status_code=400, detail="questionnaire_incomplete")

        score, subscales = compute_questionnaire_scores(
            required_ids, items, answered, scale_min, scale_max
        )
        total_time = 0
        total_ttf = 0
        total_changes = 0
        n = len(required_ids)
        for qid in required_ids:
            resp = answered[qid]
            total_time += resp.total_time_on_question_ms
            total_ttf += resp.time_to_first_interaction_ms
            total_changes += resp.answer_change_count

        timing = QuestionnaireTimingSummary(
            item_count=n,
            total_time_ms=total_time,
            mean_time_to_first_interaction_ms=round(total_ttf / n, 2) if n else 0.0,
            mean_total_time_on_question_ms=round(total_time / n, 2) if n else 0.0,
            total_answer_changes=total_changes,
        )
        timing_json = timing.model_dump_json()
        subscales_json = json.dumps(subscales, sort_keys=True)

        cur = conn.execute(
            """
            UPDATE sessions SET
                stage = ?,
                updated_at = ?,
                questionnaire_completed_at = ?,
                questionnaire_score = ?,
                questionnaire_item_count = ?,
                questionnaire_timing_summary = ?,
                questionnaire_bank_id = ?,
                questionnaire_instrument_version = ?,
                questionnaire_subscale_scores = ?,
                questionnaire_started_at = COALESCE(questionnaire_started_at, ?)
            WHERE id = ? AND stage IN (?, ?)
            """,
            (
                SessionStage.QUESTIONNAIRE_COMPLETE.value,
                now,
                now,
                score,
                n,
                timing_json,
                bank.bank_id,
                bank.instrument_version,
                subscales_json,
                now,
                body.session_id,
                SessionStage.INTAKE_COMPLETE.value,
                SessionStage.QUESTIONNAIRE_IN_PROGRESS.value,
            ),
        )
        if cur.rowcount != 1:
            row = _require_session_row(conn, body.session_id)
            stage = SessionStage(str(row["stage"]))
            if stage == SessionStage.QUESTIONNAIRE_COMPLETE:
                raise HTTPException(
                    status_code=409, detail="questionnaire_already_complete"
                )
            raise HTTPException(status_code=409, detail="invalid_stage")

    return session_service.get_session(body.session_id)


def _threshold_candidates() -> list[Path]:
    here = Path(__file__).resolve()
    return [
        here.parents[3] / "shared" / "feature_quality_thresholds.json",
        here.parents[2] / "shared" / "feature_quality_thresholds.json",
    ]


@lru_cache
def _feature_quality_thresholds() -> dict[str, Any]:
    for path in _threshold_candidates():
        if path.is_file():
            with path.open(encoding="utf-8") as handle:
                data = json.load(handle)
            if isinstance(data, dict):
                return data
    return {
        "min_valid_tracking_duration_ms": 2000,
        "min_tracking_ratio_sufficient": 0.25,
        "min_tracking_ratio_ok": 0.55,
        "max_dropped_frame_ratio_ok": 0.45,
    }


def _classify_feature_quality(
    body: FeaturePayload,
) -> Literal["ok", "low", "insufficient", "unavailable"]:
    """Tracking quality only — not an autism or clinical score.

    Thresholds come from shared/feature_quality_thresholds.json (same file
    the frontend exports as FEATURE_QUALITY_THRESHOLDS). Client data_quality
    is ignored here.
    """
    t = _feature_quality_thresholds()
    min_valid = int(t["min_valid_tracking_duration_ms"])
    min_sufficient = float(t["min_tracking_ratio_sufficient"])
    min_ok = float(t["min_tracking_ratio_ok"])
    max_dropped = float(t["max_dropped_frame_ratio_ok"])
    if body.sample_count == 0:
        return "unavailable"
    if (
        body.valid_tracking_duration_ms < min_valid
        or body.tracking_ratio < min_sufficient
    ):
        return "insufficient"
    if body.tracking_ratio < min_ok or body.dropped_frame_ratio > max_dropped:
        return "low"
    return "ok"


def record_features(body: FeaturePayload) -> FeatureIngestResult:
    """Store aggregate numeric features. Rejects if already recorded."""
    now = _utc_now()
    quality = _classify_feature_quality(body)
    detail = "numeric_features_stored"
    if body.data_quality != quality:
        detail = f"{detail};client_quality_mismatch"
    payload_json = body.model_dump_json()
    with get_connection(immediate=True) as conn:
        row = _require_session_row(conn, body.session_id)
        stage = SessionStage(str(row["stage"]))
        if stage != SessionStage.QUESTIONNAIRE_COMPLETE:
            raise HTTPException(status_code=403, detail="questionnaire_not_complete")
        cur = conn.execute(
            """
            UPDATE sessions SET
                updated_at = ?,
                feature_payload = ?,
                feature_quality = ?,
                feature_recorded_at = ?
            WHERE id = ? AND feature_payload IS NULL
            """,
            (now, payload_json, quality, now, body.session_id),
        )
        if cur.rowcount != 1:
            row = _require_session_row(conn, body.session_id)
            stage = SessionStage(str(row["stage"]))
            if stage != SessionStage.QUESTIONNAIRE_COMPLETE:
                raise HTTPException(
                    status_code=403, detail="questionnaire_not_complete"
                )
            raise HTTPException(status_code=409, detail="features_already_recorded")
    return FeatureIngestResult(
        status="accepted",
        quality=quality,
        detail=detail,
    )
