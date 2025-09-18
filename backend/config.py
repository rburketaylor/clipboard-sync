"""Shared configuration helpers for backend services."""
import os
from typing import Optional

from dotenv import load_dotenv


load_dotenv()


def get_env(name: str, *, required: bool = False, default: Optional[str] = None) -> str:
    """Fetch an environment variable, optionally enforcing its presence."""
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(
            f"Environment variable '{name}' is required but was not provided."
        )
    return value


def _compose_postgres_url(*, user: str, password: str, host: str, port: str, database: str) -> str:
    """Build a PostgreSQL URL from discrete connection parts."""
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


def build_database_url(
    *,
    user_env: str = "POSTGRES_USER",
    password_env: str = "POSTGRES_PASSWORD",
    host_env: str = "POSTGRES_HOST",
    port_env: str = "POSTGRES_PORT",
    db_env: str = "POSTGRES_DB",
    default_host: str = "localhost",
    default_port: str = "5432",
    db_default: Optional[str] = None,
    db_required: bool = True,
) -> str:
    """Create a PostgreSQL connection URL from discrete environment variables."""
    postgres_user = get_env(user_env, required=True)
    postgres_password = get_env(password_env, required=True)
    postgres_host = get_env(host_env, default=default_host) or default_host
    postgres_port = get_env(port_env, default=default_port) or default_port
    postgres_db = get_env(db_env, default=db_default)

    if db_required and not postgres_db:
        raise RuntimeError(
            f"Environment variable '{db_env}' is required but was not provided."
        )

    if not postgres_db:
        postgres_db = db_default or ""

    return _compose_postgres_url(
        user=postgres_user,
        password=postgres_password,
        host=postgres_host,
        port=postgres_port,
        database=postgres_db,
    )


def build_test_database_url() -> str:
    """Create a PostgreSQL URL for the test database, allowing overrides."""
    test_user = get_env("TEST_POSTGRES_USER")
    if not test_user:
        test_user = get_env("POSTGRES_USER", required=True)

    test_password = get_env("TEST_POSTGRES_PASSWORD")
    if not test_password:
        test_password = get_env("POSTGRES_PASSWORD", required=True)

    test_host = get_env("TEST_POSTGRES_HOST")
    if not test_host:
        test_host = get_env("POSTGRES_HOST", default="localhost") or "localhost"

    test_port = get_env("TEST_POSTGRES_PORT")
    if not test_port:
        test_port = get_env("POSTGRES_PORT", default="5432") or "5432"

    test_db = get_env("TEST_DATABASE_NAME", default="clipboard_sync_test") or "clipboard_sync_test"

    return _compose_postgres_url(
        user=test_user,
        password=test_password,
        host=test_host,
        port=test_port,
        database=test_db,
    )


def ensure_leading_slash(path: str) -> str:
    """Ensure a path begins with a forward slash."""
    if not path.startswith("/"):
        return f"/{path}"
    return path
