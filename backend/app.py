from typing import List, Optional, Literal

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl, ValidationError
from sqlalchemy.orm import Session

from database import get_db, db_manager
from models import Clip
import os


class ClipCreate(BaseModel):
    type: Literal['text', 'url']
    content: str = Field(..., min_length=1, max_length=10_000)
    title: Optional[str] = Field(default=None, max_length=500)

    def validate_business(self):
        if self.type == 'url':
            # Validate URL format using Pydantic
            try:
                HttpUrl.validate_python(self.content)
            except ValidationError:
                raise HTTPException(status_code=422, detail='content must be a valid URL when type=url')


class ClipResponse(BaseModel):
    id: int
    type: str
    content: str
    title: Optional[str]
    created_at: Optional[str]


app = FastAPI(title="Clipboard Sync API", version="0.1.0")


# CORS — permissive in dev for extension testing
if os.getenv("ENVIRONMENT", "development").lower() != "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def _startup():
    # Ensure tables exist
    db_manager.create_tables()


@app.get("/health")
def health():
    db_ok = db_manager.health_check()
    return {"status": "ok", "database": db_ok}


@app.post("/clip", response_model=ClipResponse, status_code=201)
def create_clip(payload: ClipCreate, db: Session = Depends(get_db)):
    payload.validate_business()
    clip = Clip(content=payload.content, type=payload.type, title=payload.title)
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return ClipResponse(
        id=clip.id,
        type=clip.type,
        content=clip.content,
        title=clip.title,
        created_at=clip.created_at.isoformat() if clip.created_at else None,
    )


@app.get("/clips", response_model=List[ClipResponse])
def list_clips(limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    rows = (
        db.query(Clip)
        .order_by(Clip.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        ClipResponse(
            id=c.id,
            type=c.type,
            content=c.content,
            title=c.title,
            created_at=c.created_at.isoformat() if c.created_at else None,
        )
        for c in rows
    ]

