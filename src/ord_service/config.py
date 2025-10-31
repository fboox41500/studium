from __future__ import annotations

import os
from functools import lru_cache
from typing import Final


class Settings:
    """Application configuration sourced from environment variables."""

    DEFAULT_DATABASE_URL: Final[str] = "postgresql://localhost:5432/ord"
    DEFAULT_REDIS_URL: Final[str] = "redis://localhost:6379/0"

    def __init__(self) -> None:
        self.database_url = os.environ.get("DATABASE_URL", self.DEFAULT_DATABASE_URL)
        self.redis_url = os.environ.get("REDIS_URL", self.DEFAULT_REDIS_URL)
        self.testing = os.environ.get("ORD_INTERFACE_TESTING", "").upper() == "TRUE"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
