"""Chat API route — POST /api/chat."""

from fastapi import APIRouter
from app.models import ChatRequest, ChatResponse
from app.services.orchestrator import run_orchestrator

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Process a user message through the AI orchestrator.

    Returns structured response with:
    - message: AI response (Korean)
    - logs: Execution trace for the log panel
    - data_objects: FRED series metadata for the data panel
    - chart_data: Time-series data for chart rendering
    """
    return await run_orchestrator(
        message=request.message,
        session_id=request.sessionId,
        locale=request.locale,
    )
