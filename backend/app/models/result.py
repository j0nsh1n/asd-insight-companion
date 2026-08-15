"""Research-session summary schemas (Phase 5). Not a diagnostic score."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DataQualityBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questionnaire_completed: bool
    questionnaire_item_count: int = Field(ge=0)
    video_task_status: Literal["completed", "skipped", "insufficient_tracking"]
    tracking_ratio: float = Field(ge=0.0, le=1.0)
    calibration_status: Literal["passed", "limited", "not_available"]
    overall_quality_label: Literal[
        "usable_for_research_display",
        "limited",
        "insufficient",
    ]


class QuestionnaireResponsePattern(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mean_response_time_ms: float = Field(ge=0)
    response_time_variability_ms: float = Field(ge=0)
    answer_change_count: int = Field(ge=0)


class HeadMotionSummary(BaseModel):
    """Existing Phase 4 aggregates — not a clinical motion score."""

    model_config = ConfigDict(extra="forbid")

    mean_abs_yaw_deg: float = Field(ge=0.0, le=180.0)
    mean_abs_pitch_deg: float = Field(ge=0.0, le=180.0)


class VideoTaskSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_completed: bool
    valid_tracking_duration_ms: int = Field(ge=0)
    mean_blink_estimate: float | None = Field(default=None, ge=0.0, le=1.0)
    head_motion_summary: HeadMotionSummary | None = None
    attention_estimates_available: bool


class ResearchTaskObservations(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questionnaire_response_pattern: QuestionnaireResponsePattern | None = None
    video_task_summary: VideoTaskSummary | None = None


class ExplanationBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str
    available_data: list[str]
    unavailable_or_limited_data: list[str]
    limitations: list[str]
    next_steps: list[str]


class SafetyBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    research_only: Literal[True] = True
    not_a_diagnosis: Literal[True] = True
    no_clinical_probability_provided: Literal[True] = True


class ResearchSessionSummary(BaseModel):
    """Read-only research-session display payload. No autism score."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    status: Literal["complete", "partial", "insufficient_data"]
    data_quality: DataQualityBlock
    research_task_observations: ResearchTaskObservations
    explanation: ExplanationBlock
    safety: SafetyBlock
