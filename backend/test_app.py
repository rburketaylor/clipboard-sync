"""API integration tests for FastAPI routes."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import app
from database import get_db, db_manager
from models import Base, Clip


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    try:
        yield
    finally:
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.rollback()

    app.dependency_overrides[get_db] = override_get_db
    original_create_tables = db_manager.create_tables
    db_manager.create_tables = lambda: None
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.pop(get_db, None)
    db_manager.create_tables = original_create_tables


def test_delete_existing_clip_removes_record(test_client, db_session):
    clip = Clip(content="Test clip", type="text", title="sample")
    db_session.add(clip)
    db_session.commit()

    response = test_client.delete(f"/clip/{clip.id}")

    assert response.status_code == 204
    db_session.expire_all()
    assert db_session.query(Clip).filter(Clip.id == clip.id).first() is None


def test_delete_missing_clip_returns_404(test_client):
    response = test_client.delete("/clip/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Clip with id 9999 not found"


def test_deleted_clip_not_listed(test_client, db_session):
    clip = Clip(content="Another clip", type="text", title="to remove")
    db_session.add(clip)
    db_session.commit()

    delete_response = test_client.delete(f"/clip/{clip.id}")
    assert delete_response.status_code == 204

    db_session.expire_all()
    list_response = test_client.get("/clips")
    assert list_response.status_code == 200
    ids = [item["id"] for item in list_response.json()]
    assert clip.id not in ids
