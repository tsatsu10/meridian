-- ===============================================
-- Add Standalone Users Table for Development
-- ===============================================
-- This is a temporary table for development/testing
-- In production, this should use Supabase Auth

-- Create a standalone users table that doesn't depend on auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT, -- For development only, should use Supabase Auth in production
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add basic policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (true); -- For development, allow all reads

CREATE POLICY "Users can insert" ON public.users
  FOR INSERT WITH CHECK (true); -- For development, allow all inserts

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (true); -- For development, allow all updates

-- Add trigger for updated_at (only if the function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON public.users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$; 