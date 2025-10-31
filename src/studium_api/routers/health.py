"""Health-related endpoints."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="Service health check")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
