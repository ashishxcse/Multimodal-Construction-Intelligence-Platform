"""
backend/config.py — Centralised settings loaded from .env
All environment variables are accessed exclusively through this module;
never import os.getenv() directly in route handlers or services.
"""
from functools import lru_cache
from pathlib import Path

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_text_model: str = "openai/gpt-oss-120b"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    groq_base_url: Optional[str] = None
    port: int = Field(default=8000, ge=1, le=65535)
    app_env: str = "development"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    max_image_size_mb: int = Field(default=10, ge=1, le=50)

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
        if not origins or "*" in origins:
            raise ValueError("ALLOWED_ORIGINS must contain explicit comma-separated origins.")
        return origins

    @property
    def max_image_size_bytes(self) -> int:
        return self.max_image_size_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    model_config = {
        "env_file": Path(__file__).resolve().parent / ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
