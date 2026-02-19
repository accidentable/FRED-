"""FRED data API routes."""

from fastapi import APIRouter, HTTPException, Query
from app.services.fred_service import fred_service
from app.data.indicators import INDICATOR_CATEGORIES, MAJOR_INDICATORS

router = APIRouter(prefix="/api/fred", tags=["fred"])


@router.get("/indicators")
async def get_indicators():
    """Get all available economic indicators with categories."""
    return {
        "categories": INDICATOR_CATEGORIES,
        "all": [ind.model_dump() for ind in MAJOR_INDICATORS],
    }


@router.get("/series/{series_id}")
async def get_series_data(series_id: str):
    """Get time-series data for a specific FRED series."""
    try:
        data = await fred_service.get_series_data(series_id)
        return data.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch series data: {e}")


@router.get("/series/{series_id}/info")
async def get_series_info(series_id: str):
    """Get metadata for a FRED series."""
    try:
        info = await fred_service.get_series_info(series_id)
        if info is None:
            return {"error": "No info available (API key not configured)"}
        return info.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch series info: {e}")


@router.get("/search")
async def search_series(q: str = Query(..., description="Search query")):
    """Search FRED series by keyword."""
    try:
        results = await fred_service.search_series(q)
        return [r.model_dump() for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search series: {e}")
