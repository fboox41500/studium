"""Application configuration for the Studium API."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import MutableMapping, Optional

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Runtime configuration backed by environment variables."""

    ord_postgres_dsn: Optional[str] = Field(
        default=None,
        description="Fully qualified PostgreSQL DSN used by ord-interface.",
    )
    postgres_host: Optional[str] = Field(
        default=None,
        description="PostgreSQL host used when a DSN is not provided.",
    )
    postgres_user: Optional[str] = Field(
        default=None,
        description="PostgreSQL username for ord-interface connections.",
    )
    postgres_password: Optional[str] = Field(
        default=None,
        description="PostgreSQL password for ord-interface connections.",
    )
    postgres_database: Optional[str] = Field(
        default=None,
        description="PostgreSQL database name for ord-interface connections.",
    )
    redis_host: Optional[str] = Field(
        default=None,
        description="Redis host for background ord-interface tasks.",
    )
    redis_port: int = Field(
        default=6379,
        description="Redis port for background ord-interface tasks.",
    )
    redis_ssl: bool = Field(
        default=False,
        description="Whether Redis connections should use SSL/TLS.",
    )
    redis_enabled: bool = Field(
        default=True,
        description="Master switch for enabling Redis usage.",
    )
    background_queries_enabled: bool = Field(
        default=True,
        description="Whether asynchronous background query submission is allowed.",
    )
    search_default_limit: int = Field(
        default=1000,
        description="Default result limit applied to ORD reaction searches.",
        ge=1,
    )
    search_max_limit: int = Field(
        default=1000,
        description="Upper bound enforced on ORD reaction search limits.",
        ge=1,
    )
    dataset_download_filename: str = Field(
        default="ord_search_results.pb.gz",
        description="Filename used when downloading search results as a dataset archive.",
    )

    class Config:
        env_file = ".env"
        case_sensitive = False
        fields = {
            "ord_postgres_dsn": {
                "env": [
                    "STUDIUM_ORD_POSTGRES_DSN",
                    "ORD_INTERFACE_POSTGRES",
                    "ORD_POSTGRES_DSN",
                ]
            },
            "postgres_host": {
                "env": ["STUDIUM_POSTGRES_HOST", "ORD_POSTGRES_HOST", "POSTGRES_HOST"]
            },
            "postgres_user": {
                "env": ["STUDIUM_POSTGRES_USER", "ORD_POSTGRES_USER", "POSTGRES_USER"]
            },
            "postgres_password": {
                "env": [
                    "STUDIUM_POSTGRES_PASSWORD",
                    "ORD_POSTGRES_PASSWORD",
                    "POSTGRES_PASSWORD",
                ]
            },
            "postgres_database": {
                "env": [
                    "STUDIUM_POSTGRES_DATABASE",
                    "ORD_POSTGRES_DATABASE",
                    "POSTGRES_DATABASE",
                ]
            },
            "redis_host": {
                "env": ["STUDIUM_REDIS_HOST", "ORD_REDIS_HOST", "REDIS_HOST"]
            },
            "redis_port": {
                "env": ["STUDIUM_REDIS_PORT", "ORD_REDIS_PORT", "REDIS_PORT"]
            },
            "redis_ssl": {
                "env": ["STUDIUM_REDIS_SSL", "ORD_REDIS_SSL", "REDIS_SSL"]
            },
            "redis_enabled": {
                "env": ["STUDIUM_REDIS_ENABLED", "ORD_REDIS_ENABLED"]
            },
            "background_queries_enabled": {
                "env": [
                    "STUDIUM_ORD_BACKGROUND_QUERIES_ENABLED",
                    "ORD_BACKGROUND_QUERIES_ENABLED",
                ]
            },
            "search_default_limit": {
                "env": ["STUDIUM_ORD_SEARCH_DEFAULT_LIMIT", "ORD_SEARCH_DEFAULT_LIMIT"]
            },
            "search_max_limit": {
                "env": ["STUDIUM_ORD_SEARCH_MAX_LIMIT", "ORD_SEARCH_MAX_LIMIT"]
            },
            "dataset_download_filename": {
                "env": ["STUDIUM_ORD_DATASET_FILENAME", "ORD_DATASET_FILENAME"]
            },
        }

    @property
    def redis_configured(self) -> bool:
        """Returns True when Redis connectivity is fully configured."""

        return bool(self.redis_enabled and self.redis_host)

    @property
    def background_queries_available(self) -> bool:
        """Returns True when background ORD queries can be executed."""

        return bool(self.background_queries_enabled and self.redis_configured)


def apply_environment(settings: Settings, environ: MutableMapping[str, str] | None = None) -> None:
    """Propagates configuration to the process environment for ord-interface."""

    environ = environ or os.environ

    updates: dict[str, str] = {}
    if settings.ord_postgres_dsn:
        updates["ORD_INTERFACE_POSTGRES"] = settings.ord_postgres_dsn
    else:
        if settings.postgres_host:
            updates["POSTGRES_HOST"] = settings.postgres_host
        if settings.postgres_user:
            updates["POSTGRES_USER"] = settings.postgres_user
        if settings.postgres_password:
            updates["POSTGRES_PASSWORD"] = settings.postgres_password
        if settings.postgres_database:
            updates["POSTGRES_DATABASE"] = settings.postgres_database

    if settings.redis_host:
        updates["REDIS_HOST"] = settings.redis_host
        updates["REDIS_PORT"] = str(settings.redis_port)
        updates["REDIS_SSL"] = "1" if settings.redis_ssl else "0"

    if updates:
        environ.update(updates)


def _build_settings() -> Settings:
    """Factory to create a Settings instance."""

    settings = Settings()
    # Ensure the ord-interface environment is configured immediately.
    apply_environment(settings)
    return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Returns the cached application settings."""

    return _build_settings()


def get_configured_settings() -> Settings:
    """FastAPI dependency that ensures ord-interface has the correct environment."""

    settings = get_settings()
    apply_environment(settings)
    return settings


__all__ = [
    "Settings",
    "apply_environment",
    "get_settings",
    "get_configured_settings",
]
