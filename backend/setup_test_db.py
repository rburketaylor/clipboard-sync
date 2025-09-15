#!/usr/bin/env python3
"""
Setup script for creating test database.
Run this before running tests to ensure the test database exists.
"""
import os
import sys
from sqlalchemy import create_engine, text

# Test database configuration
TEST_DB_NAME = "clipboard_sync_test"
POSTGRES_URL = "postgresql://postgres:password@localhost:5432"
TEST_DATABASE_URL = f"{POSTGRES_URL}/{TEST_DB_NAME}"

def create_test_database():
    """Create the test database if it doesn't exist."""
    try:
        # Connect to PostgreSQL server (not specific database)
        engine = create_engine(f"{POSTGRES_URL}/postgres")
        
        with engine.connect() as conn:
            # Set autocommit mode for database creation
            conn.execute(text("COMMIT"))
            
            # Check if database exists
            result = conn.execute(text(
                "SELECT 1 FROM pg_database WHERE datname = :db_name"
            ), {"db_name": TEST_DB_NAME})
            
            if not result.fetchone():
                # Create database
                conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))
                print(f"Created test database: {TEST_DB_NAME}")
            else:
                print(f"Test database already exists: {TEST_DB_NAME}")
                
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