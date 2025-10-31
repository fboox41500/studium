from __future__ import annotations

from contextlib import ExitStack

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request

from ord_interface.api.datastore import DataStore, Dataset, Reaction, seed_demo_store
from ord_interface.api.testing import setup_test_postgres

from .background import TaskManager
from .config import get_settings
from .models import DatasetModel, ReactionModel, SearchResponse, TaskCreateRequest, TaskStatusResponse

app = FastAPI(title="ORD Interface API", version="0.1.0")
settings = get_settings()


@app.on_event("startup")
async def startup_event() -> None:
    stack = ExitStack()
    if settings.testing:
        datastore = stack.enter_context(setup_test_postgres())
    else:
        datastore = seed_demo_store()

    app.state.exit_stack = stack
    app.state.datastore = datastore
    app.state.task_manager = TaskManager()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    stack: ExitStack | None = getattr(app.state, "exit_stack", None)
    if stack:
        stack.close()


# ---------------------------------------------------------------------------
# dependency helpers
# ---------------------------------------------------------------------------

def _require_datastore(request: Request) -> DataStore:
    datastore = getattr(request.app.state, "datastore", None)
    if datastore is None:  # pragma: no cover - guard rail
        raise RuntimeError("Data store has not been initialised")
    return datastore


def _require_task_manager(request: Request) -> TaskManager:
    manager = getattr(request.app.state, "task_manager", None)
    if manager is None:  # pragma: no cover - guard rail
        raise RuntimeError("Task manager has not been initialised")
    return manager


def _dataset_to_model(dataset: Dataset) -> DatasetModel:
    return DatasetModel(
        dataset_id=dataset.dataset_id,
        name=dataset.name,
        description=dataset.description,
        created_at=dataset.created_at,
    )


def _reaction_to_model(reaction: Reaction) -> ReactionModel:
    return ReactionModel(
        reaction_id=reaction.reaction_id,
        dataset_id=reaction.dataset_id,
        name=reaction.name,
        smiles=reaction.smiles,
        temperature_c=reaction.temperature_c,
        yield_percent=reaction.yield_percent,
    )


# ---------------------------------------------------------------------------
# routes
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/datasets", response_model=list[DatasetModel], tags=["datasets"])
def list_datasets(datastore: DataStore = Depends(_require_datastore)) -> list[DatasetModel]:
    datasets = datastore.list_datasets()
    return [_dataset_to_model(dataset) for dataset in datasets]


@app.get(
    "/reactions/search",
    response_model=SearchResponse,
    tags=["reactions"],
)
def search_reactions(
    query: str = Query(..., min_length=1, description="Search text for reactions"),
    datastore: DataStore = Depends(_require_datastore),
) -> SearchResponse:
    matches = datastore.search_reactions(query)
    return SearchResponse(query=query, total=len(matches), results=[_reaction_to_model(item) for item in matches])


@app.get(
    "/reactions/{reaction_id}",
    response_model=ReactionModel,
    tags=["reactions"],
)
def get_reaction(
    reaction_id: str,
    datastore: DataStore = Depends(_require_datastore),
) -> ReactionModel:
    reaction = datastore.get_reaction(reaction_id)
    if reaction is None:
        raise HTTPException(status_code=404, detail=f"Reaction '{reaction_id}' was not found")
    return _reaction_to_model(reaction)


@app.post(
    "/tasks",
    response_model=TaskStatusResponse,
    tags=["tasks"],
    status_code=202,
)
async def create_task(
    payload: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    datastore: DataStore = Depends(_require_datastore),
    manager: TaskManager = Depends(_require_task_manager),
) -> TaskStatusResponse:
    dataset = datastore.get_dataset(payload.dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{payload.dataset_id}' was not found")

    if payload.reaction_ids is None:
        reaction_ids = [reaction.reaction_id for reaction in datastore.list_reactions_for_dataset(dataset.dataset_id)]
    else:
        reaction_ids = payload.reaction_ids

    missing_ids = [reaction_id for reaction_id in reaction_ids if datastore.get_reaction(reaction_id) is None]
    if missing_ids:
        missing = ", ".join(sorted(missing_ids))
        raise HTTPException(status_code=404, detail=f"Reactions not found: {missing}")

    task_id = manager.create_task(dataset_id=dataset.dataset_id, reaction_ids=reaction_ids)
    background_tasks.add_task(manager.process_task, task_id)
    status = manager.get_status(task_id)
    return TaskStatusResponse(**status)


@app.get("/tasks/{task_id}", response_model=TaskStatusResponse, tags=["tasks"])
async def get_task_status(
    task_id: str,
    manager: TaskManager = Depends(_require_task_manager),
) -> TaskStatusResponse:
    try:
        status = manager.get_status(task_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' was not found") from exc
    return TaskStatusResponse(**status)
