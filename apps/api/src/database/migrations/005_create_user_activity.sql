-- Migration: Create User Activity Table
-- Date: 2025-11-03
-- Description: Add user_activity table for team activity tracking

-- ============================================================================
-- User Activity Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_title TEXT,
  
  -- Additional context
  description TEXT,
  metadata JSONB,
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_workspace_id_idx ON user_activity(workspace_id);
CREATE INDEX IF NOT EXISTS user_activity_project_id_idx ON user_activity(project_id);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_entity_idx ON user_activity(entity_type, entity_id);

-- Comment
COMMENT ON TABLE user_activity IS 'User activity log for team awareness and feeds';

