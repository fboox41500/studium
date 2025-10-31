"""Application configuration powered by Pydantic settings."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Iterable, MutableMapping

from dotenv import dotenv_values
from pydantic import AliasChoices, Field, computed_field, field_validator
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
    """Strongly typed application configuration."""

    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("APP_ENV"),
    )
    debug: bool = Field(
        default=False,
        validation_alias=AliasChoices("APP_DEBUG"),
    )

    ord_postgres_dsn: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "STUDIUM_ORD_POSTGRES_DSN",
            "ORD_INTERFACE_POSTGRES",
            "ORD_POSTGRES_DSN",
        ),
        description="Fully qualified PostgreSQL DSN used by ord-interface.",
    )
    postgres_host: str = Field(
        default="localhost",
        validation_alias=AliasChoices(
            "STUDIUM_POSTGRES_HOST",
            "ORD_POSTGRES_HOST",
            "POSTGRES_HOST",
        ),
    )
    postgres_port: int = Field(
        default=5432,
        validation_alias=AliasChoices(
            "STUDIUM_POSTGRES_PORT",
            "ORD_POSTGRES_PORT",
            "POSTGRES_PORT",
        ),
    )
    postgres_db: str = Field(
        default="ord",
        validation_alias=AliasChoices(
            "STUDIUM_POSTGRES_DATABASE",
            "ORD_POSTGRES_DATABASE",
            "POSTGRES_DB",
        ),
    )
    postgres_user: str = Field(
        default="ord_user",
        validation_alias=AliasChoices(
            "STUDIUM_POSTGRES_USER",
            "ORD_POSTGRES_USER",
            "POSTGRES_USER",
        ),
    )
    postgres_password: str = Field(
        default="ord_password",
        validation_alias=AliasChoices(
            "STUDIUM_POSTGRES_PASSWORD",
            "ORD_POSTGRES_PASSWORD",
            "POSTGRES_PASSWORD",
        ),
    )

    redis_host: str | None = Field(
        default="localhost",
        validation_alias=AliasChoices(
            "STUDIUM_REDIS_HOST",
            "ORD_REDIS_HOST",
            "REDIS_HOST",
        ),
    )
    redis_port: int = Field(
        default=6379,
        validation_alias=AliasChoices(
            "STUDIUM_REDIS_PORT",
            "ORD_REDIS_PORT",
            "REDIS_PORT",
        ),
    )
    redis_db: int = Field(
        default=0,
        validation_alias=AliasChoices(
            "STUDIUM_REDIS_DB",
            "ORD_REDIS_DB",
            "REDIS_DB",
        ),
    )
    redis_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "STUDIUM_REDIS_URL",
            "ORD_REDIS_URL",
            "REDIS_URL",
        ),
    )
    redis_ssl: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "STUDIUM_REDIS_SSL",
            "ORD_REDIS_SSL",
            "REDIS_SSL",
        ),
    )
    redis_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "STUDIUM_REDIS_ENABLED",
            "ORD_REDIS_ENABLED",
            "REDIS_ENABLED",
        ),
    )

    background_queries_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "STUDIUM_ORD_BACKGROUND_QUERIES_ENABLED",
            "ORD_BACKGROUND_QUERIES_ENABLED",
        ),
    )
    search_default_limit: int = Field(
        default=1000,
        ge=1,
        validation_alias=AliasChoices(
            "STUDIUM_ORD_SEARCH_DEFAULT_LIMIT",
            "ORD_SEARCH_DEFAULT_LIMIT",
        ),
    )
    search_max_limit: int = Field(
        default=1000,
        ge=1,
        validation_alias=AliasChoices(
            "STUDIUM_ORD_SEARCH_MAX_LIMIT",
            "ORD_SEARCH_MAX_LIMIT",
        ),
    )
    dataset_download_filename: str = Field(
        default="ord_search_results.pb.gz",
        validation_alias=AliasChoices(
            "STUDIUM_ORD_DATASET_FILENAME",
            "ORD_DATASET_FILENAME",
        ),
    )
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
        validation_alias=AliasChoices(
            "STUDIUM_DEMO_ORIGINS",
            "DEMO_ALLOWED_ORIGINS",
            "CORS_ALLOWED_ORIGINS",
        ),
        description="Origins permitted to access the API via CORS.",
    )

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def _coerce_origins(cls, value: list[str] | str | None) -> list[str]:
        if value is None:
            return ["http://localhost:5173"]
        if isinstance(value, str):
            parts = [origin.strip() for origin in value.split(",") if origin.strip()]
            return parts or ["http://localhost:5173"]
        return value

    @computed_field
    def postgres_dsn(self) -> str:
        """Resolve the Postgres DSN used by ord-interface integrations."""

        if self.ord_postgres_dsn:
            return self.ord_postgres_dsn

        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field
    def resolved_redis_url(self) -> str | None:
        """Return the Redis URL with sensible defaults."""

        if self.redis_url:
            return self.redis_url
        if not self.redis_host:
            return None
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @computed_field
    def redis_configured(self) -> bool:
        """Returns True when Redis connectivity is fully configured."""

        return bool(self.redis_enabled and self.redis_host)

    @computed_field
    def background_queries_available(self) -> bool:
        """Returns True when background ORD queries can be executed."""

        return bool(self.background_queries_enabled and self.redis_configured)


def apply_environment(settings: Settings, environ: MutableMapping[str, str] | None = None) -> None:
    """Propagate configuration to the process environment for ord-interface."""

    environ = environ or os.environ

    updates: dict[str, str] = {}
    if settings.ord_postgres_dsn:
        updates["ORD_INTERFACE_POSTGRES"] = settings.ord_postgres_dsn
    else:
        updates["ORD_INTERFACE_POSTGRES"] = settings.postgres_dsn
        if settings.postgres_host:
            updates["POSTGRES_HOST"] = settings.postgres_host
        updates["POSTGRES_PORT"] = str(settings.postgres_port)
        if settings.postgres_user:
            updates["POSTGRES_USER"] = settings.postgres_user
        if settings.postgres_password:
            updates["POSTGRES_PASSWORD"] = settings.postgres_password
        if settings.postgres_db:
            updates["POSTGRES_DATABASE"] = settings.postgres_db

    if settings.redis_configured and settings.redis_host:
        updates["REDIS_HOST"] = settings.redis_host
        updates["REDIS_PORT"] = str(settings.redis_port)
        updates["REDIS_DB"] = str(settings.redis_db)
        updates["REDIS_SSL"] = "1" if settings.redis_ssl else "0"
        resolved = settings.resolved_redis_url
        if resolved:
            updates["REDIS_URL"] = resolved

    if updates:
        environ.update({key: value for key, value in updates.items() if value is not None})


def _build_settings() -> Settings:
    """Factory to create a Settings instance."""

    settings = Settings()
    apply_environment(settings)
    return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance."""

    return _build_settings()


def get_configured_settings() -> Settings:
    """FastAPI dependency that applies ord-interface environment configuration."""

    settings = get_settings()
    apply_environment(settings)
    return settings


__all__ = [
    "Settings",
    "apply_environment",
    "get_settings",
    "get_configured_settings",
]
