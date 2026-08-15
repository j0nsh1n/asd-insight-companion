"""Build a read-only research-session summary from stored aggregates."""

from __future__ import annotations

import json
import math
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError

from app.db import get_connection
from app.models.assessment import FeaturePayload
from app.models.result import (
    HeadMotionSummary,
    QuestionnaireResponsePattern,
    ResearchSessionSummary,
    ResearchTaskObservations,
    VideoTaskSummary,
)
from app.models.session import SessionStage
from app.services import sessions as session_service
from app.services.data_quality_service import evaluate_data_quality
from app.services.safety_service import build_safe_explanation, safety_flags


def _response_times(session_id: str) -> list[int]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT total_time_on_question_ms
            FROM question_responses
            WHERE session_id = ?
            """,
            (session_id,),
        ).fetchall()
    return [int(row["total_time_on_question_ms"]) for row in rows]


def _variability_ms(times: list[int]) -> float:
    if len(times) < 2:
        return 0.0
    mean = sum(times) / len(times)
    var = sum((t - mean) ** 2 for t in times) / len(times)
    return round(math.sqrt(var), 2)


def _load_feature_payload(raw: Any) -> FeaturePayload | None:
    if raw is None or raw == "":
        return None
    try:
        data = json.loads(str(raw))
        if not isinstance(data, dict):
            return None
        return FeaturePayload.model_validate(data)
    except json.JSONDecodeError, ValidationError:
        return None


def build_research_session_summary(session_id: str) -> ResearchSessionSummary:
    """Combine stored questionnaire + Phase 4 aggregates. Read-only."""
    cleaned = session_id.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail="session_id_required")

    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ?",
            (cleaned,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="session_not_found")

    mapping = session_service._row_mapping(row)
    session = session_service._row_to_response(row)
    if session.consent.consented_at is None or session.stage == SessionStage.CREATED:
        raise HTTPException(status_code=403, detail="consent_required")

    features = _load_feature_payload(mapping.get("feature_payload"))
    stored_quality = (
        str(mapping["feature_quality"]) if mapping.get("feature_quality") else None
    )
    questionnaire = session.questionnaire
    status, quality = evaluate_data_quality(
        questionnaire,
        features,
        stored_quality=stored_quality,
    )

    q_pattern: QuestionnaireResponsePattern | None = None
    if questionnaire and questionnaire.completed_at:
        times = _response_times(cleaned)
        timing = questionnaire.timing
        q_pattern = QuestionnaireResponsePattern(
            mean_response_time_ms=float(
                timing.mean_total_time_on_question_ms if timing else 0.0
            ),
            response_time_variability_ms=_variability_ms(times),
            answer_change_count=int(timing.total_answer_changes if timing else 0),
        )

    video: VideoTaskSummary | None = None
    if features is not None:
        quality_flag = stored_quality or features.data_quality
        estimates = (
            features.sample_count > 0
            and features.task_completed
            and quality_flag not in ("unavailable", "insufficient")
        )
        motion = None
        if estimates:
            motion = HeadMotionSummary(
                mean_abs_yaw_deg=features.mean_abs_yaw_deg,
                mean_abs_pitch_deg=features.mean_abs_pitch_deg,
            )
        video = VideoTaskSummary(
            task_completed=bool(features.task_completed),
            valid_tracking_duration_ms=int(features.valid_tracking_duration_ms),
            mean_blink_estimate=features.mean_blink_estimate if estimates else None,
            head_motion_summary=motion,
            attention_estimates_available=bool(estimates and motion is not None),
        )

    explanation = build_safe_explanation(
        questionnaire=questionnaire,
        quality=quality,
        video=video,
    )
    return ResearchSessionSummary(
        session_id=cleaned,
        status=status,
        data_quality=quality,
        research_task_observations=ResearchTaskObservations(
            questionnaire_response_pattern=q_pattern,
            video_task_summary=video,
        ),
        explanation=explanation,
        safety=safety_flags(),
    )
