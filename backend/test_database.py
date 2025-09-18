"""
Unit tests for database models and connection management.
"""
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import build_test_database_url

try:
    import pytest
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.exc import IntegrityError
    from models import Base, Clip
    from database import DatabaseManager
    PYTEST_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Some dependencies not available: {e}")
    PYTEST_AVAILABLE = False

# Test database configuration (PostgreSQL for testing)
TEST_DATABASE_URL = build_test_database_url()


@pytest.fixture
def test_engine():
    """Create test database engine."""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(bind=engine)  # Clean slate for each test
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def test_session(test_engine):
    """Create test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_db_manager(test_engine):
    """Create test database manager."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    manager = DatabaseManager()
    manager.engine = test_engine
    manager.SessionLocal = TestingSessionLocal
    return manager


class TestClipModel:
    """Test cases for Clip model."""
    
    def test_create_text_clip(self, test_session):
        """Test creating a text clip."""
        clip = Clip(
            content="This is test text content",
            type="text",
            title="Test Text"
        )
        test_session.add(clip)
        test_session.commit()
        
        assert clip.id is not None
        assert clip.content == "This is test text content"
        assert clip.type == "text"
        assert clip.title == "Test Text"
        assert clip.created_at is not None
        assert isinstance(clip.created_at, datetime)
    
    def test_create_url_clip(self, test_session):
        """Test creating a URL clip."""
        clip = Clip(
            content="https://example.com",
            type="url",
            title="Example Website"
        )
        test_session.add(clip)
        test_session.commit()
        
        assert clip.id is not None
        assert clip.content == "https://example.com"
        assert clip.type == "url"
        assert clip.title == "Example Website"
    
    def test_create_clip_without_title(self, test_session):
        """Test creating a clip without title (should be allowed)."""
        clip = Clip(
            content="Content without title",
            type="text"
        )
        test_session.add(clip)
        test_session.commit()
        
        assert clip.id is not None
        assert clip.title is None
    
    def test_clip_content_required(self, test_session):
        """Test that content is required."""
        clip = Clip(type="text")
        test_session.add(clip)
        
        with pytest.raises(IntegrityError):
            test_session.commit()
    
    def test_clip_type_required(self, test_session):
        """Test that type is required."""
        clip = Clip(content="Test content")
        test_session.add(clip)
        
        with pytest.raises(IntegrityError):
            test_session.commit()
    
    def test_invalid_clip_type(self, test_session):
        """Test that invalid clip types are rejected."""
        clip = Clip(
            content="Test content",
            type="invalid_type"
        )
        test_session.add(clip)
        
        with pytest.raises(IntegrityError):
            test_session.commit()
    
    def test_clip_repr(self, test_session):
        """Test clip string representation."""
        clip = Clip(
            content="This is a long piece of content that should be truncated in repr",
            type="text"
        )
        test_session.add(clip)
        test_session.commit()
        
        repr_str = repr(clip)
        assert "Clip(" in repr_str
        assert f"id={clip.id}" in repr_str
        assert "type='text'" in repr_str
        assert "This is a long piece of content that should be tru" in repr_str
    
    def test_clip_to_dict(self, test_session):
        """Test clip to_dict method."""
        clip = Clip(
            content="Test content",
            type="text",
            title="Test Title"
        )
        test_session.add(clip)
        test_session.commit()
        
        clip_dict = clip.to_dict()
        assert clip_dict['id'] == clip.id
        assert clip_dict['content'] == "Test content"
        assert clip_dict['type'] == "text"
        assert clip_dict['title'] == "Test Title"
        assert 'created_at' in clip_dict
        assert isinstance(clip_dict['created_at'], str)  # Should be ISO format string
    
    def test_title_length_constraint(self, test_session):
        """Test that title respects length constraint."""
        # This should work (under 500 chars)
        short_title = "A" * 499
        clip = Clip(
            content="Test content",
            type="text",
            title=short_title
        )
        test_session.add(clip)
        test_session.commit()
        assert clip.title == short_title
        
        # Test that exactly 500 chars works (the limit)
        test_session.rollback()
        exact_limit_title = "A" * 500
        clip2 = Clip(
            content="Test content",
            type="text",
            title=exact_limit_title
        )
        test_session.add(clip2)
        test_session.commit()
        assert clip2.title == exact_limit_title


class TestDatabaseManager:
    """Test cases for DatabaseManager."""
    
    def test_create_tables(self, test_db_manager):
        """Test creating tables."""
        # Tables should already be created by fixture, but test the method
        test_db_manager.create_tables()
        
        # Verify table exists by trying to query it
        session = test_db_manager.get_session()
        try:
            result = session.query(Clip).count()
            assert result == 0  # Should be empty
        finally:
            session.close()
    
    def test_get_session(self, test_db_manager):
        """Test getting database session."""
        session = test_db_manager.get_session()
        assert session is not None
        
        # Test that we can use the session
        clip = Clip(content="Test", type="text")
        session.add(clip)
        session.commit()
        
        assert clip.id is not None
        session.close()
    
    def test_health_check_success(self, test_db_manager):
        """Test successful health check."""
        is_healthy = test_db_manager.health_check()
        assert is_healthy is True
    
    def test_multiple_sessions(self, test_db_manager):
        """Test that multiple sessions work independently."""
        session1 = test_db_manager.get_session()
        session2 = test_db_manager.get_session()
        
        # Add data in session1
        clip1 = Clip(content="Session 1 content", type="text")
        session1.add(clip1)
        session1.commit()
        
        # Query from session2
        clips = session2.query(Clip).all()
        assert len(clips) == 1
        assert clips[0].content == "Session 1 content"
        
        session1.close()
        session2.close()


class TestDatabaseConstraints:
    """Test database constraints and validation."""
    
    def test_clip_type_constraint_text(self, test_session):
        """Test that 'text' type is accepted."""
        clip = Clip(content="Test content", type="text")
        test_session.add(clip)
        test_session.commit()
        assert clip.type == "text"
    
    def test_clip_type_constraint_url(self, test_session):
        """Test that 'url' type is accepted."""
        clip = Clip(content="https://example.com", type="url")
        test_session.add(clip)
        test_session.commit()
        assert clip.type == "url"
    
    def test_created_at_auto_populated(self, test_session):
        """Test that created_at is automatically populated."""
        clip = Clip(content="Test content", type="text")
        test_session.add(clip)
        test_session.commit()
        
        assert clip.created_at is not None
        assert isinstance(clip.created_at, datetime)
        
        # Just verify it's a recent timestamp (within last minute)
        # Use timezone-naive datetime to match what SQLAlchemy returns
        now = datetime.now()
        time_diff = abs((now - clip.created_at).total_seconds())
        assert time_diff < 60  # Should be created within the last minute
    
    def test_id_auto_increment(self, test_session):
        """Test that ID is auto-incremented."""
        clip1 = Clip(content="First clip", type="text")
        clip2 = Clip(content="Second clip", type="text")
        
        test_session.add(clip1)
        test_session.add(clip2)
        test_session.commit()
        
        assert clip1.id is not None
        assert clip2.id is not None
        assert clip2.id > clip1.id


if __name__ == "__main__":
    pytest.main([__file__])
