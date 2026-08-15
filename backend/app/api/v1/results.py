"""Read-only research-session summary (Phase 5). No scoring endpoint."""

from fastapi import APIRouter

from app.models.result import ResearchSessionSummary
from app.models.session import ErrorDetail
from app.services.results_service import build_research_session_summary

router = APIRouter(prefix="/results", tags=["results"])

_ERRORS = {
    403: {"model": ErrorDetail, "description": "Consent required"},
    404: {"model": ErrorDetail, "description": "Session not found"},
    422: {"model": ErrorDetail, "description": "Validation error"},
}


@router.get(
    "/{session_id}",
    response_model=ResearchSessionSummary,
    responses={
        403: _ERRORS[403],
        404: _ERRORS[404],
        422: _ERRORS[422],
    },
)
def get_research_session_summary(session_id: str) -> ResearchSessionSummary:
    """Return a non-diagnostic research-session summary for this session only."""
    return build_research_session_summary(session_id)
