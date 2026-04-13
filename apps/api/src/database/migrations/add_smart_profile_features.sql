-- Migration: Add Smart Profile Features
-- Created: 2025-10-31
-- Purpose: Add tables for enhanced profile analytics, badges, work history, and statistics

-- 1. Profile Views (Who viewed your profile)
CREATE TABLE IF NOT EXISTS profile_views (
  id TEXT PRIMARY KEY,
  profile_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT, -- 'search', 'project', 'team', 'direct', 'notification'
  duration INTEGER DEFAULT 0, -- seconds spent viewing
  sections_viewed JSONB, -- ['overview', 'skills', 'achievements']
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  is_anonymous BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_source ON profile_views(source);

-- 2. Profile Optimization Suggestions
CREATE TABLE IF NOT EXISTS profile_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'skill', 'bio', 'picture', 'experience', 'education'
  suggestion_text TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  impact_score INTEGER, -- 1-100
  is_dismissed BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_profile_suggestions_user ON profile_suggestions(user_id, is_dismissed, is_completed);
CREATE INDEX IF NOT EXISTS idx_profile_suggestions_priority ON profile_suggestions(user_id, priority, is_dismissed);

-- 3. User Availability Status
CREATE TABLE IF NOT EXISTS user_availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'available', -- 'available', 'away', 'busy', 'do_not_disturb', 'offline'
  status_message TEXT,
  status_emoji TEXT,
  auto_status BOOLEAN DEFAULT TRUE, -- Auto-detect based on activity
  manual_status_until TIMESTAMP WITH TIME ZONE,
  timezone TEXT,
  working_hours_start TIME,
  working_hours_end TIME,
  working_days JSONB, -- ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_availability_status ON user_availability(status);

-- 4. Frequent Collaborators (Calculated periodically)
CREATE TABLE IF NOT EXISTS frequent_collaborators (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaboration_count INTEGER DEFAULT 0,
  shared_projects JSONB, -- Array of project IDs
  shared_tasks JSONB, -- Array of task IDs
  last_collaboration TIMESTAMP WITH TIME ZONE,
  collaboration_score NUMERIC(5,2), -- 0-100 based on recency and frequency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, collaborator_id)
);

CREATE INDEX IF NOT EXISTS idx_frequent_collaborators_user ON frequent_collaborators(user_id, collaboration_score DESC);
CREATE INDEX IF NOT EXISTS idx_frequent_collaborators_pair ON frequent_collaborators(user_id, collaborator_id);

-- 5. User Statistics (Aggregate stats)
CREATE TABLE IF NOT EXISTS user_statistics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Task stats
  tasks_completed_week INTEGER DEFAULT 0,
  tasks_completed_month INTEGER DEFAULT 0,
  tasks_completed_all_time INTEGER DEFAULT 0,
  tasks_overdue INTEGER DEFAULT 0,
  avg_task_completion_days NUMERIC(5,2),
  
  -- Project stats
  projects_active INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  projects_total INTEGER DEFAULT 0,
  
  -- Team stats
  teams_count INTEGER DEFAULT 0,
  teams_lead_count INTEGER DEFAULT 0,
  
  -- Communication stats
  avg_response_time_minutes NUMERIC(7,2),
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  
  -- Contribution score (0-100)
  contribution_score NUMERIC(7,2) DEFAULT 0,
  
  -- Tenure
  workspace_join_date TIMESTAMP WITH TIME ZONE,
  days_in_workspace INTEGER DEFAULT 0,
  
  -- Last updated
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_contribution ON user_statistics(contribution_score DESC);

-- 6. User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'top_performer', 'early_adopter', 'helpful_teammate', etc.
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  badge_color TEXT,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criteria_met JSONB,
  is_visible BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_user_badges_rarity ON user_badges(rarity, awarded_at DESC);

-- 7. Work History (Internal workspace history)
CREATE TABLE IF NOT EXISTS user_work_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'role_change', 'promotion', 'project_completed', 'milestone', 'team_join'
  event_title TEXT NOT NULL,
  event_description TEXT,
  from_value TEXT, -- Old role, old team, etc.
  to_value TEXT, -- New role, new team, etc.
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_work_history_user ON user_work_history(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_history_workspace ON user_work_history(workspace_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_history_type ON user_work_history(event_type, event_date DESC);

-- 8. Profile Section Analytics
CREATE TABLE IF NOT EXISTS profile_section_views (
  id TEXT PRIMARY KEY,
  profile_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL, -- 'overview', 'skills', 'experience', 'achievements', 'goals', etc.
  view_count INTEGER DEFAULT 0,
  last_viewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_user_id, section_name)
);

CREATE INDEX IF NOT EXISTS idx_section_views_profile ON profile_section_views(profile_user_id, view_count DESC);

-- 9. Extend existing achievement_definitions table (if needed)
DO $$
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='achievement_definitions' AND column_name='category') THEN
    ALTER TABLE achievement_definitions ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  
  -- Add rarity column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='achievement_definitions' AND column_name='rarity') THEN
    ALTER TABLE achievement_definitions ADD COLUMN rarity TEXT DEFAULT 'common';
  END IF;
  
  -- Add display_order column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='achievement_definitions' AND column_name='display_order') THEN
    ALTER TABLE achievement_definitions ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- 10. Extend kudos table with categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='kudos' AND column_name='category') THEN
    ALTER TABLE kudos ADD COLUMN category TEXT DEFAULT 'general';
    -- Categories: 'helpful', 'great_work', 'team_player', 'innovative', 'leadership', 'quality'
  END IF;
END $$;

-- 11. Extend team_members table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='team_members' AND column_name='is_primary_team') THEN
    ALTER TABLE team_members ADD COLUMN is_primary_team BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='team_members' AND column_name='team_join_date') THEN
    ALTER TABLE team_members ADD COLUMN team_join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create index on kudos category
CREATE INDEX IF NOT EXISTS idx_kudos_category ON kudos(category);

-- Create index on team_members primary team
CREATE INDEX IF NOT EXISTS idx_team_members_primary ON team_members(user_id, is_primary_team);

-- Comments for documentation
COMMENT ON TABLE profile_views IS 'Tracks who viewed user profiles for analytics';
COMMENT ON TABLE profile_suggestions IS 'AI-generated suggestions for profile optimization';
COMMENT ON TABLE user_availability IS 'User availability status and working hours';
COMMENT ON TABLE frequent_collaborators IS 'Calculated frequent collaboration pairs';
COMMENT ON TABLE user_statistics IS 'Aggregated user statistics for quick access';
COMMENT ON TABLE user_badges IS 'Achievement badges awarded to users';
COMMENT ON TABLE user_work_history IS 'Internal workspace work history events';
COMMENT ON TABLE profile_section_views IS 'Analytics for profile section popularity';

