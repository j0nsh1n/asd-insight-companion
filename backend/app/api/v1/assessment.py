"""HTTP routes for timed questionnaire assessment (Phase 2)."""

from fastapi import APIRouter

from app.models.assessment import (
    FeatureIngestResult,
    FeaturePayload,
    QuestionBankPublic,
    QuestionnaireCompleteRequest,
    QuestionnaireProgress,
    QuestionResponseRequest,
    QuestionResponseResult,
)
from app.models.session import ErrorDetail, SessionResponse
from app.services import assessment as assessment_service
from app.services.question_bank import get_question_bank

router = APIRouter(prefix="/assessment", tags=["assessment"])

_ERRORS = {
    400: {"model": ErrorDetail, "description": "Incomplete questionnaire"},
    403: {"model": ErrorDetail, "description": "Questionnaire not available"},
    404: {"model": ErrorDetail, "description": "Session not found"},
    409: {"model": ErrorDetail, "description": "Stage conflict"},
    422: {"model": ErrorDetail, "description": "Validation error"},
}


@router.get("/questionnaire", response_model=QuestionBankPublic)
def get_questionnaire_bank() -> QuestionBankPublic:
    """Return the swappable self-report question bank from shared JSON."""
    return get_question_bank()


@router.get(
    "/questionnaire/progress/{session_id}",
    response_model=QuestionnaireProgress,
    responses={403: _ERRORS[403], 404: _ERRORS[404]},
)
def get_questionnaire_progress(session_id: str) -> QuestionnaireProgress:
    """Resume helper: answered items and next question."""
    return assessment_service.get_progress(session_id)


@router.post(
    "/question-response",
    response_model=QuestionResponseResult,
    responses={
        403: _ERRORS[403],
        404: _ERRORS[404],
        409: _ERRORS[409],
        422: _ERRORS[422],
    },
)
def post_question_response(body: QuestionResponseRequest) -> QuestionResponseResult:
    """Record one question answer with timing telemetry."""
    return assessment_service.record_question_response(body)


@router.post(
    "/questionnaire/complete",
    response_model=SessionResponse,
    responses={
        400: _ERRORS[400],
        403: _ERRORS[403],
        404: _ERRORS[404],
        409: _ERRORS[409],
    },
)
def post_questionnaire_complete(
    body: QuestionnaireCompleteRequest,
) -> SessionResponse:
    """Finalize questionnaire and store non-diagnostic summary score."""
    return assessment_service.complete_questionnaire(body)


@router.post(
    "/features",
    response_model=FeatureIngestResult,
    responses={
        403: _ERRORS[403],
        404: _ERRORS[404],
        409: _ERRORS[409],
        422: _ERRORS[422],
    },
)
def post_features(body: FeaturePayload) -> FeatureIngestResult:
    """Accept aggregate numeric tracking features only. No autism score."""
    return assessment_service.record_features(body)
