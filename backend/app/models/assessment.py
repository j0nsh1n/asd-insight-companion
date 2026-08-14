"""Pydantic models for timed questionnaire (Phase 2)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.session import SessionResponse, SessionStage

# Cap per-item dwell time (1 hour).
MAX_ITEM_DURATION_MS = 3_600_000


def _parse_iso_datetime(value: str, field_name: str) -> datetime:
    """Parse ISO-8601 timestamps; accept trailing Z as UTC.

    Naive datetimes are treated as UTC so mixed naive/aware comparisons
    never raise TypeError (which would escape as HTTP 500).
    """
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid ISO-8601 datetime") from exc
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


class ScaleOption(BaseModel):
    value: int
    label: str


class QuestionItem(BaseModel):
    id: str
    text: str
    required: bool = True
    reverse_scored: bool = False
    category: str = "general"


class QuestionBankPublic(BaseModel):
    """Question bank metadata and items (no answers). Loaded from JSON."""

    bank_id: str
    instrument_version: str
    label: str
    scale: list[ScaleOption]
    items: list[QuestionItem]
    required_count: int


class QuestionResponseRequest(BaseModel):
    """Client-reported answer and per-question timing metrics."""

    session_id: str = Field(min_length=1)
    question_id: str = Field(min_length=1)
    answer_value: int
    shown_at: str = Field(min_length=1)
    answered_at: str = Field(min_length=1)
    time_to_first_interaction_ms: int = Field(ge=0)
    total_time_on_question_ms: int = Field(ge=0, le=MAX_ITEM_DURATION_MS)
    answer_change_count: int = Field(ge=0)

    @field_validator("session_id", "question_id")
    @classmethod
    def strip_ids(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field must not be empty")
        return cleaned

    @field_validator("shown_at")
    @classmethod
    def validate_shown_at(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("shown_at must not be empty")
        _parse_iso_datetime(cleaned, "shown_at")
        return cleaned

    @field_validator("answered_at")
    @classmethod
    def validate_answered_at(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("answered_at must not be empty")
        _parse_iso_datetime(cleaned, "answered_at")
        return cleaned

    @model_validator(mode="after")
    def validate_timing_order_and_bounds(self) -> QuestionResponseRequest:
        shown = _parse_iso_datetime(self.shown_at, "shown_at")
        answered = _parse_iso_datetime(self.answered_at, "answered_at")
        if answered < shown:
            raise ValueError("answered_at must be greater than or equal to shown_at")
        if self.total_time_on_question_ms < self.time_to_first_interaction_ms:
            raise ValueError(
                "total_time_on_question_ms must be >= time_to_first_interaction_ms"
            )
        # Upper bound is enforced by Field(le=MAX_ITEM_DURATION_MS).
        return self


class StoredQuestionResponse(BaseModel):
    question_id: str
    answer_value: int
    shown_at: str
    answered_at: str
    time_to_first_interaction_ms: int
    total_time_on_question_ms: int
    answer_change_count: int


class QuestionResponseResult(BaseModel):
    session: SessionResponse
    response: StoredQuestionResponse
    answered_count: int
    required_count: int
    next_question_id: str | None = None


class QuestionnaireCompleteRequest(BaseModel):
    session_id: str = Field(min_length=1)

    @field_validator("session_id")
    @classmethod
    def strip_session_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("session_id must not be empty")
        return cleaned


class FeaturePayload(BaseModel):
    """Aggregate numeric features only. Extra / raw-media fields are rejected."""

    model_config = ConfigDict(extra="forbid")

    session_id: str = Field(min_length=1)
    task_version: str = Field(min_length=1, max_length=64)
    sample_count: int = Field(ge=0, le=1_000_000)
    duration_ms: int = Field(ge=0, le=MAX_ITEM_DURATION_MS)
    tracking_ratio: float = Field(ge=0.0, le=1.0)
    single_face_ratio: float = Field(ge=0.0, le=1.0)
    dropped_frame_ratio: float = Field(ge=0.0, le=1.0)
    valid_tracking_duration_ms: int = Field(ge=0, le=MAX_ITEM_DURATION_MS)
    task_completed: bool
    data_quality: Literal["ok", "low", "insufficient", "unavailable"]
    mean_abs_yaw_deg: float = Field(ge=0.0, le=180.0)
    mean_abs_pitch_deg: float = Field(ge=0.0, le=180.0)
    mean_blink_estimate: float | None = Field(default=None, ge=0.0, le=1.0)
    media_uploaded: Literal[False]

    @field_validator("session_id", "task_version")
    @classmethod
    def strip_feature_ids(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field must not be empty")
        return cleaned

    @model_validator(mode="after")
    def duration_bounds(self) -> FeaturePayload:
        if self.valid_tracking_duration_ms > self.duration_ms:
            raise ValueError("valid_tracking_duration_ms must be <= duration_ms")
        return self


class FeatureIngestResult(BaseModel):
    """Accept/reject + tracking quality. No autism risk score."""

    status: Literal["accepted", "rejected"]
    quality: Literal["ok", "low", "insufficient", "unavailable"]
    detail: str


class QuestionnaireProgress(BaseModel):
    """Resume payload for mid-questionnaire refresh."""

    session_id: str
    stage: SessionStage
    bank_id: str
    required_count: int
    answered_count: int
    answered: dict[str, StoredQuestionResponse]
    next_question_id: str | None
    ordered_question_ids: list[str]
    session: SessionResponse
