"""
SQLAlchemy database models for clipboard sync application.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Clip(Base):
    """
    Database model for clipboard entries.
    
    Represents a single clipboard entry with content, type, optional title,
    and creation timestamp.
    """
    __tablename__ = "clips"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    type = Column(String(10), nullable=False)
    title = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Add constraint to ensure type is either 'text' or 'url'
    __table_args__ = (
        CheckConstraint("type IN ('text', 'url')", name='check_clip_type'),
    )
    
    def __repr__(self):
        return f"<Clip(id={self.id}, type='{self.type}', content='{self.content[:50]}...')>"
    
    def to_dict(self):
        """Convert model instance to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'content': self.content,
            'type': self.type,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }