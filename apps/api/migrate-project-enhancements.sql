-- Migration: Enhanced Project Settings and Team Management
-- @epic-1.1-subtasks @epic-2.1-files @epic-3.1-dashboard @epic-3.2-time
-- This migration adds comprehensive project metadata, team management, and settings

-- Add new columns to existing project table
ALTER TABLE project ADD COLUMN status TEXT DEFAULT 'planning';
ALTER TABLE project ADD COLUMN category TEXT DEFAULT 'development';
ALTER TABLE project ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE project ADD COLUMN visibility TEXT DEFAULT 'team';
ALTER TABLE project ADD COLUMN allow_guest_access INTEGER DEFAULT 0;
ALTER TABLE project ADD COLUMN require_approval_for_joining INTEGER DEFAULT 1;
ALTER TABLE project ADD COLUMN time_tracking_enabled INTEGER DEFAULT 1;
ALTER TABLE project ADD COLUMN require_time_entry INTEGER DEFAULT 0;
ALTER TABLE project ADD COLUMN enable_subtasks INTEGER DEFAULT 1;
ALTER TABLE project ADD COLUMN enable_dependencies INTEGER DEFAULT 1;
ALTER TABLE project ADD COLUMN enable_budget_tracking INTEGER DEFAULT 0;
ALTER TABLE project ADD COLUMN start_date INTEGER;
ALTER TABLE project ADD COLUMN end_date INTEGER;
ALTER TABLE project ADD COLUMN budget INTEGER DEFAULT 0;
ALTER TABLE project ADD COLUMN estimated_hours INTEGER DEFAULT 0;
ALTER TABLE project ADD COLUMN email_notifications INTEGER DEFAULT 1;
ALTER TABLE project ADD COLUMN slack_notifications INTEGER DEFAULT 0;
ALTER TABLE project ADD COLUMN slack_config TEXT;
ALTER TABLE project ADD COLUMN email_config TEXT;
ALTER TABLE project ADD COLUMN updated_at INTEGER;

-- Update existing projects with current timestamp for updated_at
UPDATE project SET updated_at = strftime('%s', 'now') WHERE updated_at IS NULL;

-- Create project_member table for team management
CREATE TABLE IF NOT EXISTS project_member (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_email TEXT NOT NULL REFERENCES user(email) ON DELETE CASCADE ON UPDATE CASCADE,
  role TEXT DEFAULT 'member' NOT NULL,
  permissions TEXT,
  assigned_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  assigned_by TEXT REFERENCES user(email) ON DELETE SET NULL ON UPDATE CASCADE,
  hours_per_week INTEGER DEFAULT 40,
  is_active INTEGER DEFAULT 1 NOT NULL,
  notification_settings TEXT,
  UNIQUE(project_id, user_email)
);

-- Create project_settings table for advanced configurations
CREATE TABLE IF NOT EXISTS project_settings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
  category TEXT NOT NULL,
  settings TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  last_modified INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  modified_by TEXT REFERENCES user(email) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE(project_id, category)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_member_project_id ON project_member(project_id);
CREATE INDEX IF NOT EXISTS idx_project_member_user_email ON project_member(user_email);
CREATE INDEX IF NOT EXISTS idx_project_member_role ON project_member(role);
CREATE INDEX IF NOT EXISTS idx_project_member_active ON project_member(is_active);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_settings_category ON project_settings(category);

CREATE INDEX IF NOT EXISTS idx_project_status ON project(status);
CREATE INDEX IF NOT EXISTS idx_project_category ON project(category);
CREATE INDEX IF NOT EXISTS idx_project_priority ON project(priority);
CREATE INDEX IF NOT EXISTS idx_project_visibility ON project(visibility);

-- Insert default project members for existing projects (workspace owners become project admins)
INSERT INTO project_member (id, project_id, user_email, role, assigned_at, is_active)
SELECT 
  lower(hex(randomblob(16))),
  p.id,
  w.owner_email,
  'admin',
  strftime('%s', 'now'),
  1
FROM project p
JOIN workspace w ON p.workspace_id = w.id
WHERE NOT EXISTS (
  SELECT 1 FROM project_member pm 
  WHERE pm.project_id = p.id AND pm.user_email = w.owner_email
);

-- Create default integration settings for existing projects
INSERT INTO project_settings (id, project_id, category, settings, version, last_modified)
SELECT 
  lower(hex(randomblob(16))),
  id,
  'integrations',
  '{"slack":{"enabled":false},"email":{"enabled":true,"frequency":"weekly"}}',
  1,
  strftime('%s', 'now')
FROM project
WHERE NOT EXISTS (
  SELECT 1 FROM project_settings ps 
  WHERE ps.project_id = project.id AND ps.category = 'integrations'
);

-- Add update triggers to maintain updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_project_updated_at 
AFTER UPDATE ON project
BEGIN
  UPDATE project SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END; 