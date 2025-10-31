"""FastAPI router that exposes ord-interface functionality."""
from __future__ import annotations

import gzip
import json
from typing import List, Sequence, Union, cast

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from fastapi.responses import HTMLResponse
from ord_interface.api import search as ord_search
from ord_interface.api import view as ord_view
from ord_interface.api.queries import QueryResult as OrdQueryResult, fetch_reactions
from ord_schema.proto import dataset_pb2

from studium_api.schemas.ord import (
    BackgroundQueryResult,
    BackgroundQueryStatus,
    BackgroundQuerySubmission,
    DatasetRecord,
    MoleculeStatistic,
    ReactionIdBatchRequest,
    ReactionIdListResponse,
    ReactionListResponse,
    ReactionResource,
    ReactionSearchParams,
)
from studium_api.settings import Settings, get_configured_settings


router = APIRouter(
    prefix="/ord",
    tags=["Open Reaction Database"],
    responses={
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid request payload or parameters."},
        status.HTTP_404_NOT_FOUND: {"description": "Requested ORD resource was not found."},
        status.HTTP_502_BAD_GATEWAY: {
            "description": "Failed to reach the underlying ord-interface services."
        },
    },
)


async def _execute_query(
    query: ReactionSearchParams, settings: Settings
) -> tuple[Union[List[OrdQueryResult], List[str]], int | None]:
    """Runs an ord-interface query and returns the results with the applied limit."""

    ord_params = query.to_ord_params(settings)
    try:
        results = await ord_search.run_query(ord_params, return_ids=query.ids_only)
    except ValueError as exc:  # Validation issues raised by ord-interface
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:  # Connectivity or setup issues (e.g., Redis/Postgres failures)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to execute ORD reaction search.",
        ) from exc
    return results, ord_params.limit


@router.get(
    "/reactions/search",
    response_model=Union[ReactionListResponse, ReactionIdListResponse],
    summary="Search ORD reactions",
)
async def search_reactions(
    query: ReactionSearchParams = Depends(),
    settings: Settings = Depends(get_configured_settings),
):
    """Searches reactions stored in the Open Reaction Database."""

    results, limit = await _execute_query(query, settings)
    if query.ids_only:
        reaction_ids = cast(List[str], results)
        return ReactionIdListResponse(reaction_ids=reaction_ids, count=len(reaction_ids), limit=limit)
    reaction_results = cast(List[OrdQueryResult], results)
    return ReactionListResponse(
        results=[ReactionResource.from_query_result(result) for result in reaction_results],
        count=len(reaction_results),
        limit=limit,
    )


@router.get(
    "/reactions/{reaction_id}",
    response_model=ReactionResource,
    summary="Fetch a single reaction",
)
async def get_reaction(
    reaction_id: str,
    settings: Settings = Depends(get_configured_settings),
) -> ReactionResource:
    """Fetches a single reaction from the ORD by its identifier."""

    # Ensure environment is configured even though settings is unused.
    _ = settings
    try:
        result = await ord_search.get_reaction(reaction_id=reaction_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except IndexError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Reaction '{reaction_id}' was not found."
        )
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to retrieve the requested reaction."
        ) from exc
    return ReactionResource.from_query_result(result)


@router.post(
    "/reactions/batch",
    response_model=ReactionListResponse,
    summary="Fetch multiple reactions by ID",
)
async def get_reactions(
    request: ReactionIdBatchRequest,
    settings: Settings = Depends(get_configured_settings),
) -> ReactionListResponse:
    """Fetches multiple reactions in a single call."""

    _ = settings
    try:
        inputs = ord_search.ReactionIdList(reaction_ids=request.reaction_ids)
        results = await ord_search.get_reactions(inputs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch the requested reactions."
        ) from exc
    return ReactionListResponse(
        results=[ReactionResource.from_query_result(result) for result in results],
        count=len(results),
        limit=None,
    )


@router.get(
    "/datasets",
    response_model=List[DatasetRecord],
    summary="List available ORD datasets",
)
async def list_datasets(settings: Settings = Depends(get_configured_settings)) -> List[DatasetRecord]:
    """Returns metadata for all datasets indexed by ord-interface."""

    _ = settings
    try:
        datasets = await ord_search.get_datasets()
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch ORD datasets."
        ) from exc
    return [DatasetRecord.from_dataset_info(dataset) for dataset in datasets]


@router.get(
    "/datasets/{dataset_id}",
    response_model=DatasetRecord,
    summary="Fetch dataset metadata",
)
async def get_dataset(dataset_id: str, settings: Settings = Depends(get_configured_settings)) -> DatasetRecord:
    """Fetches metadata for a single dataset."""

    datasets = await list_datasets(settings=settings)
    for dataset in datasets:
        if dataset.dataset_id == dataset_id:
            return dataset
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Dataset '{dataset_id}' was not found.",
    )


@router.get(
    "/datasets/{dataset_id}/stats/inputs",
    response_model=List[MoleculeStatistic],
    summary="Top SMILES inputs for a dataset",
)
async def dataset_input_statistics(
    dataset_id: str,
    limit: int = Query(30, ge=1, description="Maximum number of records to return."),
    settings: Settings = Depends(get_configured_settings),
) -> List[MoleculeStatistic]:
    """Returns the most frequently used SMILES strings for reaction inputs."""

    effective_limit = min(limit, settings.search_max_limit)
    try:
        stats = await ord_search.get_input_stats(dataset_id=dataset_id, limit=effective_limit)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch input statistics for the dataset.",
        ) from exc
    return [MoleculeStatistic.from_stats_result(result) for result in stats]


