"""FastAPI application factory."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import clipboard, health
from app.core.config import load_settings
from app.db.session import db_manager


def create_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title="Clipboard Sync API", version="0.1.0")

    if settings.cors_allow_all:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.on_event("startup")
    def _startup() -> None:
        db_manager.create_tables()

    app.include_router(health.router)
    app.include_router(clipboard.router)

    return app


app = create_app()


__all__ = ["app", "create_app"]
