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

CREATE POLICY "Team creators can update teams" ON public.teams
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

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
CREATE POLICY "Users can view projects from their teams" ON public.projects
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage projects" ON public.projects
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task columns policies
CREATE POLICY "Users can view task columns for their projects" ON public.task_columns
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage task columns" ON public.task_columns
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks from their projects" ON public.tasks
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage tasks" ON public.tasks
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Task dependencies policies
CREATE POLICY "Users can view task dependencies for their tasks" ON public.task_dependencies
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage task dependencies" ON public.task_dependencies
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments on tasks they have access to" ON public.comments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage comments" ON public.comments
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Activities policies
CREATE POLICY "Users can view activities from their projects" ON public.activities
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- File attachments policies
CREATE POLICY "Users can view attachments from their tasks" ON public.file_attachments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage attachments" ON public.file_attachments
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Time logs policies
CREATE POLICY "Users can view time logs from their projects" ON public.time_logs
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own time logs" ON public.time_logs
  FOR ALL USING (auth.uid() = user_id);

-- ===============================================
-- 4. FUNCTIONS AND PROCEDURES
-- ===============================================

-- Function to get user's projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS SETOF public.projects AS $$
BEGIN
  RETURN QUERY
  SELECT p.* FROM public.projects p
  JOIN public.team_members tm ON p.team_id = tm.team_id
  WHERE tm.user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update task position (for drag & drop)
CREATE OR REPLACE FUNCTION update_task_position(
  task_id UUID,
  new_status_id UUID,
  new_position INTEGER
)
RETURNS VOID AS $$
DECLARE
  old_status_id UUID;
  old_position INTEGER;
BEGIN
  -- Get current values
  SELECT status_id, position INTO old_status_id, old_position
  FROM public.tasks WHERE id = task_id;
  
  -- If moving within same column
  IF old_status_id = new_status_id THEN
    -- Update positions
    IF new_position < old_position THEN
      UPDATE public.tasks 
      SET position = position + 1 
      WHERE status_id = new_status_id 
        AND position >= new_position 
        AND position < old_position
        AND id != task_id;
    ELSE
      UPDATE public.tasks 
      SET position = position - 1 
      WHERE status_id = new_status_id 
        AND position > old_position 
        AND position <= new_position
        AND id != task_id;
    END IF;
  ELSE
    -- Moving to different column
    -- Adjust positions in old column
    UPDATE public.tasks 
    SET position = position - 1 
    WHERE status_id = old_status_id 
      AND position > old_position;
    
    -- Adjust positions in new column
    UPDATE public.tasks 
    SET position = position + 1 
    WHERE status_id = new_status_id 
      AND position >= new_position;
  END IF;
  
  -- Update the task
  UPDATE public.tasks 
  SET status_id = new_status_id, position = new_position, updated_at = NOW()
  WHERE id = task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log time
CREATE OR REPLACE FUNCTION log_time(
  p_task_id UUID,
  p_user_id UUID,
  p_description TEXT,
  p_hours DECIMAL(4,2),
  p_logged_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.time_logs (task_id, user_id, description, hours, logged_date)
  VALUES (p_task_id, p_user_id, p_description, p_hours, p_logged_date)
  RETURNING id INTO log_id;
  
  -- Update task actual hours
  UPDATE public.tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0) 
    FROM public.time_logs 
    WHERE task_id = p_task_id
  )
  WHERE id = p_task_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team metrics
CREATE OR REPLACE FUNCTION get_team_metrics(team_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_projects', COUNT(DISTINCT p.id),
    'active_projects', COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END),
    'total_tasks', COUNT(DISTINCT t.id),
    'completed_tasks', COUNT(DISTINCT CASE WHEN tc.name = 'Done' THEN t.id END),
    'total_hours_logged', COALESCE(SUM(tl.hours), 0),
    'team_members', COUNT(DISTINCT tm.user_id)
  ) INTO result
  FROM public.projects p
  LEFT JOIN public.tasks t ON p.id = t.project_id
  LEFT JOIN public.task_columns tc ON t.status_id = tc.id
  LEFT JOIN public.time_logs tl ON t.id = tl.task_id
  LEFT JOIN public.team_members tm ON p.team_id = tm.team_id
  WHERE p.team_id = get_team_metrics.team_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 5. VIEWS
-- ===============================================

-- Project health view
CREATE OR REPLACE VIEW project_health_view AS
SELECT 
  p.id,
  p.name,
  p.status,
  p.due_date,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN tc.name = 'Done' THEN 1 END) as completed_tasks,
  ROUND(
    CASE 
      WHEN COUNT(t.id) > 0 THEN 
        (COUNT(CASE WHEN tc.name = 'Done' THEN 1 END)::DECIMAL / COUNT(t.id)) * 100
      ELSE 0 
    END, 2
  ) as completion_percentage,
  COALESCE(SUM(tl.hours), 0) as total_hours_logged,
  CASE 
    WHEN p.due_date < CURRENT_DATE AND p.status != 'completed' THEN 'overdue'
    WHEN p.due_date <= CURRENT_DATE + INTERVAL '7 days' AND p.status != 'completed' THEN 'at_risk'
    ELSE 'on_track'
  END as health_status
FROM public.projects p
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.task_columns tc ON t.status_id = tc.id
LEFT JOIN public.time_logs tl ON t.id = tl.task_id
GROUP BY p.id, p.name, p.status, p.due_date;

-- ===============================================
-- 6. TRIGGERS
-- ===============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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
-- 7. SEED DATA AND HELPER FUNCTIONS
-- ===============================================

-- Function to create default task columns for new projects
CREATE OR REPLACE FUNCTION create_default_task_columns(project_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.task_columns (project_id, name, position, color) VALUES
    (project_id, 'To Do', 0, '#6B7280'),
    (project_id, 'In Progress', 1, '#F59E0B'),
    (project_id, 'Review', 2, '#8B5CF6'),
    (project_id, 'Done', 3, '#10B981');
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create default task columns for new projects
CREATE OR REPLACE FUNCTION auto_create_task_columns()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_task_columns(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_task_columns_trigger
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION auto_create_task_columns(); 