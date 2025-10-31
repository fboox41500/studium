"""Application logging configuration."""

from __future__ import annotations

import logging
from logging.config import dictConfig
from typing import Any

from .config import Settings


def _logging_config(level: str) -> dict[str, Any]:
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            }
        },
        "root": {
            "level": level,
            "handlers": ["console"],
        },
    }


def configure_logging(settings: Settings | None = None) -> None:
    """Configure application-wide logging."""

    level = "DEBUG" if settings and settings.debug else "INFO"
    dictConfig(_logging_config(level))
    logging.getLogger(__name__).debug("Logging configured", extra={"level": level})
