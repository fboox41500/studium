PYPROJECT=pyproject.toml
DEMO_DIR=web/demo

.PHONY: install run api lint test up down demo-install demo

install:
	uv sync

run: api

api:
	uv run uvicorn studium_api.main:app --reload

lint:
	uv run ruff check src

test:
	uv run pytest

up:
	docker compose up -d

down:
	docker compose down

demo-install:
	npm --prefix $(DEMO_DIR) install

demo:
	npm --prefix $(DEMO_DIR) run dev -- --host
