"""Router registration for the Studium API."""

from fastapi import APIRouter

from . import health

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])

__all__ = ["api_router"]
