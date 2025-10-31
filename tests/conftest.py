import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

# Ensure the application boots in testing mode before it is imported.
os.environ.setdefault("ORD_INTERFACE_TESTING", "TRUE")

from ord_interface.api.datastore import DataStore  # noqa: E402
from ord_interface.api.testing import setup_test_postgres  # noqa: E402
from ord_service.app import app  # noqa: E402


@pytest.fixture(scope="session")
def test_datastore() -> Iterator[DataStore]:
    with setup_test_postgres() as store:
        yield store


@pytest.fixture()
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
