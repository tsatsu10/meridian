-- Add project_id column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS project_id text;

-- Add foreign key constraint
ALTER TABLE teams
  ADD CONSTRAINT teams_project_id_projects_id_fk
  FOREIGN KEY (project_id)
  REFERENCES projects(id)
  ON DELETE CASCADE;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'teams'
ORDER BY ordinal_position;
