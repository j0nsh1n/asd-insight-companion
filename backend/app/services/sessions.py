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
    SessionResponse,
    SessionStage,
)


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _row_mapping(row: sqlite3.Row) -> dict[str, Any]:
    # sqlite3.Row iterates values, not column names — must use .keys().
    return {key: row[key] for key in row.keys()}  # noqa: SIM118


def _row_to_response(row: sqlite3.Row) -> SessionResponse:
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
    )


def _get_row(session_id: str) -> sqlite3.Row | None:
    with get_connection() as conn:
        cur = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        return cast(sqlite3.Row | None, row)


def create_session() -> SessionResponse:
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
    row = _get_row(session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="session_not_found")
    return _row_to_response(row)


def record_consent(session_id: str, body: ConsentRequest) -> SessionResponse:
    # body is validated all-true by ConsentRequest
    _ = body
    now = _utc_now()
    with get_connection() as conn:
        cur = conn.execute(
            """
            UPDATE sessions SET
                stage = ?,
                updated_at = ?,
                consent_research_only = 1,
                consent_no_diagnosis = 1,
                consent_data_minimization = 1,
                consented_at = ?
            WHERE id = ? AND stage = ?
            """,
            (
                SessionStage.CONSENTED.value,
                now,
                now,
                session_id,
                SessionStage.CREATED.value,
            ),
        )
        if cur.rowcount == 1:
            pass  # committed on context exit
        else:
            row = conn.execute(
                "SELECT * FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="session_not_found")
            raise HTTPException(status_code=409, detail="consent_already_recorded")
    return get_session(session_id)


def record_intake(session_id: str, body: IntakeRequest) -> SessionResponse:
    now = _utc_now()
    prefs_json = body.accessibility_prefs.model_dump_json()
    with get_connection() as conn:
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
        if cur.rowcount == 1:
            pass  # committed on context exit
        else:
            row = conn.execute(
                "SELECT * FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="session_not_found")
            stage = SessionStage(str(_row_mapping(cast(sqlite3.Row, row))["stage"]))
            if stage == SessionStage.CREATED:
                raise HTTPException(status_code=403, detail="consent_required")
            if stage == SessionStage.INTAKE_COMPLETE:
                raise HTTPException(status_code=409, detail="intake_already_recorded")
            raise HTTPException(status_code=409, detail="invalid_stage")
    return get_session(session_id)
