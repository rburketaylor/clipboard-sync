"""Pydantic schemas describing clipboard entry payloads."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ClipboardEntryBase(BaseModel):
    type: Literal["text", "url"]
    content: str = Field(..., min_length=1, max_length=10_000)
    title: Optional[str] = Field(default=None, max_length=500)


class ClipboardEntryCreate(ClipboardEntryBase):
    """Schema for creating new clipboard entries."""

    pass


class ClipboardEntryRead(ClipboardEntryBase):
    """Schema returned from the API for clipboard entries."""

    id: int
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


__all__ = [
    "ClipboardEntryBase",
    "ClipboardEntryCreate",
    "ClipboardEntryRead",
]
