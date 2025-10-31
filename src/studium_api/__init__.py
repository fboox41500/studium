"""Studium FastAPI application package."""

from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("studium-api")
except PackageNotFoundError:  # pragma: no cover - fallback for local execution without install
    __version__ = "0.1.0"

from .main import create_app, app  # noqa: E402

__all__ = ["create_app", "app", "__version__"]
