# ✅ WebSocket Access Fix - Complete

## 🎯 Root Cause

The WebSocket server requires **BOTH** entries in the database:
1. `workspace_user` entry ✅ (for REST API workspace access)
2. `role_assignment` entry ❌ (for WebSocket access) **← WAS MISSING**

The `ensureAdminUser` function was creating #1 but **not #2** for existing users!

## 🔍 Error Analysis

**WebSocket Error:**
```javascript
{message: 'Access denied to workspace', code: 'ACCESS_DENIED'}
```

**WebSocket Verification Logic:**
```typescript
// File: apps/api/src/realtime/unified-websocket-server.ts:1163-1176
const roleAssignment = await db.query.roleAssignmentTable.findFirst({
  where: and(
    eq(roleAssignmentTable.workspaceId, workspaceId),
    eq(roleAssignmentTable.userId, user.id),
    eq(roleAssignmentTable.isActive, true)  // ← Looking for this!
  )
});

if (!roleAssignment) {
  return false; // ← Access denied!
}
```

## ✅ Fix Applied

### File Modified: `apps/api/src/utils/ensure-admin-user.ts`

**Added:**
1. Import `and` from drizzle-orm
2. Check for existing `role_assignment`
3. Create `role_assignment` if missing

**New Code (lines 73-104):**
```typescript
// CRITICAL: Also create role_assignment for WebSocket access (if not exists)
const existingRoleAssignment = await getDatabase()
  .select()
  .from(roleAssignmentTable)
  .where(
    and(
      eq(roleAssignmentTable.userId, existingUser.id),
      eq(roleAssignmentTable.workspaceId, workspace.id),
      eq(roleAssignmentTable.isActive, true)
    )
  )
  .limit(1);

if (!existingRoleAssignment.length) {
  const roleAssignmentId = createId();
  await getDatabase().insert(roleAssignmentTable).values({
    id: roleAssignmentId,
    userId: existingUser.id,
    role: "workspace-manager", // ← For role_assignment table (different enum)
    assignedBy: existingUser.id,
    assignedAt: new Date(),
    isActive: true,
    workspaceId: workspace.id,
    reason: "Workspace membership setup",
    notes: "Created role_assignment for existing admin user workspace access",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created role_assignment for WebSocket access`);
} else {
  console.log(`ℹ️  Role assignment already exists for workspace`);
}
```

## 🔄 What Gets Created Now

### For Existing Admin Users:
1. **workspace_user** entry:
   - `role: "admin"` (from enum: ['admin', 'manager', 'member', 'viewer'])
   - Used by: REST API workspace queries

2. **role_assignment** entry:
   - `role: "workspace-manager"` (different table, different enum)
   - `isActive: true`
   - Used by: WebSocket access verification, RBAC permissions

## 🚀 Next Steps

### Step 1: Restart API Server

```bash
cd apps/api
npm run dev
```

**Expected Output:**
```
✅ Admin user already exists: admin@meridian.app
⚠️  Existing admin user has no workspace membership, creating one...
✅ Created role_assignment for WebSocket access
✅ Created workspace membership for existing admin user in workspace: Main Workspace
✅ Database initialized, starting server...
🔌 Initializing WebSocket server...
✅ WebSocket server initialized
🏃 Server is running at http://localhost:3005
✅ Server started successfully
```

**Key Message:**
```
✅ Created role_assignment for WebSocket access
```

### Step 2: Clear Browser Cache

1. Press `F12`
2. **Application** → **Local Storage** → `http://localhost:5174`
3. Delete ALL keys (or at minimum):
   - `selectedWorkspaceId`
   - `workspaces`
   - `currentWorkspace`

### Step 3: Hard Refresh

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

## ✅ Success Indicators

### In Browser Console:
```
✅ WebSocket connected successfully
✅ No "Access denied to workspace" errors
✅ No CONNECTION_REFUSED errors
```

### In API Console:
```
✅ Workspace access verified for admin@meridian.app in workspace [workspace-id]
```

## 🔍 Verification

Test WebSocket connection manually:
```javascript
// Open browser console on http://localhost:5174
localStorage.getItem('selectedWorkspaceId')
// Should show a valid workspace ID

// Check WebSocket connection status
// Should see connected status, no errors
```

Test API endpoint:
```bash
curl http://localhost:3005/api/workspace?userEmail=admin@meridian.app
```

Expected: Valid workspace with `userRole: "admin"`

## 📊 Database State After Fix

### workspace_user table:
| user_id | workspace_id | user_email | role | status |
|---------|--------------|------------|------|--------|
| admin_user_id | workspace_id | admin@meridian.app | admin | active |

### role_assignment table:
| user_id | workspace_id | role | is_active |
|---------|--------------|------|-----------|
| admin_user_id | workspace_id | workspace-manager | true |

**Both entries required for full access!**

---

## 🎯 Summary

**Problem:** WebSocket access denied  
**Cause:** Missing `role_assignment` entry  
**Fix:** Create `role_assignment` when creating `workspace_user`  
**Status:** ✅ COMPLETE  

**Next:** Restart server → Clear cache → Refresh browser

