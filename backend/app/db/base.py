"""Declarative base definition for SQLAlchemy models."""

from sqlalchemy.orm import declarative_base


Base = declarative_base()


__all__ = ["Base"]
