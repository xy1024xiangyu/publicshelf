"""Application configuration via Pydantic Settings.

Values are read from environment variables or a .env file.
"""

from __future__ import annotations

from typing import List

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://openshelf:openshelf@localhost:5432/openshelf"

    # ── Azure Blob Storage ────────────────────
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "openshelf-books"

    # ── Azure AI Search ───────────────────────
    AZURE_SEARCH_ENDPOINT: str = ""
    AZURE_SEARCH_KEY: str = ""
    AZURE_SEARCH_INDEX_PREFIX: str = "openshelf"

    # ── Redis ─────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── App ───────────────────────────────────
    SECRET_KEY: str = "change-me"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | List[str]) -> List[str]:
        """Accept a comma-separated string or a real list."""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def azure_search_available(self) -> bool:
        return bool(self.AZURE_SEARCH_ENDPOINT and self.AZURE_SEARCH_KEY)


settings = Settings()
