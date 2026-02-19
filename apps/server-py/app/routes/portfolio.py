"""Portfolio management — CRUD for portfolios and holdings.

Endpoints:
  GET    /api/portfolio/                         List user's portfolios
  POST   /api/portfolio/                         Create portfolio
  GET    /api/portfolio/{pid}                    Get portfolio + holdings
  PUT    /api/portfolio/{pid}                    Rename portfolio
  DELETE /api/portfolio/{pid}                    Delete portfolio

  POST   /api/portfolio/{pid}/holdings           Add / upsert holding
  PUT    /api/portfolio/{pid}/holdings/{hid}     Update holding
  DELETE /api/portfolio/{pid}/holdings/{hid}     Remove holding
"""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.supabase_service import get_supabase_admin

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


# ─── Request / Response Models ───────────────────────────────────────────────


class PortfolioCreate(BaseModel):
    name: str = "내 포트폴리오"
    description: Optional[str] = None


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class HoldingUpsert(BaseModel):
    ticker: str
    shares: float
    avg_cost: Optional[float] = None
    currency: str = "USD"
    note: Optional[str] = None


class HoldingUpdate(BaseModel):
    shares: Optional[float] = None
    avg_cost: Optional[float] = None
    currency: Optional[str] = None
    note: Optional[str] = None


# ─── Helper ──────────────────────────────────────────────────────────────────


async def _assert_portfolio_owner(portfolio_id: str, user_id: str) -> None:
    """Raise 404 if the portfolio doesn't exist or doesn't belong to user_id."""
    sb = get_supabase_admin()
    result = await asyncio.to_thread(
        lambda: sb.table("portfolios")
        .select("id")
        .eq("id", portfolio_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")


# ─── Portfolio Routes ─────────────────────────────────────────────────────────


@router.get("/")
async def list_portfolios(user_id: str = Depends(get_current_user)):
    """List all portfolios for the authenticated user."""
    sb = get_supabase_admin()
    result = await asyncio.to_thread(
        lambda: sb.table("portfolios")
        .select("id, name, description, created_at, updated_at")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/", status_code=201)
async def create_portfolio(
    body: PortfolioCreate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase_admin()
    result = await asyncio.to_thread(
        lambda: sb.table("portfolios")
        .insert(
            {
                "user_id": user_id,
                "name": body.name,
                "description": body.description,
            }
        )
        .execute()
    )
    return result.data[0]


@router.get("/{portfolio_id}")
async def get_portfolio(
    portfolio_id: str,
    user_id: str = Depends(get_current_user),
):
    """Fetch a portfolio with all its holdings."""
    sb = get_supabase_admin()
    result = await asyncio.to_thread(
        lambda: sb.table("portfolios")
        .select("*, holdings(*)")
        .eq("id", portfolio_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return result.data[0]


@router.put("/{portfolio_id}")
async def update_portfolio(
    portfolio_id: str,
    body: PortfolioUpdate,
    user_id: str = Depends(get_current_user),
):
    await _assert_portfolio_owner(portfolio_id, user_id)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    sb = get_supabase_admin()
    result = await asyncio.to_thread(
        lambda: sb.table("portfolios")
        .update(updates)
        .eq("id", portfolio_id)
        .execute()
    )
    return result.data[0]


@router.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: str,
    user_id: str = Depends(get_current_user),
):
    await _assert_portfolio_owner(portfolio_id, user_id)
    sb = get_supabase_admin()
    await asyncio.to_thread(
        lambda: sb.table("portfolios").delete().eq("id", portfolio_id).execute()
    )


# ─── Holdings Routes ──────────────────────────────────────────────────────────


@router.post("/{portfolio_id}/holdings", status_code=201)
async def upsert_holding(
    portfolio_id: str,
    body: HoldingUpsert,
    user_id: str = Depends(get_current_user),
):
    """Add a holding. If the ticker already exists in this portfolio, update it."""
    await _assert_portfolio_owner(portfolio_id, user_id)

    sb = get_supabase_admin()
    ticker = body.ticker.upper().strip()

    # Check if ticker already exists → update, else insert
    existing = await asyncio.to_thread(
        lambda: sb.table("holdings")
        .select("id")
        .eq("portfolio_id", portfolio_id)
        .eq("ticker", ticker)
        .execute()
    )

    if existing.data:
        holding_id = existing.data[0]["id"]
        result = await asyncio.to_thread(
            lambda: sb.table("holdings")
            .update(
                {
                    "shares": body.shares,
                    "avg_cost": body.avg_cost,
                    "currency": body.currency,
                    "note": body.note,
                }
            )
            .eq("id", holding_id)
            .execute()
        )
    else:
        result = await asyncio.to_thread(
            lambda: sb.table("holdings")
            .insert(
                {
                    "portfolio_id": portfolio_id,
                    "ticker": ticker,
                    "shares": body.shares,
                    "avg_cost": body.avg_cost,
                    "currency": body.currency,
                    "note": body.note,
                }
            )
            .execute()
        )

    return result.data[0]


@router.put("/{portfolio_id}/holdings/{holding_id}")
async def update_holding(
    portfolio_id: str,
    holding_id: str,
    body: HoldingUpdate,
    user_id: str = Depends(get_current_user),
):
    await _assert_portfolio_owner(portfolio_id, user_id)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    sb = get_supabase_admin()
    result = await asyncio.to_thread(
        lambda: sb.table("holdings")
        .update(updates)
        .eq("id", holding_id)
        .eq("portfolio_id", portfolio_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Holding not found")
    return result.data[0]


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=204)
async def delete_holding(
    portfolio_id: str,
    holding_id: str,
    user_id: str = Depends(get_current_user),
):
    await _assert_portfolio_owner(portfolio_id, user_id)
    sb = get_supabase_admin()
    await asyncio.to_thread(
        lambda: sb.table("holdings")
        .delete()
        .eq("id", holding_id)
        .eq("portfolio_id", portfolio_id)
        .execute()
    )
