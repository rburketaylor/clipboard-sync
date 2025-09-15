-- Database initialization script for clipboard sync
-- This script creates the necessary tables and indexes

CREATE TABLE IF NOT EXISTS clips (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('text', 'url')),
    title VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient querying by creation time
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);

-- Insert some sample data for development
INSERT INTO clips (content, type, title) VALUES 
    ('https://example.com', 'url', 'Example Website'),
    ('This is sample text content', 'text', NULL)
ON CONFLICT DO NOTHING;