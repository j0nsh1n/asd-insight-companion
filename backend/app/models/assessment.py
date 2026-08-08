"""Pydantic models for timed questionnaire (Phase 2)."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.models.session import SessionResponse, SessionStage


class ScaleOption(BaseModel):
    value: int
    label: str


class QuestionItem(BaseModel):
    id: str
    text: str
    required: bool = True
    reverse_scored: bool = False


class QuestionBankPublic(BaseModel):
    """Question bank metadata and items (no answers)."""

    bank_id: str
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
    total_time_on_question_ms: int = Field(ge=0)
    answer_change_count: int = Field(ge=0)

    @field_validator("session_id", "question_id", "shown_at", "answered_at")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field must not be empty")
        return cleaned


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
