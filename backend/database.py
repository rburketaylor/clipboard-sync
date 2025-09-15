"""
Database connection management and session handling for clipboard sync application.
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from models import Base

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost:5432/clipboard_sync"
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    echo=os.getenv("SQL_DEBUG", "false").lower() == "true"  # Enable SQL logging in debug mode
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """
    Create all database tables defined in models.
    This should be called during application startup.
    """
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """
    Dependency function to get database session.
    
    Yields:
        Session: SQLAlchemy database session
        
    Usage:
        @app.get("/clips")
        def get_clips(db: Session = Depends(get_db)):
            return db.query(Clip).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """
    Get a database session for direct use (not as dependency).
    
    Returns:
        Session: SQLAlchemy database session
        
    Note:
        Remember to close the session when done:
        db = get_db_session()
        try:
            # Use db
        finally:
            db.close()
    """
    return SessionLocal()


class DatabaseManager:
    """
    Database manager class for handling database operations.
    """
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    def create_tables(self):
        """Create all database tables."""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_tables(self):
        """Drop all database tables. Use with caution!"""
        Base.metadata.drop_all(bind=self.engine)
    
    def get_session(self) -> Session:
        """Get a new database session."""
        return self.SessionLocal()
    
    def health_check(self) -> bool:
        """
        Check if database connection is healthy.
        
        Returns:
            bool: True if database is accessible, False otherwise
        """
        try:
            with self.engine.connect() as connection:
                # Use text() for raw SQL to ensure compatibility
                connection.execute(text("SELECT 1"))
            return True
        except Exception:
            return False


# Global database manager instance
db_manager = DatabaseManager()