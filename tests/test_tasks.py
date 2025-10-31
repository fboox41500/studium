import time
from http import HTTPStatus

from fastapi.testclient import TestClient

from ord_interface.api.datastore import DataStore


def test_background_task_flow(client: TestClient, test_datastore: DataStore) -> None:
    dataset = test_datastore.list_datasets()[0]
    reaction_ids = [reaction.reaction_id for reaction in test_datastore.list_reactions_for_dataset(dataset.dataset_id)]

    create_response = client.post(
        "/tasks",
        json={"dataset_id": dataset.dataset_id, "reaction_ids": reaction_ids},
    )
    assert create_response.status_code == HTTPStatus.ACCEPTED
    task_payload = create_response.json()
    task_id = task_payload["task_id"]
    assert task_payload["status"] == "pending"

    # Poll for completion with a generous but short timeout to keep tests snappy.
    deadline = time.time() + 2
    status = task_payload
    while status["status"] in {"pending", "running"} and time.time() < deadline:
        time.sleep(0.05)
        poll_response = client.get(f"/tasks/{task_id}")
        assert poll_response.status_code == HTTPStatus.OK
        status = poll_response.json()

    assert status["status"] == "completed"
    assert status["result"]["processed_count"] == len(reaction_ids)
    assert status["result"]["dataset_id"] == dataset.dataset_id


def test_create_task_with_unknown_dataset(client: TestClient) -> None:
    response = client.post("/tasks", json={"dataset_id": "unknown"})
    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "dataset" in response.json()["detail"].lower()


def test_create_task_with_unknown_reaction(client: TestClient, test_datastore: DataStore) -> None:
    dataset = test_datastore.list_datasets()[0]
    response = client.post(
        "/tasks",
        json={
            "dataset_id": dataset.dataset_id,
            "reaction_ids": ["rxn-missing"],
        },
    )
    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "reactions" in response.json()["detail"].lower()


def test_get_task_with_unknown_id_returns_not_found(client: TestClient) -> None:
    response = client.get("/tasks/task-does-not-exist")
    assert response.status_code == HTTPStatus.NOT_FOUND
