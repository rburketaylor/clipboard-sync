"""API integration tests for clipboard routes."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import create_app
from app.api.deps import get_db
from app.db.base import Base
from app.db.session import db_manager
from app.models import ClipboardEntry


app = create_app()

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
    entry = ClipboardEntry(content="Test clip", type="text", title="sample")
    db_session.add(entry)
    db_session.commit()

    response = test_client.delete(f"/clip/{entry.id}")

    assert response.status_code == 204
    db_session.expire_all()
    assert db_session.query(ClipboardEntry).filter(ClipboardEntry.id == entry.id).first() is None


def test_delete_missing_clip_returns_404(test_client):
    response = test_client.delete("/clip/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Clip with id 9999 not found"


def test_deleted_clip_not_listed(test_client, db_session):
    entry = ClipboardEntry(content="Another clip", type="text", title="to remove")
    db_session.add(entry)
    db_session.commit()

    delete_response = test_client.delete(f"/clip/{entry.id}")
    assert delete_response.status_code == 204

    db_session.expire_all()
    list_response = test_client.get("/clips")
    assert list_response.status_code == 200
    ids = [item["id"] for item in list_response.json()]
    assert entry.id not in ids


def test_create_clip_accepts_valid_text_payload(test_client, db_session):
    payload = {"type": "text", "content": "Some captured text", "title": "Snippet"}

    response = test_client.post("/clip", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "text"
    assert body["content"] == payload["content"]
    assert body["title"] == "Snippet"

    db_session.expire_all()
    persisted = db_session.query(ClipboardEntry).filter_by(id=body["id"]).first()
    assert persisted is not None


@pytest.mark.parametrize(
    "payload,detail",
    [
        (
            {"type": "url", "content": "notaurl", "title": "bad"},
            "content must be a valid URL when type=url",
        ),
        (
            {"type": "url", "content": "ftp://example.com"},
            "content must be a valid URL when type=url",
        ),
    ],
)
def test_create_clip_rejects_invalid_url_payload(test_client, payload, detail):
    response = test_client.post("/clip", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == detail


def test_list_clips_returns_descending_order_and_respects_limit(test_client, db_session):
    from datetime import datetime, timedelta

    base = datetime.utcnow()
    entries = []
    for idx in range(5):
        entry = ClipboardEntry(content=f"clip-{idx}", type="text", title=f"t{idx}")
        entry.created_at = base + timedelta(seconds=idx)
        entries.append(entry)
    for entry in entries:
        db_session.add(entry)
        db_session.flush()
    db_session.commit()

    list_response = test_client.get("/clips", params={"limit": 3})
    assert list_response.status_code == 200
    body = list_response.json()
    assert len(body) == 3

    returned_ids = [item["id"] for item in body]
    assert returned_ids == sorted(returned_ids, reverse=True)


@pytest.mark.parametrize("limit", [0, 101])
def test_list_clips_enforces_limit_bounds(test_client, limit):
    response = test_client.get("/clips", params={"limit": limit})

    assert response.status_code == 422
