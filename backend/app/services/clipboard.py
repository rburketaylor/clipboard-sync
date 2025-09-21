"""Domain services for clipboard entry operations."""
from __future__ import annotations

from typing import Iterable, List
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models.clipboard_entry import ClipboardEntry
from app.schemas.clipboard_entry import ClipboardEntryCreate


class ClipboardServiceError(RuntimeError):
    """Base class for clipboard service errors."""


class InvalidClipboardEntryError(ClipboardServiceError):
    """Raised when the supplied clipboard payload fails business rules."""


class ClipboardEntryNotFoundError(ClipboardServiceError):
    """Raised when the requested clipboard entry does not exist."""


def _validate_payload(payload: ClipboardEntryCreate) -> None:
    if payload.type == "url":
        parsed = urlparse(payload.content)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise InvalidClipboardEntryError("content must be a valid URL when type=url")


def create_clipboard_entry(db: Session, payload: ClipboardEntryCreate) -> ClipboardEntry:
    """Persist a new clipboard entry after validating the payload."""

    _validate_payload(payload)

    entry = ClipboardEntry(
        content=payload.content,
        type=payload.type,
        title=payload.title,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_clipboard_entries(db: Session, *, limit: int) -> List[ClipboardEntry]:
    """Return clipboard entries ordered by creation date descending."""

    return (
        db.query(ClipboardEntry)
        .order_by(ClipboardEntry.created_at.desc())
        .limit(limit)
        .all()
    )


def delete_clipboard_entry(db: Session, *, entry_id: int) -> None:
    """Delete an existing clipboard entry."""

    entry = db.query(ClipboardEntry).filter(ClipboardEntry.id == entry_id).first()
    if not entry:
        raise ClipboardEntryNotFoundError(f"Clip with id {entry_id} not found")

    db.delete(entry)
    db.commit()


__all__ = [
    "ClipboardEntryNotFoundError",
    "ClipboardServiceError",
    "InvalidClipboardEntryError",
    "create_clipboard_entry",
    "delete_clipboard_entry",
    "list_clipboard_entries",
]
