"""Application configuration powered by Pydantic settings."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Iterable

from dotenv import dotenv_values
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_env_files(paths: Iterable[Path]) -> None:
    """Merge environment files into ``os.environ`` without overriding host values."""

    merged: dict[str, str] = {}
    for path in paths:
        if path.exists():
            values = {
                key: value
                for key, value in dotenv_values(path).items()
                if value is not None
            }
            merged.update(values)

    for key, value in merged.items():
        os.environ.setdefault(key, value)


def _default_env_order() -> list[Path]:
    return [Path(".env"), Path(".env.local")]


_load_env_files(_default_env_order())


class Settings(BaseSettings):
    """Primary application settings model.

    Load order precedence (highest to lowest):

    1. Host environment variables
    2. Variables defined in ``.env.local``
    3. Variables defined in ``.env``
    """

    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="APP_DEBUG")

    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="ord", alias="POSTGRES_DB")
    postgres_user: str = Field(default="ord_user", alias="POSTGRES_USER")
    postgres_password: str = Field(default="ord_password", alias="POSTGRES_PASSWORD")

    ord_interface_postgres: str | None = Field(
        default=None, alias="ORD_INTERFACE_POSTGRES"
    )

    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_db: int = Field(default=0, alias="REDIS_DB")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")

    @computed_field
    def postgres_dsn(self) -> str:
        """Resolve the Postgres DSN used by ord-interface integrations."""

        if self.ord_interface_postgres:
            return self.ord_interface_postgres

        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field
    def resolved_redis_url(self) -> str:
        """Return the Redis URL with sensible defaults."""

        if self.redis_url:
            return self.redis_url

        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance."""

    return Settings()
