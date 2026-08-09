"""Pydantic models for anonymous sessions (Phase 1)."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SessionStage(StrEnum):
    """Fail-closed progression through consent, intake, and questionnaire."""

    CREATED = "created"
    CONSENTED = "consented"
    INTAKE_COMPLETE = "intake_complete"
    QUESTIONNAIRE_IN_PROGRESS = "questionnaire_in_progress"
    QUESTIONNAIRE_COMPLETE = "questionnaire_complete"


AgeRange = Literal[
    "18-24",
    "25-34",
    "35-44",
    "45-54",
    "55+",
    "prefer_not_to_say",
]


class AccessibilityPrefs(BaseModel):
    """Minimized accessibility preferences collected at intake."""

    large_text: bool = False
    reduced_motion: bool = False
    screen_reader_hints: bool = False


class ConsentRequest(BaseModel):
    """All flags must be true; incomplete or denied consent fails closed."""

    research_only: bool
    no_diagnosis: bool
    data_minimization: bool

    @model_validator(mode="after")
    def require_full_consent(self) -> ConsentRequest:
        if not (self.research_only and self.no_diagnosis and self.data_minimization):
            raise ValueError(
                "Incomplete consent: research_only, no_diagnosis, and "
                "data_minimization must all be true"
            )
        return self


class IntakeRequest(BaseModel):
    """Minimized intake payload (18+ age buckets only)."""

    age_range: AgeRange
    # Constraints re-checked after normalize_language (strip/lower).
    language: str = Field(max_length=32)
    accessibility_prefs: AccessibilityPrefs = Field(default_factory=AccessibilityPrefs)
    optional_context: str | None = Field(default=None, max_length=500)

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if len(cleaned) < 2:
            raise ValueError(
                "language must be at least 2 characters after normalization"
            )
        if len(cleaned) > 32:
            raise ValueError("language must be at most 32 characters")
        return cleaned

    @field_validator("optional_context")
    @classmethod
    def empty_context_as_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ConsentState(BaseModel):
    """Stored consent flags and timestamp for a session."""

    research_only: bool
    no_diagnosis: bool
    data_minimization: bool
    consented_at: str | None = None


class IntakeState(BaseModel):
    """Stored minimized intake fields for a session."""

    age_range: AgeRange
    language: str
    accessibility_prefs: AccessibilityPrefs
    optional_context: str | None = None


class QuestionnaireTimingSummary(BaseModel):
    """Aggregate timing metrics across questionnaire items."""

    item_count: int
    total_time_ms: int
    mean_time_to_first_interaction_ms: float
    mean_total_time_on_question_ms: float
    total_answer_changes: int


class QuestionnaireSummary(BaseModel):
    """Stored questionnaire outcome on the session (non-diagnostic)."""

    started_at: str | None = None
    completed_at: str | None = None
    score: int | None = None
    item_count: int | None = None
    bank_id: str | None = None
    instrument_version: str | None = None
    subscale_scores: dict[str, int] | None = None
    timing: QuestionnaireTimingSummary | None = None


class SessionResponse(BaseModel):
    """Public session status payload (create / get / consent / intake / q)."""

    id: str
    stage: SessionStage
    created_at: str
    updated_at: str
    consent: ConsentState
    intake: IntakeState | None = None
    questionnaire: QuestionnaireSummary | None = None


class ErrorDetail(BaseModel):
    """Stable API error body used in OpenAPI docs."""

    detail: str
