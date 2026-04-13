# 🔧 Workspace Assignment Fix Guide

**Issue**: User has 7 workspace assignments but only 1 actual workspace  
**Impact**: Data inconsistency, potential UI confusion, orphaned records  
**Solution**: Clean up and validate workspace assignments

---

## 🎯 Quick Fix

### Step 1: Analyze the Issue
```bash
cd apps/api
npm run workspace:analyze elidegbotse@gmail.com
```

This will show you:
- Orphaned assignments (pointing to deleted workspaces)
- Duplicate assignments (same user/workspace/role multiple times)
- Invalid assignments (user no longer exists)

### Step 2: Preview the Fix (Dry Run)
```bash
npm run workspace:fix elidegbotse@gmail.com
```

This shows what **would** be fixed without making changes.

### Step 3: Apply the Fix
```bash
npm run workspace:fix elidegbotse@gmail.com --apply
```

This **actually removes** the problematic assignments.

### Step 4: Verify the Results
```bash
npm run workspace:report elidegbotse@gmail.com
```

This shows the final state of assignments.

---

## 📋 What Gets Fixed

### 1. Orphaned Assignments ❌
**Problem**: Workspace assignment exists but workspace was deleted
```
workspace_user record points to workspace ID that doesn't exist
```

**Fix**: Remove the orphaned assignment record

### 2. Duplicate Assignments ❌
**Problem**: Same user has multiple identical assignments to same workspace
```
user@email.com → workspace-123 → role: "member" (exists 3 times)
```

**Fix**: Keep the oldest assignment, remove duplicates

### 3. Invalid User Assignments ❌
**Problem**: Workspace assignment exists but user was deleted
```
workspace_user record points to user email that doesn't exist in users table
```

**Fix**: Remove the invalid assignment record

---

## 🔍 Manual Investigation

If you want to manually check the database:

```sql
-- See all assignments for the user
SELECT 
  wu.*,
  w.name as workspace_name,
  w.ownerId as workspace_owner
FROM workspace_user wu
LEFT JOIN workspace w ON wu.workspaceId = w.id
WHERE wu.userEmail = 'elidegbotse@gmail.com';

-- Find orphaned assignments
SELECT 
  wu.*
FROM workspace_user wu
LEFT JOIN workspace w ON wu.workspaceId = w.id
WHERE wu.userEmail = 'elidegbotse@gmail.com'
  AND w.id IS NULL;

-- Find duplicate assignments
SELECT 
  userEmail,
  workspaceId,
  role,
  COUNT(*) as count
FROM workspace_user
WHERE userEmail = 'elidegbotse@gmail.com'
GROUP BY userEmail, workspaceId, role
HAVING COUNT(*) > 1;
```

---

## 🛡️ Prevention: Add to Package.json

Add these npm scripts to `apps/api/package.json`:

```json
{
  "scripts": {
    "workspace:analyze": "tsx src/scripts/fix-workspace-assignments.ts analyze",
    "workspace:fix": "tsx src/scripts/fix-workspace-assignments.ts fix",
    "workspace:report": "tsx src/scripts/fix-workspace-assignments.ts report"
  }
}
```

---

## 🔄 Automated Cleanup (Optional)

Add this to your workspace deletion logic to prevent future issues:

```typescript
// In workspace deletion controller
async function deleteWorkspace(workspaceId: string) {
  const db = getDatabase();
  
  try {
    // 1. Delete all workspace assignments first
    await db.delete(workspaceUserTable)
      .where(eq(workspaceUserTable.workspaceId, workspaceId));
    
    // 2. Then delete the workspace
    await db.delete(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId));
    
    logger.info(`✅ Deleted workspace ${workspaceId} and cleaned up assignments`);
  } catch (error) {
    logger.error('Failed to delete workspace:', error);
    throw error;
  }
}
```

---

## 📊 Expected Results

### Before Fix:
```
User: elidegbotse@gmail.com
├── 7 workspace assignments
│   ├── workspace-1 (exists) ✅
│   ├── workspace-2 (deleted) ❌
│   ├── workspace-3 (deleted) ❌
│   ├── workspace-4 (deleted) ❌
│   ├── workspace-5 (deleted) ❌
│   ├── workspace-6 (deleted) ❌
│   └── workspace-7 (deleted) ❌
└── 1 actual workspace
```

### After Fix:
```
User: elidegbotse@gmail.com
├── 1 workspace assignment ✅
│   └── workspace-1 (exists) ✅
└── 1 actual workspace ✅
```

---

## ⚠️ Important Notes

1. **Backup First**: Consider backing up your database before running `--apply`
   ```bash
   cp apps/api/meridian.db apps/api/meridian.db.backup
   ```

2. **Dry Run Default**: The script runs in dry-run mode by default - it won't make changes unless you add `--apply`

3. **User Impact**: Cleaning up assignments shouldn't affect active users, but verify in the dry-run output first

4. **Audit Trail**: The script logs all actions. Check console output to see what was fixed.

---

## 🚀 Run It Now

**Recommended approach:**

```bash
# 1. Analyze the problem
cd apps/api
npm run workspace:analyze elidegbotse@gmail.com

# 2. Review what would be fixed (dry run)
npm run workspace:fix elidegbotse@gmail.com

# 3. If everything looks good, apply the fix
npm run workspace:fix elidegbotse@gmail.com --apply

# 4. Verify the fix worked
npm run workspace:report elidegbotse@gmail.com
```

---

## ✅ Success Criteria

After running the fix, you should see:
- ✅ Number of assignments = Number of actual workspaces user is in
- ✅ No orphaned assignments
- ✅ No duplicate assignments
- ✅ Clean database with valid references only

---

**Need help?** The script provides detailed output at each step to help you understand what's happening!

