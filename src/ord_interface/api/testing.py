from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from .datastore import DataStore, seed_demo_store


@contextmanager
def setup_test_postgres() -> Iterator[DataStore]:
    """Provision an ephemeral datastore for exercising the API in tests.

    The public ORD infrastructure relies on PostgreSQL. For test runs we emulate the
    persistence layer with an in-memory data store that ships with representative
    example content. The context manager mirrors the real helper present in the
    ORD interface project so application code can rely on it without modification.
    """

    previous_value = os.environ.get("ORD_INTERFACE_TESTING")
    os.environ["ORD_INTERFACE_TESTING"] = "TRUE"

    try:
        yield seed_demo_store()
    finally:
        if previous_value is None:
            os.environ.pop("ORD_INTERFACE_TESTING", None)
        else:
            os.environ["ORD_INTERFACE_TESTING"] = previous_value
