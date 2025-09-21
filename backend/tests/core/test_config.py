"""Tests for configuration helper utilities."""
from __future__ import annotations

import os

import pytest

from app.core import config


@pytest.fixture(autouse=True)
def clear_cached_settings():
    config.load_settings.cache_clear()
    yield
    config.load_settings.cache_clear()


def test_build_database_url_uses_env_values(monkeypatch):
    monkeypatch.setenv("POSTGRES_USER", "cliuser")
    monkeypatch.setenv("POSTGRES_PASSWORD", "secret")
    monkeypatch.setenv("POSTGRES_HOST", "db.internal")
    monkeypatch.setenv("POSTGRES_PORT", "5433")
    monkeypatch.setenv("POSTGRES_DB", "clipboard")

    url = config.build_database_url()

    assert url == "postgresql://cliuser:secret@db.internal:5433/clipboard"


def test_build_database_url_requires_db_when_flagged(monkeypatch):
    monkeypatch.setenv("POSTGRES_USER", "cliuser")
    monkeypatch.setenv("POSTGRES_PASSWORD", "secret")
    monkeypatch.delenv("POSTGRES_DB", raising=False)

    with pytest.raises(RuntimeError):
        config.build_database_url(db_required=True)


def test_build_test_database_url_prefers_test_overrides(monkeypatch):
    monkeypatch.setenv("POSTGRES_USER", "baseuser")
    monkeypatch.setenv("POSTGRES_PASSWORD", "basepass")
    monkeypatch.setenv("TEST_POSTGRES_USER", "tester")
    monkeypatch.setenv("TEST_POSTGRES_PASSWORD", "testpass")
    monkeypatch.setenv("TEST_POSTGRES_HOST", "test-host")
    monkeypatch.setenv("TEST_POSTGRES_PORT", "7777")
    monkeypatch.setenv("TEST_DATABASE_NAME", "clip_test")

    url = config.build_test_database_url()

    assert url == "postgresql://tester:testpass@test-host:7777/clip_test"


def test_load_settings_caches_results(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("LOG_LEVEL", "warning")

    settings_first = config.load_settings()
    settings_second = config.load_settings()

    assert settings_first is settings_second
    assert not settings_first.is_development
    assert settings_first.log_level == "warning"
