"""FRED-OS Backend — FastAPI Application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.routes import chat, fred, sessions, stocks
from app.routes import chat_stream


# ─── Rate Limiter ──────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


# ─── Lifespan ─────────────────────────────────────────────────────────


def _safe_print(text: str) -> None:
    """Print text safely, handling terminals that don't support Unicode."""
    import sys
    try:
        sys.stdout.buffer.write((text + "\n").encode("utf-8"))
        sys.stdout.buffer.flush()
    except Exception:
        # Fallback: replace unencodable chars
        print(text.encode("ascii", errors="replace").decode("ascii"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    _safe_print("""
+---------------------------------------+
|  FRED-OS  Economic Terminal v1.0.0   |
+---------------------------------------+""")
    _safe_print(f"[OK] FRED-OS Server running on http://localhost:{settings.PORT}")
    _safe_print(f"[OK] LLM Model: {settings.LLM_MODEL}")
    _safe_print(f"[{'OK' if settings.ANTHROPIC_API_KEY else 'ERR'}] ANTHROPIC_API_KEY: {'configured' if settings.ANTHROPIC_API_KEY else 'MISSING'}")
    _safe_print(f"[{'OK' if settings.FRED_API_KEY else 'WARN'}] FRED_API_KEY: {'configured' if settings.FRED_API_KEY else 'not set (using mock data)'}")
    _safe_print("[OK] yfinance: ready")
    _safe_print("[OK] Rate Limit: 60 req/min per IP")
    yield
    _safe_print("[OK] FRED-OS Server shutting down")


# ─── App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="FRED-OS API",
    description="AI-driven Economic Data Analysis Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
settings = get_settings()
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(chat.router)
app.include_router(chat_stream.router)
app.include_router(fred.router)
app.include_router(sessions.router)
app.include_router(stocks.router)


# Health checks
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "FRED Terminal API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# ─── Entry Point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
