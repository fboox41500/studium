"""Reusable FastAPI middleware components."""
from __future__ import annotations

import logging
from typing import Awaitable, Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

from .config import Settings

logger = logging.getLogger(__name__)


class ExceptionHandlingMiddleware(BaseHTTPMiddleware):
    """Catch-all middleware that emits structured error responses."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:  # noqa: BLE001
            if isinstance(exc, HTTPException):
                raise

            logger.exception(
                "Unhandled application error", extra={"path": request.url.path}
            )
            return JSONResponse(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Internal server error",
                    "error_type": exc.__class__.__name__,
                },
            )


def register_middleware(app: FastAPI, settings: Settings) -> None:
    """Attach shared middleware to the provided FastAPI application."""

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(ExceptionHandlingMiddleware)
