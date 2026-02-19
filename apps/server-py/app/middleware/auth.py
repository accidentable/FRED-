"""FastAPI dependency for Supabase JWT authentication."""

from __future__ import annotations

import asyncio

from fastapi import Header, HTTPException

from app.services.supabase_service import get_supabase_admin


async def get_current_user(authorization: str = Header(...)) -> str:
    """Verify Supabase Bearer token and return user_id (UUID string).

    Usage in routes:
        @router.get("/")
        async def my_route(user_id: str = Depends(get_current_user)):
            ...
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]
    sb = get_supabase_admin()

    try:
        response = await asyncio.to_thread(sb.auth.get_user, token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")
