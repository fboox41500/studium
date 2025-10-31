from http import HTTPStatus

from fastapi.testclient import TestClient

from ord_interface.api.datastore import DataStore


def test_list_datasets_returns_seeded_content(client: TestClient, test_datastore: DataStore) -> None:
    response = client.get("/datasets")
    assert response.status_code == HTTPStatus.OK

    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == len(test_datastore.list_datasets())
    dataset_ids = {item["dataset_id"] for item in payload}
    assert dataset_ids == {dataset.dataset_id for dataset in test_datastore.list_datasets()}
