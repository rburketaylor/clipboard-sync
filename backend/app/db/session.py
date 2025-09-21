"""Database session management for Clipboard Sync."""
from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import build_database_url
from app.db.base import Base


DATABASE_URL = build_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=os.getenv("SQL_DEBUG", "false").lower() == "true",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    """Create all database tables defined by the ORM models."""

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """Return a database session for imperative usage."""

    return SessionLocal()


class DatabaseManager:
    """Utility wrapper around the SQLAlchemy engine for lifecycle tasks."""

    def __init__(self) -> None:
        self.engine = engine
        self.SessionLocal = SessionLocal

    def create_tables(self) -> None:
        Base.metadata.create_all(bind=self.engine)

    def drop_tables(self) -> None:
        Base.metadata.drop_all(bind=self.engine)

    def get_session(self) -> Session:
        return self.SessionLocal()

    def health_check(self) -> bool:
        try:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception:
            return False


db_manager = DatabaseManager()


__all__ = [
    "DATABASE_URL",
    "DatabaseManager",
    "SessionLocal",
    "create_tables",
    "db_manager",
    "engine",
    "get_db",
    "get_db_session",
]
