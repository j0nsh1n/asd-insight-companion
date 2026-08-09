"""Anonymous session lifecycle: create → consent → intake (fail closed)."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import HTTPException

from app.db import get_connection
from app.models.session import (
    AccessibilityPrefs,
    ConsentRequest,
    ConsentState,
    IntakeRequest,
    IntakeState,
    QuestionnaireSummary,
    QuestionnaireTimingSummary,
    SessionResponse,
    SessionStage,
)


def _utc_now() -> str:
    """Return an ISO-8601 UTC timestamp without microseconds."""
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _row_mapping(row: sqlite3.Row) -> dict[str, Any]:
    """Convert a sqlite3.Row to a plain dict (Row iterates values, not keys)."""
    return {key: row[key] for key in row.keys()}  # noqa: SIM118


def questionnaire_summary_from_mapping(
    mapping: dict[str, Any],
) -> QuestionnaireSummary | None:
    """Build questionnaire summary from a sessions row mapping (may be partial)."""
    started = mapping.get("questionnaire_started_at")
    completed = mapping.get("questionnaire_completed_at")
    score = mapping.get("questionnaire_score")
    item_count = mapping.get("questionnaire_item_count")
    bank_id = mapping.get("questionnaire_bank_id")
    instrument_version = mapping.get("questionnaire_instrument_version")
    subscales_raw = mapping.get("questionnaire_subscale_scores")
    timing_raw = mapping.get("questionnaire_timing_summary")
    if not any(
        [
            started,
            completed,
            score is not None,
            timing_raw,
            bank_id,
            instrument_version,
            subscales_raw,
        ]
    ):
        return None
    timing = None
    if timing_raw:
        timing = QuestionnaireTimingSummary.model_validate(json.loads(str(timing_raw)))
    subscales = None
    if subscales_raw:
        parsed = json.loads(str(subscales_raw))
        if isinstance(parsed, dict):
            subscales = {str(k): int(v) for k, v in parsed.items()}
    return QuestionnaireSummary(
        started_at=cast(str | None, started),
        completed_at=cast(str | None, completed),
        score=int(score) if score is not None else None,
        item_count=int(item_count) if item_count is not None else None,
        bank_id=cast(str | None, bank_id),
        instrument_version=cast(str | None, instrument_version),
        subscale_scores=subscales,
        timing=timing,
    )


def _row_to_response(row: sqlite3.Row) -> SessionResponse:
    """Map a database row to the public SessionResponse model."""
    mapping = _row_mapping(row)
    consent = ConsentState(
        research_only=bool(mapping["consent_research_only"]),
        no_diagnosis=bool(mapping["consent_no_diagnosis"]),
        data_minimization=bool(mapping["consent_data_minimization"]),
        consented_at=cast(str | None, mapping["consented_at"]),
    )
    intake: IntakeState | None = None
    if mapping["age_range"] is not None:
        prefs_raw = mapping["accessibility_prefs"] or "{}"
        prefs = AccessibilityPrefs.model_validate(json.loads(str(prefs_raw)))
        intake = IntakeState(
            age_range=mapping["age_range"],
            language=mapping["language"] or "en",
            accessibility_prefs=prefs,
            optional_context=cast(str | None, mapping["optional_context"]),
        )
    return SessionResponse(
        id=str(mapping["id"]),
        stage=SessionStage(str(mapping["stage"])),
        created_at=str(mapping["created_at"]),
        updated_at=str(mapping["updated_at"]),
        consent=consent,
        intake=intake,
        questionnaire=questionnaire_summary_from_mapping(mapping),
    )


def _get_row(session_id: str) -> sqlite3.Row | None:
    """Fetch a session row by id, or None if missing."""
    with get_connection() as conn:
        cur = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return cast(sqlite3.Row | None, cur.fetchone())


def create_session() -> SessionResponse:
    """Create an anonymous session in stage ``created``."""
    session_id = str(uuid.uuid4())
    now = _utc_now()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sessions (
                id, stage, created_at, updated_at,
                consent_research_only, consent_no_diagnosis, consent_data_minimization
            ) VALUES (?, ?, ?, ?, 0, 0, 0)
            """,
            (session_id, SessionStage.CREATED.value, now, now),
        )
    row = _get_row(session_id)
    if row is None:
        raise HTTPException(status_code=500, detail="session_create_failed")
    return _row_to_response(row)


def get_session(session_id: str) -> SessionResponse:
    """Return session status for resume, or 404 if unknown."""
    row = _get_row(session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="session_not_found")
    return _row_to_response(row)


def record_consent(session_id: str, body: ConsentRequest) -> SessionResponse:
    """
    Atomically advance ``created`` → ``consented``.

    Uses a single conditional UPDATE so concurrent POSTs yield exactly one
    success. Consent flags are persisted from the validated request body.
    """
    now = _utc_now()
    with get_connection() as conn:
        # Commit deferred until context exit when rowcount == 1.
        cur = conn.execute(
            """
            UPDATE sessions SET
                stage = ?,
                updated_at = ?,
                consent_research_only = ?,
                consent_no_diagnosis = ?,
                consent_data_minimization = ?,
                consented_at = ?
            WHERE id = ? AND stage = ?
            """,
            (
                SessionStage.CONSENTED.value,
                now,
                int(body.research_only),
                int(body.no_diagnosis),
                int(body.data_minimization),
                now,
                session_id,
                SessionStage.CREATED.value,
            ),
        )
        if cur.rowcount != 1:
            row = conn.execute(
                "SELECT id FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="session_not_found")
            raise HTTPException(status_code=409, detail="consent_already_recorded")
    return get_session(session_id)


def record_intake(session_id: str, body: IntakeRequest) -> SessionResponse:
    """
    Atomically advance ``consented`` → ``intake_complete``.

    Fail-closed: stage ``created`` → 403; already complete → 409.
    """
    now = _utc_now()
    prefs_json = body.accessibility_prefs.model_dump_json()
    with get_connection() as conn:
        # Commit deferred until context exit when rowcount == 1.
        cur = conn.execute(
            """
            UPDATE sessions SET
                stage = ?,
                updated_at = ?,
                age_range = ?,
                language = ?,
                accessibility_prefs = ?,
                optional_context = ?
            WHERE id = ? AND stage = ?
            """,
            (
                SessionStage.INTAKE_COMPLETE.value,
                now,
                body.age_range,
                body.language,
                prefs_json,
                body.optional_context,
                session_id,
                SessionStage.CONSENTED.value,
            ),
        )
        if cur.rowcount != 1:
            row = conn.execute(
                "SELECT stage FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="session_not_found")
            stage = SessionStage(str(row["stage"]))
            if stage == SessionStage.CREATED:
                raise HTTPException(status_code=403, detail="consent_required")
            if stage == SessionStage.INTAKE_COMPLETE:
                raise HTTPException(status_code=409, detail="intake_already_recorded")
            raise HTTPException(status_code=409, detail="invalid_stage")
    return get_session(session_id)
