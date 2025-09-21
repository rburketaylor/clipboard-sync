"""Shared FastAPI dependency callables."""
from __future__ import annotations

from app.core.config import Settings, load_settings
from app.db.session import get_db


def get_settings() -> Settings:
    """Return the cached application settings instance."""

    return load_settings()


__all__ = [
    "get_db",
    "get_settings",
]
