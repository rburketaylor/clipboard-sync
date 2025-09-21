"""Tests for database session helpers."""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine

from app.db.session import DatabaseManager


def test_health_check_returns_true_on_success():
    engine = create_engine("sqlite://")
    manager = DatabaseManager()
    manager.engine = engine

    assert manager.health_check() is True


def test_health_check_returns_false_on_failure():
    class FailingEngine:
        def connect(self):  # pragma: no cover - simple stub
            raise RuntimeError("boom")

    manager = DatabaseManager()
    manager.engine = FailingEngine()

    assert manager.health_check() is False
