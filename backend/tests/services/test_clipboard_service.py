"""Unit tests for clipboard service helpers."""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import ClipboardEntry
from app.services.clipboard import (
    ClipboardEntryNotFoundError,
    InvalidClipboardEntryError,
    create_clipboard_entry,
    delete_clipboard_entry,
    list_clipboard_entries,
)
from app.schemas.clipboard_entry import ClipboardEntryCreate


@pytest.fixture()
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def test_create_clipboard_entry_persists_payload(session):
    payload = ClipboardEntryCreate(type="text", content="hello", title="note")

    entry = create_clipboard_entry(session, payload)

    assert entry.id is not None
    assert entry.content == "hello"
    assert session.query(ClipboardEntry).count() == 1


def test_create_clipboard_entry_rejects_invalid_urls(session):
    payload = ClipboardEntryCreate(type="url", content="notaurl", title=None)

    with pytest.raises(InvalidClipboardEntryError):
        create_clipboard_entry(session, payload)

    assert session.query(ClipboardEntry).count() == 0


def test_list_clipboard_entries_returns_descending_order(session):
    from datetime import datetime, timedelta

    base = datetime.utcnow()
    contents = [
        ("first", base),
        ("second", base + timedelta(seconds=1)),
        ("third", base + timedelta(seconds=2)),
    ]
    for content, created_at in contents:
        entry = create_clipboard_entry(
            session,
            ClipboardEntryCreate(type="text", content=content, title=None),
        )
        session.query(ClipboardEntry).filter_by(id=entry.id).update({"created_at": created_at})
    session.commit()

    results = list_clipboard_entries(session, limit=2)

    assert [entry.content for entry in results] == ["third", "second"]


def test_delete_clipboard_entry_removes_record(session):
    entry = create_clipboard_entry(
        session, ClipboardEntryCreate(type="text", content="remove-me", title=None)
    )

    delete_clipboard_entry(session, entry_id=entry.id)

    assert session.query(ClipboardEntry).count() == 0


def test_delete_clipboard_entry_raises_for_missing_id(session):
    with pytest.raises(ClipboardEntryNotFoundError):
        delete_clipboard_entry(session, entry_id=999)
