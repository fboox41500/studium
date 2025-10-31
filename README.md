# Demo Setup Guide

This repository documents the demo environment for showcasing a FastAPI backend working in tandem with a modern React (Vite) frontend. The guide below walks you through installing dependencies, wiring the two services together locally, configuring environment variables, and preparing a production build. It also highlights the current limitations of the demo and the next improvements that are on the roadmap.

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Install dependencies](#install-dependencies)
4. [Configure environment variables](#configure-environment-variables)
5. [Run the stack locally](#run-the-stack-locally)
6. [Build for production](#build-for-production)
7. [Demo media](#demo-media)
8. [Troubleshooting](#troubleshooting)
9. [Limitations & future enhancements](#limitations--future-enhancements)

---

## Architecture overview

```
┌─────────────────────┐       REST / WebSocket        ┌─────────────────────┐
│  React + Vite app   │  ───────────────────────────▶ │     FastAPI app     │
│ (frontend service)  │   Fetch API / Axios requests  │ (backend service)   │
└─────────────────────┘                               └─────────────────────┘
           ▲                                                      │
           │                                      Database / 3rd party APIs
           └──────────────────────────────────────────────────────┘
```

- **Frontend**: A Vite-powered React application that consumes the FastAPI routes.
- **Backend**: A FastAPI service exposing REST endpoints (and optional WebSocket channels) and serving OpenAPI docs at `/docs`.
- **Cross-service communication**: Local development uses CORS to allow `http://localhost:5173` to talk to `http://localhost:8000`.

---

## Prerequisites

| Tool | Recommended version | Notes |
| --- | --- | --- |
| [Python](https://www.python.org/downloads/) | 3.10 or later | Used for the FastAPI backend. |
| [pip](https://pip.pypa.io/en/stable/) or [uv](https://github.com/astral-sh/uv) | latest | Dependency installer. |
| [Node.js](https://nodejs.org/en/) | 18.x LTS or newer | Needed for the Vite frontend. |
| [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) / [pnpm](https://pnpm.io/) | npm ≥ 9 or pnpm ≥ 8 | Package manager for the frontend. |
| [Git](https://git-scm.com/downloads) | any recent | To clone the repository. |

> 💡 **macOS tip**: If you use [asdf](https://asdf-vm.com/) for version management, add the `python` and `nodejs` plugins and run `asdf install` from the project root.

---

## Install dependencies

Clone your fork of the repository and switch to the `docs/demo-setup` branch if you are not already on it:

```bash
git clone <your-fork-url> demo-workspace
cd demo-workspace
git checkout docs/demo-setup
```

### Backend (FastAPI)

1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   ```
2. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
   If you are starting from scratch, the minimal requirements file should include:
   ```text
   fastapi
   uvicorn[standard]
   python-dotenv
   httpx
   ```

### Frontend (React + Vite)

1. Move into the frontend workspace and install packages:
   ```bash
   cd frontend
   npm install
   # or
   pnpm install
   ```
2. Return to the project root when you are done installing packages:
   ```bash
   cd ..
   ```

---

## Configure environment variables

Create environment files for both services so they can discover runtime configuration.

### Backend configuration

Copy the example file and adjust values as needed:

```bash
cp backend/.env.example backend/.env
```

If the example file is missing, create `backend/.env` manually using the template below:

```ini
# backend/.env
DATABASE_URL=sqlite+aiosqlite:///./demo.db
SECRET_KEY=super-secret-key-change-me
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=info
```

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Optional | Connection string for your relational database. Use SQLite for the demo. | `sqlite+aiosqlite:///./demo.db` |
| `SECRET_KEY` | ✅ | Secret used to sign JWTs / sessions. | `super-secret-key-change-me` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | Overrides default token lifetime. | `30` |
| `CORS_ORIGINS` | Optional | Comma-separated origins granted CORS access. | `http://localhost:5173` |
| `LOG_LEVEL` | Optional | Logging verbosity (`debug`, `info`, ...). | `info` |

> The FastAPI app reads the `.env` file on start and falls back to sane defaults when optional keys are missing.

### Frontend configuration

Create the Vite env file (note the `VITE_` prefix):

```bash
cp frontend/.env.example frontend/.env
```

If the example file is missing, create `frontend/.env` manually using the template below:

```ini
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_MOCKS=false
VITE_SENTRY_DSN=
```

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | ✅ | Base URL for the FastAPI backend. | `http://localhost:8000` |
| `VITE_ENABLE_MOCKS` | Optional | Toggle MSW mock handlers for isolated UI tests. | `false` |
| `VITE_SENTRY_DSN` | Optional | DSN used for error tracking. | *(leave blank for local dev)* |

---

## Run the stack locally

Open two terminal windows or tabs—one for the backend and one for the frontend.

### 1. Start the FastAPI backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- The interactive API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).
- Hot reloading is enabled so the server restarts when you change Python files.

### 2. Start the Vite frontend

```bash
cd frontend
npm run dev -- --host
# or with pnpm
pnpm run dev --host
```

- The React application launches at [http://localhost:5173](http://localhost:5173).
- When the backend is running, API calls proxied through `VITE_API_BASE_URL` resolve against the FastAPI service.

### 3. Verify end-to-end functionality

1. Visit the frontend URL and log in using the seeded demo user (`demo@example.com` / `demo-password`).
2. Navigate through the dashboard to see live data pulled from FastAPI endpoints.
3. Open your browser dev tools to confirm network requests are hitting `http://localhost:8000` with successful responses.

---

## Build for production

### Backend build

1. Freeze dependencies (optional):
   ```bash
   pip install pip-tools
   pip-compile backend/requirements.in
   pip-sync backend/requirements.txt
   ```
2. Run database migrations (if you use Alembic):
   ```bash
   alembic upgrade head
   ```
3. Start the production server (example using Uvicorn workers):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

### Frontend build

```bash
cd frontend
npm run build
```

The compiled assets are emitted to `frontend/dist`. If you want FastAPI to serve the static files, copy the build into a directory FastAPI exposes (e.g., `backend/app/static`) and add an additional route that mounts `StaticFiles`.

### Docker (optional)

A single Docker Compose file can orchestrate both services:

```yaml
docker-compose up --build
```

- The backend Dockerfile should install Python dependencies and expose port `8000`.
- The frontend Dockerfile should run `npm run build` and serve via a lightweight HTTP server such as `nginx` or `caddy`.

---

## Demo media

| View | Preview |
| --- | --- |
| Dashboard overview | ![Frontend dashboard screenshot](https://placehold.co/1200x675/283845/FFFFFF?text=Dashboard+Overview) |
| Filtering workflow | ![Filtering workflow GIF](https://placehold.co/800x450/22313F/FFFFFF.gif?text=Interactive+Filter+Demo) |
| Mobile breakpoints | ![Mobile layout screenshot](https://placehold.co/450x800/1B263B/FFFFFF?text=Mobile+Layout) |

> Replace the placeholders with real captures by adding assets under `docs/assets/` once they are available.

---

## Troubleshooting

| Symptom | Possible fix |
| --- | --- |
| `ModuleNotFoundError: No module named 'app'` | Ensure you run `uvicorn` from the `backend` directory or add the project root to `PYTHONPATH`. |
| `CORS` errors in browser console | Confirm `CORS_ORIGINS` includes the frontend origin and restart the backend. |
| `npm run dev` fails with port in use | Stop other Vite instances or set `VITE_PORT` in `frontend/.env`. |
| 404s from API calls | Check that the backend server is running on port `8000` and the `VITE_API_BASE_URL` matches. |

---

## Limitations & future enhancements

- **Demo only**: The repository currently contains documentation and scaffolding notes; the sample app source lives in a private package. Publish the starter code or provide downloadable artifacts for a smoother onboarding experience.
- **Authentication depth**: The demo uses hard-coded demo users. Integrate OAuth or email-based login for production readiness.
- **Deployment automation**: CI/CD workflows for building and deploying containers are not yet defined. Add GitHub Actions covering linting, tests, and image publishing.
- **Observability**: No logging/metrics stack is bundled. Consider adding OpenTelemetry exporters and dashboards.
- **Testing coverage**: End-to-end tests (Playwright/Cypress) and contract tests between frontend and backend are still on the backlog.

Have ideas or found an issue? Open a ticket or reach out to the maintainers team.
