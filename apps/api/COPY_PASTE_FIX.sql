-- ============================================
-- WORKSPACE ASSIGNMENT FIX
-- Copy-paste these queries into Neon Console
-- https://console.neon.tech
-- ============================================

-- STEP 1: View current state (should show 7 rows)
SELECT 
    wm.*,
    w.name as workspace_name,
    w.owner_id as workspace_owner
FROM workspace_members wm
LEFT JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_email = 'elidegbotse@gmail.com';

-- ============================================

-- STEP 2: Find orphaned records (should show 6 rows)
SELECT 
    wm.id as assignment_id,
    wm.user_email,
    wm.workspace_id,
    wm.role,
    wm.status,
    w.id as workspace_exists
FROM workspace_members wm
LEFT JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_email = 'elidegbotse@gmail.com'
  AND w.id IS NULL;

-- ============================================

-- STEP 3: Preview deletion (should show 6 rows to be deleted)
SELECT 
    id,
    user_email,
    workspace_id,
    role,
    joined_at
FROM workspace_members
WHERE workspace_id NOT IN (SELECT id FROM workspaces)
  AND user_email = 'elidegbotse@gmail.com';

-- REVIEW CAREFULLY BEFORE NEXT STEP!

-- ============================================

-- STEP 4: DELETE orphaned records (THE FIX!)
-- Should return: DELETE 6

DELETE FROM workspace_members
WHERE workspace_id NOT IN (SELECT id FROM workspaces)
  AND user_email = 'elidegbotse@gmail.com';

-- ============================================

-- STEP 5: Verify fix (should show 1 row)
SELECT 
    wm.*,
    w.name as workspace_name,
    w.owner_id as workspace_owner
FROM workspace_members wm
LEFT JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_email = 'elidegbotse@gmail.com';

-- ============================================

-- STEP 6: Check for duplicates (should show 0 rows)
SELECT 
    user_email,
    workspace_id,
    role,
    COUNT(*) as count
FROM workspace_members
WHERE user_email = 'elidegbotse@gmail.com'
GROUP BY user_email, workspace_id, role
HAVING COUNT(*) > 1;

-- ============================================
-- DONE! ✅
-- You should now have 1 workspace assignment = 1 workspace
-- ============================================

