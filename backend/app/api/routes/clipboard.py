"""Clipboard entry API routes."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.clipboard_entry import ClipboardEntryCreate, ClipboardEntryRead
from app.services.clipboard import (
    ClipboardEntryNotFoundError,
    InvalidClipboardEntryError,
    create_clipboard_entry,
    delete_clipboard_entry,
    list_clipboard_entries,
)


router = APIRouter(tags=["clipboard"])


@router.post("/clip", response_model=ClipboardEntryRead, status_code=201)
def create_clip(payload: ClipboardEntryCreate, db: Session = Depends(get_db)) -> ClipboardEntryRead:
    try:
        entry = create_clipboard_entry(db, payload)
    except InvalidClipboardEntryError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ClipboardEntryRead.model_validate(entry)


@router.get("/clips", response_model=List[ClipboardEntryRead])
def list_clips(limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)) -> List[ClipboardEntryRead]:
    entries = list_clipboard_entries(db, limit=limit)
    return [ClipboardEntryRead.model_validate(entry) for entry in entries]


@router.delete("/clip/{entry_id}", status_code=204)
def delete_clip(entry_id: int = Path(..., ge=1), db: Session = Depends(get_db)) -> Response:
    try:
        delete_clipboard_entry(db, entry_id=entry_id)
    except ClipboardEntryNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return Response(status_code=204)