@router.get(
    "/datasets/{dataset_id}/stats/products",
    response_model=List[MoleculeStatistic],
    summary="Top SMILES products for a dataset",
)
async def dataset_product_statistics(
    dataset_id: str,
    limit: int = Query(30, ge=1, description="Maximum number of records to return."),
    settings: Settings = Depends(get_configured_settings),
) -> List[MoleculeStatistic]:
    """Returns the most frequently used SMILES strings for reaction products."""

    effective_limit = min(limit, settings.search_max_limit)
    try:
        stats = await ord_search.get_product_stats(dataset_id=dataset_id, limit=effective_limit)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch product statistics for the dataset.",
        ) from exc
    return [MoleculeStatistic.from_stats_result(result) for result in stats]


@router.post(
    "/reactions/download",
    summary="Download reactions as a gzip-compressed Dataset proto",
)
async def download_reactions(
    request: ReactionIdBatchRequest,
    settings: Settings = Depends(get_configured_settings),
) -> Response:
    """Returns a gzip-compressed Dataset proto for the requested reactions."""

    _ = settings
    try:
        inputs = ord_search.ReactionIdList(reaction_ids=request.reaction_ids)
        results = await ord_search.get_reactions(inputs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to assemble the dataset download.",
        ) from exc

    dataset = dataset_pb2.Dataset(
        name="ORD Search Results",
        reactions=[result.reaction for result in results],
    )
    payload = gzip.compress(dataset.SerializeToString())
    headers = {
        "Content-Disposition": f"attachment; filename={settings.dataset_download_filename}",
        "Content-Type": "application/gzip",
    }
    return Response(content=payload, media_type="application/gzip", headers=headers)


@router.post(
    "/reactions/search/background",
    response_model=BackgroundQuerySubmission,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a background reaction search",
)
async def submit_background_search(
    query: ReactionSearchParams = Depends(),
    background_tasks: BackgroundTasks = Depends(),
    settings: Settings = Depends(get_configured_settings),
) -> BackgroundQuerySubmission:
    """Enqueues a reaction search to run asynchronously via ord-interface."""

    if not settings.background_queries_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Background queries are disabled because Redis is not configured.",
        )

    ord_params = query.to_ord_params(settings)
    try:
        task_id = await ord_search.submit_query(background_tasks=background_tasks, params=ord_params)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to submit the background query.",
        ) from exc
    return BackgroundQuerySubmission(task_id=task_id)


async def _fetch_background_results(
    task_id: str,
    ids_only: bool,
) -> tuple[BackgroundQueryStatus, Union[Sequence[str], Sequence[OrdQueryResult], None], int | None]:
    """Fetches results for a background query, if available."""

    try:
        async with ord_search.get_redis() as client:
            exists = await client.exists(f"query:{task_id}")
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Background task '{task_id}' was not found.",
                )
            raw_query = await client.get(f"query:{task_id}")
            query_limit: int | None = None
            if raw_query:
                try:
                    query_payload = json.loads(raw_query)
                    query_limit = query_payload.get("limit")
                except (TypeError, json.JSONDecodeError):
                    query_limit = None
            raw_result = await client.get(f"result:{task_id}")
            if raw_result is None:
                return BackgroundQueryStatus.PENDING, None, query_limit
            try:
                reaction_ids = json.loads(raw_result)
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Stored background query results are not valid JSON.",
                ) from exc
            if not isinstance(reaction_ids, list):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Stored background query results are malformed.",
                )
            reaction_ids = [str(reaction_id) for reaction_id in reaction_ids]
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to communicate with the ORD background task store.",
        ) from exc

    if ids_only:
        return BackgroundQueryStatus.COMPLETE, reaction_ids, query_limit

    try:
        async with ord_search.get_cursor() as cursor:
            reactions = await fetch_reactions(cursor, list(reaction_ids))
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to hydrate background query reaction records.",
        ) from exc

    return BackgroundQueryStatus.COMPLETE, reactions, query_limit


@router.get(
    "/reactions/search/background/{task_id}",
    response_model=BackgroundQueryResult,
    summary="Poll a background reaction search",
)
async def poll_background_search(
    task_id: str,
    ids_only: bool = Query(False, description="Return only reaction identifiers."),
    settings: Settings = Depends(get_configured_settings),
) -> BackgroundQueryResult:
    """Retrieves the status or results of a background query."""

    if not settings.background_queries_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Background queries are disabled because Redis is not configured.",
        )

    status_value, payload, limit = await _fetch_background_results(task_id=task_id, ids_only=ids_only)
    if status_value == BackgroundQueryStatus.PENDING:
        return BackgroundQueryResult(status=BackgroundQueryStatus.PENDING, limit=limit)

    if ids_only:
        reaction_ids = cast(Sequence[str], payload)
        return BackgroundQueryResult(
            status=BackgroundQueryStatus.COMPLETE,
            reaction_ids=list(reaction_ids),
            limit=limit,
        )

    reactions = cast(Sequence[OrdQueryResult], payload)
    return BackgroundQueryResult(
        status=BackgroundQueryStatus.COMPLETE,
        reactions=[ReactionResource.from_query_result(result) for result in reactions],
        limit=limit,
    )


@router.get(
    "/reactions/{reaction_id}/summary",
    response_class=HTMLResponse,
    summary="Render a reaction summary",
)
async def reaction_summary(
    reaction_id: str,
    compact: bool = Query(True, description="Render a compact summary layout."),
    settings: Settings = Depends(get_configured_settings),
) -> HTMLResponse:
    """Proxies the ord-interface HTML reaction summary endpoint."""

    _ = settings
    try:
        html = await ord_view.get_reaction_summary(reaction_id=reaction_id, compact=compact)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Reaction '{reaction_id}' was not found."
        )
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to render the reaction summary via ord-interface.",
        ) from exc
    return HTMLResponse(content=html)


__all__ = ["router"]
