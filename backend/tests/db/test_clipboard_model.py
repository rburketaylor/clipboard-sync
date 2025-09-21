"""Database-level tests for the clipboard entry model and manager."""
from datetime import datetime

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker

from app.core.config import build_test_database_url
from app.db.base import Base
from app.db.session import DatabaseManager
from app.models import ClipboardEntry


TEST_DATABASE_URL = build_test_database_url()


@pytest.fixture
def test_engine():
    engine = create_engine(TEST_DATABASE_URL)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError:
        pytest.skip("Test database is not available; skipping DB integration tests")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def test_session(test_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_db_manager(test_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    manager = DatabaseManager()
    manager.engine = test_engine
    manager.SessionLocal = TestingSessionLocal
    return manager


class TestClipboardEntryModel:
    def test_create_text_entry(self, test_session):
        entry = ClipboardEntry(content="This is test text content", type="text", title="Test Text")
        test_session.add(entry)
        test_session.commit()

        assert entry.id is not None
        assert entry.content == "This is test text content"
        assert entry.type == "text"
        assert entry.title == "Test Text"
        assert entry.created_at is not None
        assert isinstance(entry.created_at, datetime)

    def test_create_url_entry(self, test_session):
        entry = ClipboardEntry(content="https://example.com", type="url", title="Example Website")
        test_session.add(entry)
        test_session.commit()

        assert entry.id is not None
        assert entry.content == "https://example.com"
        assert entry.type == "url"
        assert entry.title == "Example Website"

    def test_create_entry_without_title(self, test_session):
        entry = ClipboardEntry(content="Content without title", type="text")
        test_session.add(entry)
        test_session.commit()

        assert entry.id is not None
        assert entry.title is None

    def test_content_required(self, test_session):
        entry = ClipboardEntry(type="text")
        test_session.add(entry)

        with pytest.raises(IntegrityError):
            test_session.commit()

    def test_type_required(self, test_session):
        entry = ClipboardEntry(content="Test content")
        test_session.add(entry)

        with pytest.raises(IntegrityError):
            test_session.commit()

    def test_invalid_type_rejected(self, test_session):
        entry = ClipboardEntry(content="Test content", type="invalid")
        test_session.add(entry)

        with pytest.raises(IntegrityError):
            test_session.commit()

    def test_repr(self, test_session):
        entry = ClipboardEntry(
            content="This is a long piece of content that should be truncated in repr",
            type="text",
        )
        test_session.add(entry)
        test_session.commit()

        repr_str = repr(entry)
        assert "ClipboardEntry" in repr_str
        assert f"id={entry.id}" in repr_str
        assert "type='text'" in repr_str
        assert "This is a long piece of content that should be" in repr_str

    def test_to_dict(self, test_session):
        entry = ClipboardEntry(content="Test content", type="text", title="Test Title")
        test_session.add(entry)
        test_session.commit()

        entry_dict = entry.to_dict()
        assert entry_dict["id"] == entry.id
        assert entry_dict["content"] == "Test content"
        assert entry_dict["type"] == "text"
        assert entry_dict["title"] == "Test Title"
        assert "created_at" in entry_dict
        assert isinstance(entry_dict["created_at"], str)

    def test_title_length_constraint(self, test_session):
        short_title = "A" * 499
        entry = ClipboardEntry(content="Test content", type="text", title=short_title)
        test_session.add(entry)
        test_session.commit()
        assert entry.title == short_title

        test_session.rollback()
        exact_limit_title = "A" * 500
        entry2 = ClipboardEntry(content="Test content", type="text", title=exact_limit_title)
        test_session.add(entry2)
        test_session.commit()
        assert entry2.title == exact_limit_title


class TestDatabaseManager:
    def test_create_tables(self, test_db_manager):
        test_db_manager.create_tables()

        session = test_db_manager.get_session()
        try:
            result = session.query(ClipboardEntry).all()
            assert isinstance(result, list)
        finally:
            session.close()

    def test_health_check(self, test_db_manager):
        assert test_db_manager.health_check() is True
