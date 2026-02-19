"""Stock data service using yfinance.

Provides:
- Ticker search by keyword
- Current price + basic info
- Historical data for charting
"""

from __future__ import annotations

import yfinance as yf
from functools import lru_cache
from typing import Any

# ─── Popular Tickers (for search suggestions) ───────────────────────

POPULAR_TICKERS: list[dict[str, str]] = [
    {"ticker": "AAPL", "name": "Apple Inc."},
    {"ticker": "MSFT", "name": "Microsoft Corporation"},
    {"ticker": "GOOGL", "name": "Alphabet Inc."},
    {"ticker": "AMZN", "name": "Amazon.com Inc."},
    {"ticker": "NVDA", "name": "NVIDIA Corporation"},
    {"ticker": "TSLA", "name": "Tesla Inc."},
    {"ticker": "META", "name": "Meta Platforms Inc."},
    {"ticker": "NFLX", "name": "Netflix Inc."},
    {"ticker": "JPM", "name": "JPMorgan Chase & Co."},
    {"ticker": "V", "name": "Visa Inc."},
    {"ticker": "JNJ", "name": "Johnson & Johnson"},
    {"ticker": "WMT", "name": "Walmart Inc."},
    {"ticker": "PG", "name": "Procter & Gamble Co."},
    {"ticker": "MA", "name": "Mastercard Inc."},
    {"ticker": "DIS", "name": "The Walt Disney Company"},
    {"ticker": "BAC", "name": "Bank of America Corp."},
    {"ticker": "XOM", "name": "Exxon Mobil Corporation"},
    {"ticker": "COST", "name": "Costco Wholesale Corp."},
    {"ticker": "KO", "name": "The Coca-Cola Company"},
    {"ticker": "PEP", "name": "PepsiCo Inc."},
]


def search_tickers(query: str) -> list[dict[str, Any]]:
    """Search tickers by keyword — returns matches from popular list + yfinance lookup."""
    q = query.upper().strip()
    results: list[dict[str, Any]] = []

    # 1) Local match from popular tickers
    for t in POPULAR_TICKERS:
        if q in t["ticker"] or q.lower() in t["name"].lower():
            results.append(t)

    # 2) If query looks like a ticker (1-5 uppercase letters), try yfinance directly
    if len(q) <= 5 and q.isalpha() and not any(r["ticker"] == q for r in results):
        try:
            info = _get_ticker_fast_info(q)
            if info and info.get("name"):
                results.insert(0, {"ticker": q, "name": info["name"]})
        except Exception:
            pass

    return results[:20]


def get_stock_data(ticker: str) -> dict[str, Any]:
    """Get stock data: price, change, info, and recent history."""
    tk = yf.Ticker(ticker)

    try:
        info = tk.info or {}
    except Exception:
        info = {}

    # Fast info for price
    try:
        fast = tk.fast_info
        price = float(fast.get("lastPrice", 0) or fast.get("last_price", 0) or 0)
        prev_close = float(fast.get("previousClose", 0) or fast.get("previous_close", 0) or 0)
    except Exception:
        price = info.get("currentPrice", info.get("regularMarketPrice", 0)) or 0
        prev_close = info.get("previousClose", info.get("regularMarketPreviousClose", 0)) or 0

    change = price - prev_close if prev_close else 0
    change_pct = (change / prev_close * 100) if prev_close else 0

    # Historical data (6 months, daily)
    try:
        hist = tk.history(period="6mo", interval="1d")
        history = [
            {"date": str(idx.date()), "value": round(row["Close"], 2)}
            for idx, row in hist.iterrows()
        ]
    except Exception:
        history = []

    return {
        "ticker": ticker.upper(),
        "name": info.get("shortName", info.get("longName", ticker.upper())),
        "price": round(price, 2),
        "previousClose": round(prev_close, 2),
        "change": round(change, 2),
        "changePercent": round(change_pct, 2),
        "marketCap": info.get("marketCap"),
        "sector": info.get("sector", ""),
        "industry": info.get("industry", ""),
        "history": history,
    }


@lru_cache(maxsize=100)
def _get_ticker_fast_info(ticker: str) -> dict[str, Any] | None:
    """Cached quick info lookup for search."""
    try:
        tk = yf.Ticker(ticker)
        info = tk.info
        if info and info.get("shortName"):
            return {"name": info["shortName"], "ticker": ticker}
    except Exception:
        pass
    return None
