"""Application settings loaded from environment variables."""
# reload trigger

from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from dotenv import load_dotenv


# Load .env from project root (two levels up from apps/server-py/)
_env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
load_dotenv(dotenv_path=os.path.abspath(_env_path))


class Settings(BaseSettings):
    """Application configuration."""

    # API Keys
    ANTHROPIC_API_KEY: str = ""
    FRED_API_KEY: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Server
    PORT: int = 8080
    # Comma-separated allowed origins, e.g.:
    # "http://localhost:5173,https://your-app.vercel.app,https://yourdomain.com"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # LLM
    LLM_MODEL: str = "claude-sonnet-4-20250514"
    LLM_TEMPERATURE: float = 0.3

    model_config = {"env_file": _env_path, "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
