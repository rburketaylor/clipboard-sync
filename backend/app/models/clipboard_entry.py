"""SQLAlchemy model for clipboard entries."""
from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class ClipboardEntry(Base):
    """Persisted clipboard entry consisting of text or a URL."""

    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    type = Column(String(10), nullable=False)
    title = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("type IN ('text', 'url')", name="check_clipboard_entry_type"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        content_preview = (self.content or "")[:50]
        return f"<ClipboardEntry id={self.id} type={self.type!r} content={content_preview!r}>"

    def to_dict(self) -> dict[str, object]:
        """Return a serialisable representation for debugging or tests."""

        return {
            "id": self.id,
            "content": self.content,
            "type": self.type,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


__all__ = ["ClipboardEntry"]
