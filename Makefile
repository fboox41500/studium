PYPROJECT=pyproject.toml

.PHONY: install run lint test up down

install:
	uv sync

run:
	uv run uvicorn studium_api.main:app --reload

lint:
	uv run ruff check src

test:
	uv run pytest

up:
	docker compose up -d

down:
	docker compose down
