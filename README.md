# Studium ORD API & demo

This repository consolidates Studium's Open Reaction Database (ORD) API workstream together with a
minimal React demo. The FastAPI backend wraps the [`ord-interface`](https://github.com/open-reaction-database/ord-interface)
library, while the demo surfaces the most important API flows for quick manual validation.

## Prerequisites

- Python 3.11
- [`uv`](https://github.com/astral-sh/uv) for Python dependency management
- Node.js 18+ and npm (for the Vite demo)
- Docker & Docker Compose (for local Postgres and Redis)

## Getting started

1. **Install Python dependencies**

   ```bash
   make install
   ```

2. **Set up environment configuration**

   ```bash
   cp .env.example .env
   ```

   Adjust values as required. Most scenarios only need the defaults when running against the provided
   Docker services.

3. **Install demo dependencies**

   ```bash
   make demo-install
   ```

4. **Provision local infrastructure (optional but recommended)**

   ```bash
   make up
   ```

   This starts Postgres and Redis with settings that match the defaults in `.env.example` and the ORD interface library.

## Running the stack locally

1. **Launch the API**

   ```bash
   make api
   ```

   The server runs at `http://localhost:8000` with the API mounted under `/api/v1`.

2. **Launch the demo** (in a separate terminal)

   ```bash
   make demo
   ```

   The Vite dev server runs at `http://localhost:5173`, proxied through to the API via Vite's dev proxy. The
   frontend also reads `VITE_API_URL` if you want to point it at a different backend instance.

With both processes running you can:

- See datasets indexed by the ORD interface.
- Run a reaction search scoped to a dataset (optionally "IDs only").
- Fetch reaction details to inspect the raw proto payload returned by the API.

## Configuration reference

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_ENV` | Application environment name | `development` |
| `APP_DEBUG` | Enables verbose logging when `true` | `false` |
| `POSTGRES_HOST` / `POSTGRES_PORT` | Postgres host & port for ORD datasets | `localhost` / `5432` |
| `POSTGRES_DB` | Postgres database name | `ord` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Postgres credentials | `ord_user` / `ord_password` |
| `ORD_INTERFACE_POSTGRES` | Fully qualified Postgres DSN preferred by `ord-interface` | Derived from Postgres settings |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_DB` | Redis connection details | `localhost` / `6379` / `0` |
| `REDIS_SSL` | Toggle SSL for Redis connections | `false` |
| `REDIS_ENABLED` | Globally disable Redis usage | `true` |
| `ORD_BACKGROUND_QUERIES_ENABLED` | Enables background query endpoints | `true` |
| `ORD_DATASET_FILENAME` | Filename for dataset downloads | `ord_search_results.pb.gz` |
| `DEMO_ALLOWED_ORIGINS` | Comma-separated list of demo origins for CORS | `http://localhost:5173` |

Configuration values are loaded in the following precedence (highest first): host environment variables,
`.env.local`, and `.env`.

## Project layout

```
.
├── docker-compose.yml
├── Makefile
├── pyproject.toml
├── src
│   └── studium_api
│       ├── __init__.py
│       ├── config.py
│       ├── logging.py
│       ├── main.py
│       ├── middleware.py
│       └── routers
│           ├── __init__.py
│           ├── health.py
│           └── ord.py
├── web
│   └── demo
│       ├── package.json
│       ├── package-lock.json
│       ├── src/
│       └── vite.config.ts
└── .env.example
```

## Make targets

```bash
make install       # Install Python dependencies via uv
make api           # Run the FastAPI application (reload enabled)
make demo-install  # Install npm dependencies for the demo
make demo          # Start the Vite dev server on http://localhost:5173
make lint          # Run ruff against src/
make test          # Run pytest
make up / down     # Start or stop Docker Compose dependencies
```

## Demo overview

The demo focuses on validating the ORD endpoints exposed by the API:

1. On load it fetches `/api/v1/ord/datasets` to show the available datasets.
2. Selecting a dataset lets you run `/api/v1/ord/reactions/search`, optionally requesting IDs only.
3. Clicking a result or entering an identifier queries `/api/v1/ord/reactions/{reaction_id}` and displays the raw proto payload.

CORS is configured to allow the demo origin (and any comma-separated overrides provided through
`DEMO_ALLOWED_ORIGINS`).

Happy exploring!
