-- ============================================
-- MANUAL WORKSPACE ASSIGNMENT CLEANUP
-- User: elidegbotse@gmail.com
-- CORRECTED TABLE NAMES: workspace_members, workspaces
-- ============================================

-- Step 1: View all current assignments for the user
-- This shows you what exists right now
SELECT 
    wm.*,
    w.name as workspace_name,
    w.owner_id as workspace_owner
FROM workspace_members wm
LEFT JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_email = 'elidegbotse@gmail.com';

-- Expected: 7 rows (including some with NULL workspace_name)

-- ============================================

-- Step 2: Find orphaned assignments (workspace doesn't exist)
-- These are the problematic records
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

-- Expected: 6 orphaned assignments

-- ============================================

-- Step 3: View what will be deleted (DRY RUN)
-- This shows the exact records that will be removed
SELECT 
    id,
    user_email,
    workspace_id,
    role,
    joined_at
FROM workspace_members
WHERE workspace_id NOT IN (SELECT id FROM workspaces)
  AND user_email = 'elidegbotse@gmail.com';

-- REVIEW THIS CAREFULLY before proceeding to Step 4!

-- ============================================

-- Step 4: DELETE orphaned assignments (ACTUAL FIX)
-- ⚠️ ONLY RUN THIS AFTER REVIEWING STEP 3!
DELETE FROM workspace_members
WHERE workspace_id NOT IN (SELECT id FROM workspaces)
  AND user_email = 'elidegbotse@gmail.com';

-- This will return: "DELETE 6" (or however many were orphaned)

-- ============================================

-- Step 5: Verify the fix worked
-- Should now show only 1 assignment
SELECT 
    wm.*,
    w.name as workspace_name,
    w.owner_id as workspace_owner
FROM workspace_members wm
LEFT JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_email = 'elidegbotse@gmail.com';

-- Expected: 1 row (the valid workspace)

-- ============================================

-- Step 6: Check duplicates (just in case)
SELECT 
    user_email,
    workspace_id,
    role,
    COUNT(*) as count
FROM workspace_members
WHERE user_email = 'elidegbotse@gmail.com'
GROUP BY user_email, workspace_id, role
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- ============================================
-- DONE! ✅
-- ============================================

