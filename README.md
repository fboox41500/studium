# ORD Interface Service

A lightweight FastAPI service that exposes curated slices of the [Open Reaction Database](https://open-reaction-database.github.io/) (ORD). The application is intentionally designed to run in local developer environments without depending on external infrastructure while keeping the public API identical to the production deployment.

## Features

- Dataset catalogue and individual reaction lookups.
- Text search across reactions, matched on names, identifiers and SMILES strings.
- A background task endpoint that mimics long-running processing workflows.
- First-class developer tooling (pytest, ruff, black) wired through the `Makefile`.
- Docker and Docker Compose definitions for container-based development.

---

## Prerequisites

- Python 3.11 or later.
- [pip](https://pip.pypa.io/) and virtualenv/venv (recommended).
- Optional for container-based workflows: Docker Engine 24+ and Docker Compose v2.
- Optional for full infrastructure parity: PostgreSQL 15+ and Redis 7+.

The service defaults to an in-memory datastore and `fakeredis` during development so you can run the application and test suite without provisioning databases. When ready to integrate with external services, set the appropriate `DATABASE_URL` and `REDIS_URL` values and disable testing mode.

---

## Getting started

Clone the repository and install dependencies into a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
make install
```

The `install` target upgrades `pip` and performs an editable install with the `dev` extra so that pytest, ruff and black are available.

### Useful Makefile targets

| Command            | Description                                  |
|--------------------|----------------------------------------------|
| `make install`     | Install the service along with dev tooling.   |
| `make lint`        | Run ruff against `src/` and `tests/`.         |
| `make format`      | Format code with black.                       |
| `make format-check`| Dry-run formatting checks.                    |
| `make test`        | Execute the pytest suite.                     |
| `make serve`       | Launch the FastAPI app with Uvicorn reload.   |

---

## Running the application locally

Ensure the testing flag is enabled so the application boots with the bundled fixtures:

```bash
export ORD_INTERFACE_TESTING=TRUE
uvicorn ord_service.app:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Interactive documentation is served automatically by FastAPI:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### Example requests

List datasets:

```bash
curl http://127.0.0.1:8000/datasets
```

Search for reactions:

```bash
http --json GET :8000/reactions/search query=='coupling'
```

Fetch a single reaction:

```bash
curl http://127.0.0.1:8000/reactions/rxn-001
```

Kick off a background task and poll for completion:

```bash
TASK_ID=$(curl -X POST :8000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"dataset_id": "ds-001"}' | jq -r '.task_id')

http GET :8000/tasks/$TASK_ID
```

---

## Testing

The pytest suite exercises the key API flows using FastAPI's `TestClient`. Fixtures automatically:

1. Set `ORD_INTERFACE_TESTING=TRUE` so startup uses in-memory data.
2. Invoke `ord_interface.api.testing.setup_test_postgres()` to provision a temporary datastore populated with representative datasets and reactions.
3. Provide a `fakeredis`-backed task manager so background jobs execute without external services.

Run the suite with:

```bash
make test
# or
pytest
```

All tests should pass locally before raising a pull request.

---

## Branch workflow

- The `main` branch tracks production-ready code.
- Feature work should occur on topic branches named `feat/<description>` or `fix/<description>`.
- Keep branches rebased on top of `main` to reduce merge conflicts.
- Open a pull request once tests and linting pass locally. Include a summary, testing evidence, and links to relevant tickets.
- Squash merge commits to maintain a clean history unless a linear history is specifically required.

---

## Deployment with Docker Compose

A `docker-compose.yml` file is provided to showcase a containerised topology that includes PostgreSQL and Redis:

```bash
docker compose up --build
```

By default the API container keeps `ORD_INTERFACE_TESTING=TRUE`, meaning it still uses the in-memory fixtures. When you are ready to connect to external services:

1. Create and migrate the PostgreSQL schema (outside the scope of this demo).
2. Disable testing mode by setting `ORD_INTERFACE_TESTING=FALSE`.
3. Ensure `DATABASE_URL` and `REDIS_URL` point at reachable services.

The Compose stack exposes the API on port `8000`, PostgreSQL on `5432`, and Redis on `6379`.

---

## Environment variables

| Variable                 | Purpose                                                   | Default                                             |
|--------------------------|-----------------------------------------------------------|-----------------------------------------------------|
| `ORD_INTERFACE_TESTING`  | Enables the in-memory datastore & fakeredis for tests.    | `FALSE` (set to `TRUE` for local development/tests) |
| `DATABASE_URL`           | Connection string for PostgreSQL.                         | `postgresql://localhost:5432/ord`                   |
| `REDIS_URL`              | Redis connection URL.                                     | `redis://localhost:6379/0`                          |

---

## Roadmap

- Replace the in-memory shim with the real ORD persistence layer.
- Integrate with a production-grade Redis instance to coordinate background jobs.
- Expand the API surface with reaction creation & dataset management endpoints.
