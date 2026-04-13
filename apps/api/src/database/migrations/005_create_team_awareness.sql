-- Migration: Create Team Awareness Tables
-- Date: 2025-11-03
-- Description: Add tables for team activity, status, kudos, mood, skills, and availability

-- ============================================================================
-- User Activity Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'commented', 'completed', 'assigned', 'mentioned', 'shared')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'comment', 'file', 'message', 'milestone', 'goal')),
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

-- ============================================================================
-- User Status Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_status (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Status information
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline', 'in-meeting', 'focus')),
  status_message TEXT,
  status_emoji TEXT,
  
  -- Auto-clear settings
  clear_at TIMESTAMP WITH TIME ZONE,
  
  -- Activity tracking
  last_seen_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  -- Current context
  current_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  current_task_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_status_user_id_idx ON user_status(user_id);
CREATE INDEX IF NOT EXISTS user_status_workspace_id_idx ON user_status(workspace_id);
CREATE INDEX IF NOT EXISTS user_status_status_idx ON user_status(status);

-- Unique constraint: One status per user per workspace
CREATE UNIQUE INDEX IF NOT EXISTS user_status_unique_idx ON user_status(user_id, workspace_id);

-- ============================================================================
-- Kudos Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS kudos (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Participants
  giver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Kudos details
  type TEXT NOT NULL CHECK (type IN ('great-work', 'helpful', 'creative', 'teamwork', 'leadership', 'problem-solving')),
  message TEXT NOT NULL CHECK (length(message) > 0 AND length(message) <= 1000),
  
  -- Recognition context
  related_entity_type TEXT CHECK (related_entity_type IN ('task', 'project', 'sprint', 'milestone')),
  related_entity_id TEXT,
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  
  -- Reactions
  reactions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS kudos_giver_id_idx ON kudos(giver_id);
CREATE INDEX IF NOT EXISTS kudos_receiver_id_idx ON kudos(receiver_id);
CREATE INDEX IF NOT EXISTS kudos_workspace_id_idx ON kudos(workspace_id);
CREATE INDEX IF NOT EXISTS kudos_created_at_idx ON kudos(created_at DESC);

-- ============================================================================
-- Mood Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mood_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Mood data
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'stressed', 'overwhelmed', 'frustrated')),
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  
  -- Optional context
  note TEXT CHECK (length(note) <= 500),
  tags JSONB,
  
  -- Context
  workload_level TEXT CHECK (workload_level IN ('light', 'balanced', 'heavy', 'overloaded')),
  
  -- Anonymity
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS mood_log_user_id_idx ON mood_log(user_id);
CREATE INDEX IF NOT EXISTS mood_log_workspace_id_idx ON mood_log(workspace_id);
CREATE INDEX IF NOT EXISTS mood_log_created_at_idx ON mood_log(created_at DESC);
CREATE INDEX IF NOT EXISTS mood_log_mood_score_idx ON mood_log(mood_score);

-- ============================================================================
-- User Skills Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Skill information
  skill_name TEXT NOT NULL CHECK (length(skill_name) > 0),
  skill_category TEXT CHECK (skill_category IN ('frontend', 'backend', 'design', 'management', 'data', 'devops', 'other')),
  
  -- Proficiency
  proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  proficiency_score INTEGER NOT NULL CHECK (proficiency_score BETWEEN 1 AND 5),
  
  -- Validation
  years_of_experience INTEGER CHECK (years_of_experience >= 0),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Endorsements
  endorsements JSONB,
  endorsement_count INTEGER DEFAULT 0 CHECK (endorsement_count >= 0),
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_skills_user_id_idx ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS user_skills_workspace_id_idx ON user_skills(workspace_id);
CREATE INDEX IF NOT EXISTS user_skills_skill_name_idx ON user_skills(skill_name);
CREATE INDEX IF NOT EXISTS user_skills_category_idx ON user_skills(skill_category);

-- Unique constraint: One skill per user per workspace
CREATE UNIQUE INDEX IF NOT EXISTS user_skills_unique_idx ON user_skills(user_id, workspace_id, skill_name);

-- ============================================================================
-- Team Availability Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Availability details
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick-leave', 'personal', 'meeting', 'focus-time', 'unavailable', 'holiday')),
  title TEXT NOT NULL CHECK (length(title) > 0),
  description TEXT,
  
  -- Time range
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- Recurrence
  recurrence JSONB,
  
  -- Status
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS team_availability_user_id_idx ON team_availability(user_id);
CREATE INDEX IF NOT EXISTS team_availability_workspace_id_idx ON team_availability(workspace_id);
CREATE INDEX IF NOT EXISTS team_availability_dates_idx ON team_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS team_availability_type_idx ON team_availability(type);

-- ============================================================================
-- Activity Feed Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_feed_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Notification preferences
  notify_on_kudos BOOLEAN DEFAULT TRUE,
  notify_on_mentions BOOLEAN DEFAULT TRUE,
  notify_on_updates BOOLEAN DEFAULT TRUE,
  
  -- Feed preferences
  show_own_activity BOOLEAN DEFAULT FALSE,
  show_system_activity BOOLEAN DEFAULT TRUE,
  
  -- Activity filters
  muted_users JSONB,
  muted_projects JSONB,
  
  -- Mood settings
  mood_reminder_enabled BOOLEAN DEFAULT TRUE,
  mood_reminder_time TEXT DEFAULT '09:00',
  mood_reminder_days JSONB DEFAULT '["monday", "wednesday", "friday"]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS activity_feed_settings_user_id_idx ON activity_feed_settings(user_id);
CREATE INDEX IF NOT EXISTS activity_feed_settings_workspace_id_idx ON activity_feed_settings(workspace_id);

-- Unique constraint: One settings record per user per workspace
CREATE UNIQUE INDEX IF NOT EXISTS activity_feed_settings_unique_idx ON activity_feed_settings(user_id, workspace_id);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE user_activity IS 'User activity log for team awareness and feeds';
COMMENT ON TABLE user_status IS 'Real-time user status and availability';
COMMENT ON TABLE kudos IS 'Team recognition and appreciation';
COMMENT ON TABLE mood_log IS 'Team morale and sentiment tracking';
COMMENT ON TABLE user_skills IS 'Team member skills and expertise matrix';
COMMENT ON TABLE team_availability IS 'Team member availability calendar';
COMMENT ON TABLE activity_feed_settings IS 'User preferences for activity feed';

