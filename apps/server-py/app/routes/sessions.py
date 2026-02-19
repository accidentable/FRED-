"""Session management routes."""

from __future__ import annotations
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# ─── In-memory session store ─────────────────────────────────────────

_sessions: dict[str, dict] = {}


class SessionCreate(BaseModel):
    title: str = "New Session"


# ─── Routes ──────────────────────────────────────────────────────────


@router.get("/")
async def list_sessions():
    """List all sessions, sorted by most recent."""
    sessions = sorted(
        _sessions.values(),
        key=lambda s: s["updatedAt"],
        reverse=True,
    )
    return {"sessions": sessions}


@router.post("/", status_code=201)
async def create_session(body: SessionCreate):
    """Create a new session."""
    now = datetime.now().isoformat()
    session = {
        "id": f"SES-{uuid.uuid4().hex[:8].upper()}",
        "title": body.title,
        "createdAt": now,
        "updatedAt": now,
    }
    _sessions[session["id"]] = session
    return session


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get a specific session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return _sessions[session_id]


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del _sessions[session_id]
    return {"success": True}
