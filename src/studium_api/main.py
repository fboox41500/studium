"""ASGI application entrypoint."""

from __future__ import annotations

import logging
from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI

from .config import Settings, get_settings
from .logging import configure_logging
from .middleware import register_middleware
from .routers import api_router

LOGGER = logging.getLogger(__name__)


def _project_version() -> str:
    try:
        return version("studium-api")
    except PackageNotFoundError:  # pragma: no cover - fallback for local execution without install
        return "0.1.0"


def create_app() -> FastAPI:
    settings = get_settings()
    _configure_runtime(settings)

    app = FastAPI(
        title="Studium ORD API",
        version=_project_version(),
        debug=settings.debug,
    )

    app.state.settings = settings

    register_middleware(app)
    app.include_router(api_router, prefix="/api/v1")

    _register_events(app, settings)

    return app


def _configure_runtime(settings: Settings) -> None:
    configure_logging(settings)


def _register_events(app: FastAPI, settings: Settings) -> None:
    @app.on_event("startup")
    async def _on_startup() -> None:  # pragma: no cover - integration behaviour
        LOGGER.info(
            "Application startup complete",
            extra={"environment": settings.environment, "debug": settings.debug},
        )

    @app.on_event("shutdown")
    async def _on_shutdown() -> None:  # pragma: no cover - integration behaviour
        LOGGER.info("Application shutdown")


app = create_app()
