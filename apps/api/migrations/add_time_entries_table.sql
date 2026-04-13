-- Migration: Add time_entries table for time tracking functionality
-- Date: October 14, 2025

CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_email ON time_entries(user_email);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_active ON time_entries(is_active);

-- Add foreign key constraints (optional, depends on your setup)
-- ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_task_id 
--   FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

COMMENT ON TABLE time_entries IS 'Time tracking entries for tasks';
COMMENT ON COLUMN time_entries.id IS 'Unique identifier for time entry';
COMMENT ON COLUMN time_entries.task_id IS 'Reference to the task being tracked';
COMMENT ON COLUMN time_entries.user_email IS 'Email of user who logged the time';
COMMENT ON COLUMN time_entries.description IS 'Optional description of work performed';
COMMENT ON COLUMN time_entries.start_time IS 'When time tracking started';
COMMENT ON COLUMN time_entries.end_time IS 'When time tracking ended (null if still active)';
COMMENT ON COLUMN time_entries.duration IS 'Duration in minutes';
COMMENT ON COLUMN time_entries.is_active IS 'Whether this timer is currently running';