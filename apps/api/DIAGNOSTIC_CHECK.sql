-- ============================================
-- DIAGNOSTIC: Check Database Structure
-- Run this FIRST to see what tables exist
-- ============================================

-- 1. List all tables in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- This will show you ALL the tables that exist
-- Look for: workspace_user, workspace, user, etc.

-- ============================================

-- 2. Check workspace_members table structure (if it exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace_members'
ORDER BY ordinal_position;

-- If this returns nothing, the table doesn't exist yet!

-- ============================================

-- 3. Check workspaces table structure (if it exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspaces'
ORDER BY ordinal_position;

-- ============================================

-- 4. Count records in each table (if they exist)
-- Only run these if the tables exist from step 1

-- SELECT COUNT(*) as workspace_members_count FROM workspace_members;
-- SELECT COUNT(*) as workspaces_count FROM workspaces;
-- SELECT COUNT(*) as user_count FROM "user";

-- ============================================
-- TROUBLESHOOTING GUIDE
-- ============================================

-- If you see NO tables:
-- → Your migrations haven't been run yet
-- → Solution: Run `npm run db:push` from apps/api directory

-- If you see tables with different names:
-- → Your schema might use plural forms (workspace_members instead of workspace_user)
-- → Or camelCase (workspaceUser instead of workspace_user)
-- → Adjust your queries accordingly

-- Example queries for different naming conventions:
-- SELECT * FROM workspace_members WHERE "userEmail" = 'elidegbotse@gmail.com';
-- SELECT * FROM workspaces;

-- ============================================

