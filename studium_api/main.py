"""FastAPI application entry point for the Studium API."""
from __future__ import annotations

from fastapi import FastAPI

from studium_api.routers.ord import router as ord_router
from studium_api.settings import apply_environment, get_settings


TAGS_METADATA = [
    {
        "name": "Open Reaction Database",
        "description": "Operations that proxy ord-interface functionality, including reaction search,"
        " and dataset exploration.",
    }
]


def create_app() -> FastAPI:
    """Application factory used by ASGI servers and tests."""

    app = FastAPI(
        title="Studium API",
        description="Streaming access to ord-interface capabilities via FastAPI.",
        version="0.1.0",
        openapi_tags=TAGS_METADATA,
    )

    @app.on_event("startup")
    async def _configure_ord_environment() -> None:  # pragma: no cover - simple forwarding
        apply_environment(get_settings())

    app.include_router(ord_router)
    return app


app = create_app()


__all__ = ["create_app", "app"]
