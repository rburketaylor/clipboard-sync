#!/usr/bin/env python3
"""
Setup script for creating test database.
Run this before running tests to ensure the test database exists.
"""
import sys
from sqlalchemy import create_engine, text

from config import build_database_url, build_test_database_url, get_env

# Test database configuration
DEFAULT_TEST_DB_NAME = "clipboard_sync_test"
DEFAULT_ADMIN_DB = "postgres"

TEST_DATABASE_URL = build_test_database_url()
test_db_name = get_env("TEST_DATABASE_NAME", default=DEFAULT_TEST_DB_NAME) or DEFAULT_TEST_DB_NAME
admin_database = get_env("POSTGRES_ADMIN_DB", default=DEFAULT_ADMIN_DB) or DEFAULT_ADMIN_DB

ADMIN_DATABASE_URL = build_database_url(
    db_env="POSTGRES_ADMIN_DB",
    db_default=DEFAULT_ADMIN_DB,
)

def create_test_database():
    """Create the test database if it doesn't exist."""
    try:
        # Connect to PostgreSQL server (admin database)
        engine = create_engine(ADMIN_DATABASE_URL)
        
        with engine.connect() as conn:
            # Set autocommit mode for database creation
            conn.execute(text("COMMIT"))
            
            # Check if database exists
            result = conn.execute(text(
                "SELECT 1 FROM pg_database WHERE datname = :db_name"
            ), {"db_name": test_db_name})
            
            if not result.fetchone():
                # Create database
                conn.execute(text(f"CREATE DATABASE {test_db_name}"))
                print(f"Created test database: {test_db_name}")
            else:
                print(f"Test database already exists: {test_db_name}")
                
    except Exception as e:
        print(f"Error creating test database: {e}")
        print("Make sure PostgreSQL is running and accessible with the configured credentials.")
        sys.exit(1)

def verify_test_database():
    """Verify that the test database is accessible."""
    try:
        engine = create_engine(TEST_DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"Test database is accessible: {TEST_DATABASE_URL}")
        return True
    except Exception as e:
        print(f"Cannot access test database: {e}")
        return False

if __name__ == "__main__":
    print("Setting up test database...")
    create_test_database()
    
    if verify_test_database():
        print("Test database setup complete!")
    else:
        print("Test database setup failed!")
        sys.exit(1)
