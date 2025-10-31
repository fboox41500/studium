PYTHON ?= python3
PACKAGE := ord-service

.PHONY: install lint format format-check test serve docs clean

install:
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -e .[dev]

lint:
	ruff check src tests

format:
	black src tests

format-check:
	black --check src tests

test:
	pytest

serve:
	uvicorn ord_service.app:app --reload

clean:
	rm -rf .pytest_cache __pycache__ src/__pycache__ tests/__pycache__ dist build
