"""Pydantic models used by the ORD router."""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

from studium_api.settings import Settings


class ComponentTarget(str, Enum):
    """Supported component search targets."""

    INPUT = "input"
    OUTPUT = "output"


class ComponentMatchMode(str, Enum):
    """Search match modes for component queries."""

    EXACT = "exact"
    SIMILAR = "similar"
    SUBSTRUCTURE = "substructure"
    SMARTS = "smarts"


class ReactionComponentFilter(BaseModel):
    """Component-level search constraints."""

    pattern: str = Field(
        ..., description="SMILES or SMARTS pattern to match against reaction components."
    )
    target: ComponentTarget = Field(
        ComponentTarget.INPUT,
        description="Which part of the reaction to inspect (input or output components).",
    )
    mode: ComponentMatchMode = Field(
        ComponentMatchMode.SUBSTRUCTURE,
        description="How to interpret the pattern when matching components.",
    )

    def to_ord_spec(self) -> str:
        """Returns the ord-interface component spec string."""

        return ";".join((self.pattern, self.target.name, self.mode.name))


class ReactionSearchParams(BaseModel):
    """Query parameters accepted by the reaction search endpoint."""

    dataset_ids: Optional[List[str]] = Field(
        default=None,
        description="Limit results to specific dataset identifiers.",
    )
    reaction_ids: Optional[List[str]] = Field(
        default=None,
        description="Restrict results to explicit reaction identifiers.",
    )
    reaction_smarts: Optional[str] = Field(
        default=None,
        description="SMARTS query applied to reaction structures.",
    )
    min_conversion: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Lower bound on reported conversion percentage.",
    )
    max_conversion: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Upper bound on reported conversion percentage.",
    )
    min_yield: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Lower bound on reported yield percentage.",
    )
    max_yield: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Upper bound on reported yield percentage.",
    )
    doi: Optional[List[str]] = Field(
        default=None,
        description="Filter reactions originating from the provided DOI values.",
    )
    components: Optional[List[ReactionComponentFilter]] = Field(
        default=None,
        description="Component-level substructure or similarity filters.",
    )
    use_stereochemistry: Optional[bool] = Field(
        default=None,
        description="Toggle stereochemistry awareness for component substructure queries.",
    )
    similarity: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Similarity threshold used for similarity component queries.",
    )
    limit: Optional[int] = Field(
        default=None,
        ge=1,
        description="Maximum number of reactions to return.",
    )
    ids_only: bool = Field(
        default=False,
        description="Return only matched reaction identifiers instead of full records.",
    )

    class Config:
        allow_population_by_field_name = True

    def to_ord_params(self, settings: Settings):
        """Constructs an ord-interface QueryParams instance."""

        from ord_interface.api import search as ord_search

        if (
            self.min_conversion is not None
            and self.max_conversion is not None
            and self.min_conversion > self.max_conversion
        ):
            raise ValueError("min_conversion cannot be greater than max_conversion")
        if self.min_yield is not None and self.max_yield is not None and self.min_yield > self.max_yield:
            raise ValueError("min_yield cannot be greater than max_yield")

        limit = self.limit or settings.search_default_limit
        if limit:
            limit = min(limit, settings.search_max_limit)

        component_specs = None
        if self.components:
            component_specs = [component.to_ord_spec() for component in self.components]

        return ord_search.QueryParams(
            dataset_id=self.dataset_ids,
            reaction_id=self.reaction_ids,
            reaction_smarts=self.reaction_smarts,
            min_conversion=self.min_conversion,
            max_conversion=self.max_conversion,
            min_yield=self.min_yield,
            max_yield=self.max_yield,
            doi=self.doi,
            component=component_specs,
            use_stereochemistry=self.use_stereochemistry,
            similarity=self.similarity,
            limit=limit,
        )


class ReactionResource(BaseModel):
    """Serialized representation of a reaction result."""

    dataset_id: str = Field(..., description="Dataset identifier containing the reaction.")
    reaction_id: str = Field(..., description="Unique reaction identifier within the dataset.")
    proto: str = Field(
        ..., description="Base64 encoded Reaction protocol buffer payload from the ORD schema."
    )

    @classmethod
    def from_query_result(cls, result) -> "ReactionResource":
        """Builds a response model from ord-interface QueryResult objects."""

        return cls(dataset_id=result.dataset_id, reaction_id=result.reaction_id, proto=result.proto)


class ReactionListResponse(BaseModel):
    """Response envelope for reaction searches."""

    results: List[ReactionResource] = Field(..., description="Matched reaction records.")
    count: int = Field(..., description="Number of reactions returned in this response.")
    limit: Optional[int] = Field(
        default=None,
        description="Effective result limit applied to the search.",
    )


class ReactionIdListResponse(BaseModel):
    """Response envelope for ID-only reaction searches."""

    reaction_ids: List[str] = Field(..., description="Ordered list of matched reaction identifiers.")
    count: int = Field(..., description="Number of identifiers returned.")
    limit: Optional[int] = Field(
        default=None,
        description="Effective result limit applied to the search.",
    )


class ReactionIdBatchRequest(BaseModel):
    """Request body accepting a batch of reaction identifiers."""

    reaction_ids: List[str] = Field(..., min_items=1, description="Identifiers of reactions to retrieve.")


class DatasetRecord(BaseModel):
    """Metadata describing an ORD dataset."""

    dataset_id: str
    name: str
    description: Optional[str]
    num_reactions: int

    @classmethod
    def from_dataset_info(cls, dataset_info) -> "DatasetRecord":
        """Converts ord-interface DatasetInfo objects to API responses."""

        return cls(
            dataset_id=dataset_info.dataset_id,
            name=dataset_info.name,
            description=dataset_info.description,
            num_reactions=dataset_info.num_reactions,
        )


class MoleculeStatistic(BaseModel):
    """Aggregated frequency data for SMILES usage within a dataset."""

    smiles: str
    times_appearing: int

    @classmethod
    def from_stats_result(cls, result) -> "MoleculeStatistic":
        """Converts ord-interface StatsResult instances into API responses."""

        return cls(smiles=result.smiles, times_appearing=result.times_appearing)


class BackgroundQuerySubmission(BaseModel):
    """Response returned after scheduling a background ORD query."""

    task_id: str = Field(..., description="Identifier used to poll background query results.")


class BackgroundQueryStatus(str, Enum):
    """Enum describing the state of a background ORD query."""

    PENDING = "pending"
    COMPLETE = "complete"


class BackgroundQueryResult(BaseModel):
    """Polling response for background ORD queries."""

    status: BackgroundQueryStatus = Field(..., description="Current state of the background query.")
    reactions: Optional[List[ReactionResource]] = Field(
        default=None,
        description="Full reaction records when the query has completed.",
    )
    reaction_ids: Optional[List[str]] = Field(
        default=None,
        description="Reaction identifiers returned in lieu of full records when requested.",
    )
    limit: Optional[int] = Field(
        default=None,
        description="Effective result limit applied to the query.",
    )


__all__ = [
    "ReactionSearchParams",
    "ReactionComponentFilter",
    "ReactionResource",
    "ReactionListResponse",
    "ReactionIdListResponse",
    "ReactionIdBatchRequest",
    "DatasetRecord",
    "MoleculeStatistic",
    "BackgroundQuerySubmission",
    "BackgroundQueryResult",
    "BackgroundQueryStatus",
    "ComponentTarget",
    "ComponentMatchMode",
]
