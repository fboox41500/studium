from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Iterable, List, Optional
import threading


@dataclass(frozen=True)
class Dataset:
    dataset_id: str
    name: str
    description: str
    created_at: datetime


@dataclass(frozen=True)
class Reaction:
    reaction_id: str
    dataset_id: str
    name: str
    smiles: str
    temperature_c: float
    yield_percent: float


class DataStore:
    """Lightweight in-memory stand-in for the ORD persistence layer."""

    def __init__(self) -> None:
        self._datasets: Dict[str, Dataset] = {}
        self._reactions: Dict[str, Reaction] = {}
        self._lock = threading.RLock()

    # ------------------------------------------------------------------
    # mutation helpers
    # ------------------------------------------------------------------
    def seed(self, datasets: Iterable[Dataset], reactions: Iterable[Reaction]) -> None:
        with self._lock:
            self._datasets = {dataset.dataset_id: dataset for dataset in datasets}
            self._reactions = {reaction.reaction_id: reaction for reaction in reactions}

    def add_dataset(self, dataset: Dataset) -> None:
        with self._lock:
            self._datasets[dataset.dataset_id] = dataset

    def add_reaction(self, reaction: Reaction) -> None:
        with self._lock:
            self._reactions[reaction.reaction_id] = reaction

    # ------------------------------------------------------------------
    # read helpers
    # ------------------------------------------------------------------
    def list_datasets(self) -> List[Dataset]:
        with self._lock:
            return sorted(self._datasets.values(), key=lambda item: item.created_at)

    def get_dataset(self, dataset_id: str) -> Optional[Dataset]:
        with self._lock:
            return self._datasets.get(dataset_id)

    def list_reactions_for_dataset(self, dataset_id: str) -> List[Reaction]:
        with self._lock:
            return [reaction for reaction in self._reactions.values() if reaction.dataset_id == dataset_id]

    def get_reaction(self, reaction_id: str) -> Optional[Reaction]:
        with self._lock:
            return self._reactions.get(reaction_id)

    def search_reactions(self, query: str) -> List[Reaction]:
        needle = query.lower().strip()
        with self._lock:
            return [
                reaction
                for reaction in self._reactions.values()
                if needle in reaction.name.lower()
                or needle in reaction.reaction_id.lower()
                or needle in reaction.dataset_id.lower()
                or needle in reaction.smiles.lower()
            ]


def seed_demo_store() -> DataStore:
    """Produce a datastore pre-populated with representative ORD entities."""

    store = DataStore()
    now = datetime.utcnow()

    datasets = [
        Dataset(
            dataset_id="ds-001",
            name="Copper-Catalyzed Couplings",
            description="Benchmark reactions for C-N bond formation using copper catalysts.",
            created_at=now,
        ),
        Dataset(
            dataset_id="ds-002",
            name="Photoredox Explorations",
            description="Light-driven transformations with organocatalysts.",
            created_at=now,
        ),
    ]

    reactions = [
        Reaction(
            reaction_id="rxn-001",
            dataset_id="ds-001",
            name="Buchwald-Hartwig amination",
            smiles="c1ccccc1Br.NH2>>c1ccccc1NH",
            temperature_c=90.0,
            yield_percent=82.0,
        ),
        Reaction(
            reaction_id="rxn-002",
            dataset_id="ds-001",
            name="Chan-Lam coupling of aryl boronate",
            smiles="c1ccccc1B(OH)2.NH2>>c1ccccc1NH",
            temperature_c=25.0,
            yield_percent=67.0,
        ),
        Reaction(
            reaction_id="rxn-101",
            dataset_id="ds-002",
            name="Visible light-mediated cycloaddition",
            smiles="C=C.C=C>>C1=CC=CC=C1",
            temperature_c=20.0,
            yield_percent=45.0,
        ),
    ]

    store.seed(datasets, reactions)
    return store
