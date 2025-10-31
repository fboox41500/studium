from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class DatasetModel(BaseModel):
    dataset_id: str = Field(..., examples=["ds-001"])
    name: str
    description: str
    created_at: datetime

    model_config = {
        "extra": "forbid",
    }


class ReactionModel(BaseModel):
    reaction_id: str = Field(..., examples=["rxn-001"])
    dataset_id: str
    name: str
    smiles: str
    temperature_c: float
    yield_percent: float

    model_config = {
        "extra": "forbid",
    }


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[ReactionModel]

    model_config = {
        "extra": "forbid",
    }


class TaskCreateRequest(BaseModel):
    dataset_id: str
    reaction_ids: Optional[List[str]] = None

    model_config = {
        "extra": "forbid",
    }


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None

    model_config = {
        "extra": "forbid",
    }
