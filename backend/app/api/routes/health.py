"""Application health-check endpoint."""

from fastapi import APIRouter

from app.db.session import db_manager


router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "database": db_manager.health_check()}
