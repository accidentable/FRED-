"""FRED API service — real data fetch + mock fallback."""

from __future__ import annotations
import math
import random
from datetime import datetime, timedelta

from app.config import get_settings
from app.models import DataPoint, FredSeriesData, FredSeriesInfo
from app.data.translations import get_korean_title, FRED_TITLES_KO

# In-memory translation cache so Haiku is called at most once per unknown series ID
_title_cache: dict[str, str] = {}


async def _translate_title_haiku(series_id: str, english_title: str) -> str:
    """Translate an English FRED title to Korean using Claude Haiku. Cached."""
    key = series_id.upper()
    if key in _title_cache:
        return _title_cache[key]
    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import HumanMessage as LCHumanMessage

        settings = get_settings()
        llm = ChatAnthropic(
            model="claude-haiku-4-5-20251001",
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            temperature=0,
            max_tokens=60,
        )
        prompt = (
            f"Translate this FRED economic indicator title to concise Korean (한국어, max 20 chars).\n"
            f"Return ONLY the Korean translation, nothing else.\n\n"
            f"Title: {english_title}"
        )
        resp = await llm.ainvoke([LCHumanMessage(content=prompt)])
        ko = resp.content.strip() if isinstance(resp.content, str) else english_title
        _title_cache[key] = ko
        return ko
    except Exception:
        return english_title


class FredService:
    """Fetches economic data from FRED API with mock fallback."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.FRED_API_KEY
        self._base_url = "https://api.stlouisfed.org/fred"

    # ── Public API ────────────────────────────────────────────────────

    async def get_series_data(self, series_id: str) -> FredSeriesData:
        """Get time-series observations for a FRED series."""
        if not self._api_key:
            return self._mock_data(series_id)

        try:
            import httpx

            async with httpx.AsyncClient() as client:
                # Series info
                info_resp = await client.get(
                    f"{self._base_url}/series",
                    params={
                        "series_id": series_id,
                        "api_key": self._api_key,
                        "file_type": "json",
                    },
                )
                info_data = info_resp.json()
                series_info = info_data["seriess"][0]

                # Observations
                obs_resp = await client.get(
                    f"{self._base_url}/series/observations",
                    params={
                        "series_id": series_id,
                        "api_key": self._api_key,
                        "file_type": "json",
                        "sort_order": "desc",
                        "limit": 100,
                    },
                )
                obs_data = obs_resp.json()

            data_points = [
                DataPoint(date=obs["date"], value=float(obs["value"]))
                for obs in obs_data["observations"]
                if obs["value"] != "."
            ]
            data_points.reverse()

            # Use static map first; fall back to Haiku for unknown series
            eng_title = series_info["title"]
            if series_id.upper() in FRED_TITLES_KO:
                ko_title = FRED_TITLES_KO[series_id.upper()]
            else:
                ko_title = await _translate_title_haiku(series_id, eng_title)

            return FredSeriesData(
                id=series_id,
                title=ko_title,
                units=series_info["units"],
                frequency=series_info["frequency"],
                lastUpdated=series_info["last_updated"].split(" ")[0],
                data=data_points,
            )
        except Exception as e:
            print(f"[FRED API] Error fetching {series_id}: {e}")
            return self._mock_data(series_id)

    async def get_series_info(self, series_id: str) -> FredSeriesInfo | None:
        """Get metadata about a FRED series."""
        if not self._api_key:
            return None

        try:
            import httpx

            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self._base_url}/series",
                    params={
                        "series_id": series_id,
                        "api_key": self._api_key,
                        "file_type": "json",
                    },
                )
                data = resp.json()
                s = data["seriess"][0]

            return FredSeriesInfo(
                id=s["id"],
                title=get_korean_title(s["id"], s["title"]),
                description=s.get("notes", ""),
                category=s.get("frequency", ""),
            )
        except Exception as e:
            print(f"[FRED API] Info error for {series_id}: {e}")
            return None

    async def search_series(self, query: str) -> list[FredSeriesInfo]:
        """Search FRED series by keyword."""
        if not self._api_key:
            return []

        try:
            import httpx

            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self._base_url}/series/search",
                    params={
                        "search_text": query,
                        "api_key": self._api_key,
                        "file_type": "json",
                        "limit": 20,
                    },
                )
                data = resp.json()

            return [
                FredSeriesInfo(
                    id=s["id"],
                    title=get_korean_title(s["id"], s["title"]),
                    description=s.get("notes", ""),
                    category=s.get("frequency", ""),
                )
                for s in data.get("seriess", [])
            ]
        except Exception as e:
            print(f"[FRED API] Search error for {query}: {e}")
            return []

    # ── Mock Data ─────────────────────────────────────────────────────

    @staticmethod
    def _mock_data(series_id: str) -> FredSeriesData:
        """Generate realistic mock data for development."""
        sid = series_id.upper()
        presets: dict[str, dict] = {
            "GDP": dict(value=20000, trend=100, vol=50, title="국내총생산 (GDP)",
                        units="Billions of Dollars", freq="Quarterly"),
            "CPIAUCSL": dict(value=250, trend=0.8, vol=0.5,
                             title="소비자물가지수 (CPI)",
                             units="Index 1982-1984=100", freq="Monthly"),
            "UNRATE": dict(value=4.0, trend=0, vol=0.2, title="실업률",
                           units="Percent", freq="Monthly"),
            "FEDFUNDS": dict(value=5.33, trend=-0.1, vol=0.1,
                             title="연방기금금리",
                             units="Percent", freq="Monthly"),
            "SP500": dict(value=4500, trend=20, vol=100, title="S&P 500",
                          units="Index", freq="Daily"),
            "DGS10": dict(value=4.2, trend=-0.02, vol=0.1,
                          title="미 국채 10년 금리",
                          units="Percent", freq="Daily"),
            "M2SL": dict(value=21000, trend=50, vol=30, title="M2 통화량",
                          units="Billions of Dollars", freq="Monthly"),
            "DCOILWTICO": dict(value=75, trend=-0.5, vol=3,
                               title="WTI 원유 현물 가격",
                               units="Dollars per Barrel", freq="Daily"),
            "VIXCLS": dict(value=18, trend=0, vol=3, title="VIX 변동성 지수",
                           units="Index", freq="Daily"),
        }
        p = presets.get(sid, dict(value=100, trend=1, vol=5,
                                  title=get_korean_title(sid, f"Series: {series_id}"),
                                  units="Index", freq="Monthly"))

        now = datetime.now()
        points: list[DataPoint] = []
        v = p["value"]
        step_months = 3 if p["freq"] == "Quarterly" else 1
        num_points = 50

        for i in range(num_points, -1, -1):
            d = now - timedelta(days=i * step_months * 30)
            if sid == "UNRATE":
                v = 4 + math.sin(i / 10) + random.random() * 0.2
            else:
                v += (random.random() - 0.5) * p["vol"] + p["trend"]
            points.append(DataPoint(date=d.strftime("%Y-%m-%d"), value=round(v, 2)))

        return FredSeriesData(
            id=series_id,
            title=p["title"],
            units=p["units"],
            frequency=p["freq"],
            lastUpdated=now.strftime("%Y-%m-%d"),
            data=points,
        )


# Singleton
fred_service = FredService()
