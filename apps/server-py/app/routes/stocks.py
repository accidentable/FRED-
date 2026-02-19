"""Stock data API routes — /api/stocks."""

from fastapi import APIRouter, HTTPException, Query
from app.services.stock_service import search_tickers, get_stock_data

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/search")
async def search_stocks(q: str = Query(..., description="Search query for stock tickers")):
    """Search stock tickers by keyword or symbol."""
    try:
        results = search_tickers(q)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stock search failed: {e}")


@router.get("/{ticker}")
async def get_stock(ticker: str):
    """Get stock data including price, change, and history."""
    try:
        data = get_stock_data(ticker.upper())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock data: {e}")
