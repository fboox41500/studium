from http import HTTPStatus

from fastapi.testclient import TestClient

from ord_interface.api.datastore import DataStore


def test_search_reactions_returns_matches(client: TestClient, test_datastore: DataStore) -> None:
    response = client.get("/reactions/search", params={"query": "coupling"})
    assert response.status_code == HTTPStatus.OK

    payload = response.json()
    assert payload["total"] >= 1
    assert any("coupling" in result["name"].lower() for result in payload["results"])


def test_search_reactions_missing_query_is_invalid(client: TestClient) -> None:
    response = client.get("/reactions/search", params={"query": ""})
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_get_reaction_success(client: TestClient, test_datastore: DataStore) -> None:
    results = test_datastore.search_reactions("Buchwald")
    assert results, "Expected seeded demo data to include a Buchwald reaction"
    known_reaction = results[0]

    response = client.get(f"/reactions/{known_reaction.reaction_id}")
    assert response.status_code == HTTPStatus.OK

    payload = response.json()
    assert payload["reaction_id"] == known_reaction.reaction_id
    assert payload["dataset_id"] == known_reaction.dataset_id


def test_get_reaction_not_found(client: TestClient) -> None:
    response = client.get("/reactions/rxn-does-not-exist")
    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "not found" in response.json()["detail"].lower()
