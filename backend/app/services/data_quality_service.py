"""Deterministic session-completeness / data-quality rules (not model confidence)."""

from __future__ import annotations

from typing import Literal

from app.models.assessment import FeaturePayload
from app.models.result import DataQualityBlock
from app.models.session import QuestionnaireSummary

VideoTaskStatus = Literal["completed", "skipped", "insufficient_tracking"]
SessionStatus = Literal["complete", "partial", "insufficient_data"]
OverallQuality = Literal["usable_for_research_display", "limited", "insufficient"]

# Session-completeness mapping. Tracking coverage thresholds live in
# shared/feature_quality_thresholds.json and are applied at feature ingest.
INSUFFICIENT_FEATURE_QUALITY = frozenset({"insufficient", "unavailable"})
LIMITED_FEATURE_QUALITY = frozenset({"low"})


def effective_feature_quality(
    features: FeaturePayload | None,
    stored_quality: str | None = None,
) -> str | None:
    """Prefer the server-stored quality flag over the client payload field."""
    if stored_quality:
        return stored_quality
    if features is None:
        return None
    return features.data_quality


def video_task_status(
    features: FeaturePayload | None,
    stored_quality: str | None = None,
) -> VideoTaskStatus:
    if features is None or not features.task_completed:
        return "skipped"
    quality = effective_feature_quality(features, stored_quality)
    if quality in INSUFFICIENT_FEATURE_QUALITY:
        return "insufficient_tracking"
    return "completed"


def evaluate_data_quality(
    questionnaire: QuestionnaireSummary | None,
    features: FeaturePayload | None,
    *,
    stored_quality: str | None = None,
) -> tuple[SessionStatus, DataQualityBlock]:
    """Return session status plus a data-quality block.

    Quality is session completeness only — not clinical confidence.
    Calibration is not stored server-side, so it is always not_available.
    """
    q_done = bool(questionnaire and questionnaire.completed_at)
    item_count = 0
    if questionnaire and questionnaire.item_count:
        item_count = int(questionnaire.item_count)
    v_status = video_task_status(features, stored_quality)
    tracking_ratio = float(features.tracking_ratio) if features else 0.0
    quality_flag = effective_feature_quality(features, stored_quality)

    if not q_done:
        status: SessionStatus = "insufficient_data"
        overall: OverallQuality = "insufficient"
    elif v_status == "skipped":
        status = "partial"
        overall = "limited"
    elif v_status == "insufficient_tracking":
        status = "insufficient_data"
        overall = "insufficient"
    elif quality_flag in LIMITED_FEATURE_QUALITY:
        status = "partial"
        overall = "limited"
    else:
        status = "complete"
        overall = "usable_for_research_display"

    block = DataQualityBlock(
        questionnaire_completed=q_done,
        questionnaire_item_count=item_count,
        video_task_status=v_status,
        tracking_ratio=tracking_ratio,
        calibration_status="not_available",
        overall_quality_label=overall,
    )
    return status, block
