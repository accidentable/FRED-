"""Pydantic models matching the frontend TypeScript types."""

from __future__ import annotations
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from uuid import uuid4
from typing import Optional


# ─── Enums ────────────────────────────────────────────────────────────
class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ContentType(str, Enum):
    TEXT = "text"
    CHART = "chart"
    LOADING = "loading"
    ERROR = "error"


# ─── FRED Data ────────────────────────────────────────────────────────
class DataPoint(BaseModel):
    date: str
    value: float


class FredSeriesData(BaseModel):
    id: str
    title: str
    units: str
    frequency: str
    data: list[DataPoint]
    lastUpdated: str


class FredSeriesInfo(BaseModel):
    id: str
    title: str
    description: str = ""
    category: Optional[str] = None


# ─── Chat ─────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4())[:8])
    role: MessageRole
    type: ContentType
    content: Optional[str] = None
    data: Optional[FredSeriesData] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class PortfolioHolding(BaseModel):
    ticker: str
    quantity: float
    avgPrice: Optional[float] = None


class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    locale: str = "ko"  # "ko" for Korean (default), "en" for English
    portfolio: list[PortfolioHolding] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Structured response for the 3-panel terminal UI."""
    message: ChatMessage
    sessionId: Optional[str] = None
    logs: list[str] = Field(default_factory=list)
    data_objects: list[FredSeriesInfo] = Field(default_factory=list)
    chart_data: Optional[FredSeriesData] = None
