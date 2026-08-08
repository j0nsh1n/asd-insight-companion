"""Pydantic models for anonymous sessions (Phase 1)."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SessionStage(StrEnum):
    CREATED = "created"
    CONSENTED = "consented"
    INTAKE_COMPLETE = "intake_complete"


AgeRange = Literal[
    "18-24",
    "25-34",
    "35-44",
    "45-54",
    "55+",
    "prefer_not_to_say",
]


class AccessibilityPrefs(BaseModel):
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
        if not (
            self.research_only and self.no_diagnosis and self.data_minimization
        ):
            raise ValueError(
                "Incomplete consent: research_only, no_diagnosis, and "
                "data_minimization must all be true"
            )
        return self


class IntakeRequest(BaseModel):
    age_range: AgeRange
    language: str = Field(min_length=2, max_length=32)
    accessibility_prefs: AccessibilityPrefs = Field(
        default_factory=AccessibilityPrefs
    )
    optional_context: str | None = Field(default=None, max_length=500)

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned:
            raise ValueError("language is required")
        return cleaned

    @field_validator("optional_context")
    @classmethod
    def empty_context_as_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ConsentState(BaseModel):
    research_only: bool
    no_diagnosis: bool
    data_minimization: bool
    consented_at: str | None = None


class IntakeState(BaseModel):
    age_range: AgeRange
    language: str
    accessibility_prefs: AccessibilityPrefs
    optional_context: str | None = None


class SessionResponse(BaseModel):
    id: str
    stage: SessionStage
    created_at: str
    updated_at: str
    consent: ConsentState
    intake: IntakeState | None = None
