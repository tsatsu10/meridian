-- ===============================================
-- Meridian Database Schema for Supabase
-- ===============================================
-- Execute this script in your Supabase SQL editor
-- Copy and paste in sections if needed

-- ===============================================
-- 1. CORE TABLES
-- ===============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  persona_type TEXT CHECK (persona_type IN ('project-manager', 'team-lead', 'executive', 'developer', 'designer')) NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')) DEFAULT 'planning',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  budget DECIMAL(10,2),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task columns/statuses
CREATE TABLE public.task_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID REFERENCES public.task_columns(id) ON DELETE SET NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  estimated_hours INTEGER,
  actual_hours INTEGER DEFAULT 0,
  start_date DATE,
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task dependencies
CREATE TABLE public.task_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_id)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File attachments
CREATE TABLE public.file_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time tracking
CREATE TABLE public.time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  hours DECIMAL(4,2) NOT NULL,
  logged_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 2. INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status_id ON public.tasks(status_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_activities_project_id ON public.activities(project_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_task_id ON public.activities(task_id);
CREATE INDEX idx_comments_task_id ON public.comments(task_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_time_logs_task_id ON public.time_logs(task_id);
CREATE INDEX idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_task_columns_project_id ON public.task_columns(project_id);

-- ===============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Users can view teams they're members of" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update teams" ON public.teams
  FOR UPDATE USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team creators can manage team members" ON public.team_members
  FOR ALL USING (
    team_id IN (
      SELECT id FROM public.teams 
      WHERE created_by = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Users can view projects of their teams" ON public.projects
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project creators and PMs can update projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = created_by OR
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      JOIN public.profiles p ON p.id = tm.user_id
      WHERE tm.user_id = auth.uid() 
      AND p.persona_type IN ('project-manager', 'team-lead')
    )
  );

-- Task columns policies
CREATE POLICY "Users can view task columns of accessible projects" ON public.task_columns
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "PMs and team leads can manage task columns" ON public.task_columns
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      JOIN public.profiles pr ON pr.id = tm.user_id
      WHERE tm.user_id = auth.uid() 
      AND pr.persona_type IN ('project-manager', 'team-lead')
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks from accessible projects" ON public.tasks
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assigned tasks or PMs can update all" ON public.tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR 
    created_by = auth.uid() OR
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      JOIN public.profiles pr ON pr.id = tm.user_id
      WHERE tm.user_id = auth.uid() 
      AND pr.persona_type IN ('project-manager', 'team-lead')
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments on accessible tasks" ON public.comments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible tasks" ON public.comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (author_id = auth.uid());

-- Activities policies
CREATE POLICY "Users can view activities of accessible projects" ON public.activities
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Time logs policies
CREATE POLICY "Users can view time logs of accessible tasks" ON public.time_logs
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own time logs" ON public.time_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time logs" ON public.time_logs
  FOR UPDATE USING (user_id = auth.uid());

-- ===============================================
-- 4. DATABASE FUNCTIONS
-- ===============================================

-- Function to get user's accessible projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS SETOF public.projects AS $$
BEGIN
  RETURN QUERY
  SELECT p.* FROM public.projects p
  JOIN public.team_members tm ON tm.team_id = p.team_id
  WHERE tm.user_id = user_id
  ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update task position with activity logging
CREATE OR REPLACE FUNCTION update_task_position(
  task_id UUID,
  new_status_id UUID,
  new_position INTEGER
)
RETURNS VOID AS $$
DECLARE
  old_status_id UUID;
  task_title TEXT;
BEGIN
  -- Get current status for activity log
  SELECT status_id, title INTO old_status_id, task_title
  FROM public.tasks 
  WHERE id = task_id;
  
  -- Update task
  UPDATE public.tasks 
  SET status_id = new_status_id, position = new_position, updated_at = NOW()
  WHERE id = task_id;
  
  -- Log the activity
  INSERT INTO public.activities (user_id, task_id, action, details)
  VALUES (
    auth.uid(),
    task_id,
    'task_moved',
    jsonb_build_object(
      'task_title', task_title,
      'old_status_id', old_status_id,
      'new_status_id', new_status_id, 
      'new_position', new_position
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log time on task
CREATE OR REPLACE FUNCTION log_time(
  task_id UUID,
  hours DECIMAL,
  description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  task_title TEXT;
BEGIN
  -- Get task title for activity log
  SELECT title INTO task_title FROM public.tasks WHERE id = task_id;
  
  -- Insert time log
  INSERT INTO public.time_logs (task_id, user_id, hours, description)
  VALUES (task_id, auth.uid(), hours, description)
  RETURNING id INTO log_id;
  
  -- Update task actual hours
  UPDATE public.tasks 
  SET actual_hours = actual_hours + hours, updated_at = NOW()
  WHERE id = task_id;
  
  -- Log the activity
  INSERT INTO public.activities (user_id, task_id, action, details)
  VALUES (
    auth.uid(),
    task_id,
    'time_logged',
    jsonb_build_object(
      'task_title', task_title,
      'hours', hours, 
      'description', description
    )
  );
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team metrics for Team Lead dashboard
CREATE OR REPLACE FUNCTION get_team_metrics(team_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (
      SELECT COUNT(*) FROM public.team_members 
      WHERE team_id = team_id
    ),
    'active_projects', (
      SELECT COUNT(*) FROM public.projects 
      WHERE team_id = team_id AND status = 'active'
    ),
    'total_tasks', (
      SELECT COUNT(*) FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.team_id = team_id
    ),
    'completed_tasks', (
      SELECT COUNT(*) FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.task_columns tc ON tc.id = t.status_id
      WHERE p.team_id = team_id AND tc.name ILIKE '%done%'
    ),
    'total_hours_logged', (
      SELECT COALESCE(SUM(tl.hours), 0) FROM public.time_logs tl
      JOIN public.tasks t ON t.id = tl.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.team_id = team_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 5. VIEWS FOR ANALYTICS
-- ===============================================

-- View for project health dashboard (Jennifer's executive view)
CREATE OR REPLACE VIEW project_health_view AS
SELECT 
  p.id,
  p.name,
  p.status,
  p.priority,
  p.start_date,
  p.due_date,
  p.budget,
  t.name as team_name,
  COUNT(tasks.id) as total_tasks,
  COUNT(CASE WHEN tc.name ILIKE '%done%' THEN 1 END) as completed_tasks,
  COALESCE(SUM(tasks.estimated_hours), 0) as estimated_hours,
  COALESCE(SUM(tasks.actual_hours), 0) as actual_hours,
  CASE 
    WHEN p.due_date < CURRENT_DATE AND p.status != 'completed' THEN 'overdue'
    WHEN p.due_date < CURRENT_DATE + INTERVAL '7 days' AND p.status != 'completed' THEN 'at_risk'
    ELSE 'on_track'
  END as health_status
FROM public.projects p
LEFT JOIN public.teams t ON t.id = p.team_id
LEFT JOIN public.tasks tasks ON tasks.project_id = p.id
LEFT JOIN public.task_columns tc ON tc.id = tasks.status_id
GROUP BY p.id, p.name, p.status, p.priority, p.start_date, p.due_date, p.budget, t.name;

-- ===============================================
-- 6. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ===============================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at 
  BEFORE UPDATE ON public.teams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON public.projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON public.tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON public.comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 7. ENABLE REALTIME
-- ===============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs;

-- ===============================================
-- 8. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ===============================================

-- Insert default task columns for new projects
CREATE OR REPLACE FUNCTION create_default_task_columns(project_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.task_columns (project_id, name, position, color) VALUES
  (project_id, 'To Do', 1, '#EF4444'),
  (project_id, 'In Progress', 2, '#F59E0B'),
  (project_id, 'Review', 3, '#8B5CF6'),
  (project_id, 'Done', 4, '#10B981');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- SETUP COMPLETE!
-- ===============================================
-- 
-- Next steps:
-- 1. Copy your Supabase project URL and anon key
-- 2. Set up environment variables in your app
-- 3. Install @supabase/supabase-js
-- 4. Start building your components!
--
-- =============================================== 