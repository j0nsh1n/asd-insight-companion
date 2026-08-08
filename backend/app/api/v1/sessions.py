from fastapi import APIRouter

from app.models.session import ConsentRequest, IntakeRequest, SessionResponse
from app.services import sessions as session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
@router.post(
    "/",
    response_model=SessionResponse,
    status_code=201,
    include_in_schema=False,
)
def create_session() -> SessionResponse:
    """Create anonymous session. Accept both /sessions and /sessions/."""
    return session_service.create_session()


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str) -> SessionResponse:
    return session_service.get_session(session_id)


@router.post("/{session_id}/consent", response_model=SessionResponse)
def post_consent(session_id: str, body: ConsentRequest) -> SessionResponse:
    return session_service.record_consent(session_id, body)


@router.post("/{session_id}/intake", response_model=SessionResponse)
def post_intake(session_id: str, body: IntakeRequest) -> SessionResponse:
    return session_service.record_intake(session_id, body)
