"""HTTP routes for anonymous sessions (Phase 1)."""

from fastapi import APIRouter

from app.models.session import (
    ConsentRequest,
    ErrorDetail,
    IntakeRequest,
    SessionResponse,
)
from app.services import sessions as session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])

_ERROR_RESPONSES = {
    403: {"model": ErrorDetail, "description": "Consent required (fail closed)"},
    404: {"model": ErrorDetail, "description": "Session not found"},
    409: {"model": ErrorDetail, "description": "Stage conflict / already recorded"},
}


@router.post("", response_model=SessionResponse, status_code=201)
@router.post(
    "/",
    response_model=SessionResponse,
    status_code=201,
    include_in_schema=False,
)
def create_session() -> SessionResponse:
    """Create an anonymous session. Accepts both ``/sessions`` and ``/sessions/``."""
    return session_service.create_session()


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    responses={404: _ERROR_RESPONSES[404]},
)
def get_session(session_id: str) -> SessionResponse:
    """Return session status for refresh/resume."""
    return session_service.get_session(session_id)


@router.post(
    "/{session_id}/consent",
    response_model=SessionResponse,
    responses={
        404: _ERROR_RESPONSES[404],
        409: _ERROR_RESPONSES[409],
    },
)
def post_consent(session_id: str, body: ConsentRequest) -> SessionResponse:
    """Record full consent (all flags true) or reject fail-closed."""
    return session_service.record_consent(session_id, body)


@router.post(
    "/{session_id}/intake",
    response_model=SessionResponse,
    responses={
        403: _ERROR_RESPONSES[403],
        404: _ERROR_RESPONSES[404],
        409: _ERROR_RESPONSES[409],
    },
)
def post_intake(session_id: str, body: IntakeRequest) -> SessionResponse:
    """Store minimized intake after consent; blocked without consent."""
    return session_service.record_intake(session_id, body)
