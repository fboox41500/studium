# Studium ORD FastAPI Service

This repository contains the groundwork for Studium's ORD-facing FastAPI service. The goal is to provide a structured and easily extensible starting point for exposing ORD-integrated functionality.

## Prerequisites

- Python 3.11
- [uv](https://github.com/astral-sh/uv) for dependency management and script execution
- Docker & Docker Compose (for local infrastructure services)

## Getting Started

1. **Clone and install dependencies**

   ```bash
   uv sync
   ```

   The command will create a virtual environment (if required) and install all runtime and development dependencies declared in `pyproject.toml`.

2. **Provide configuration**

   Copy the environment template and adjust values for your environment:

   ```bash
   cp .env.example .env
   ```

   Environment values are resolved in the following order (highest precedence first):

   1. Host environment variables (e.g. `export POSTGRES_HOST=...`)
   2. Variables declared in `.env.local`
   3. Variables declared in `.env`

   This precedence ensures sensitive overrides can live in `.env.local` without changing shared defaults.

3. **Run the FastAPI application**

   ```bash
   uv run uvicorn studium_api.main:app --reload
   ```

   Alternatively, leverage the provided Makefile target:

   ```bash
   make run
   ```

4. **Bring up local infrastructure (Postgres + Redis)**

   ```bash
   docker compose up -d
   ```

   By default, services are exposed on `localhost` with credentials compatible with the ORD interface defaults. The application will connect using the values defined in your configuration.

## Configuration reference

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_ENV` | Application environment name | `development` |
| `APP_DEBUG` | Enables verbose logging when `true` | `false` |
| `POSTGRES_HOST` / `POSTGRES_PORT` | Postgres host & port for ORD datasets | `localhost` / `5432` |
| `POSTGRES_DB` | Postgres database name | `ord` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Postgres credentials | `ord_user` / `ord_password` |
| `ORD_INTERFACE_POSTGRES` | Fully qualified Postgres DSN preferred by `ord-interface` | auto-generated from the above |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_DB` | Redis connection details | `localhost` / `6379` / `0` |
| `REDIS_URL` | Override Redis DSN | auto-generated from host/port/db |

## Project Layout

```
.
├── docker-compose.yml
├── Makefile
├── pyproject.toml
├── README.md
├── src
│   └── studium_api
│       ├── __init__.py
│       ├── config.py
│       ├── logging.py
│       ├── main.py
│       └── routers
│           ├── __init__.py
│           └── health.py
└── .env.example
```

- `studium_api.main` exposes the ASGI `app` instance and encapsulates application setup.
- `studium_api.config` provides strongly-typed configuration loading powered by Pydantic settings.
- `studium_api.logging` defines shared logging configuration.
- `studium_api.routers` houses modular route definitions; only placeholders exist for now.

## Makefile Targets

```bash
make install    # Install dependencies using uv
make run        # Start the FastAPI app with auto-reload
make lint       # Run ruff (requires uv sync --dev)
make test       # Run pytest
make down       # Stop docker-compose services
```

## Next Steps

- Flesh out routers with concrete ORD-facing endpoints.
- Extend configuration schemas as new services are integrated.
- Implement authentication, authorization, and observability as needed.

Happy building!
