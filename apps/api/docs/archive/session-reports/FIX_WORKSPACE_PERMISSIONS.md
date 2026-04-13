# 🔧 Fix Workspace Permissions Script

## Purpose

This script fixes the "Access denied to workspace" WebSocket error by ensuring ALL `workspace_user` entries have corresponding `role_assignment` entries.

## The Problem

- Old workspaces created before the fix only have `workspace_user` entries
- WebSocket server requires BOTH `workspace_user` AND `role_assignment` entries
- Result: "Access denied to workspace" error

## The Solution

This script:
1. Scans all `workspace_user` entries in the database
2. Checks if each has a corresponding `role_assignment`
3. Creates missing `role_assignment` entries automatically

## How to Run

```bash
cd apps/api
npx tsx src/scripts/fix-workspace-permissions.ts
```

## Expected Output

```
🔧 Starting workspace permissions fix...

📊 Found 3 workspace_user entries

Checking workspace_user: admin@meridian.app in workspace k8a0u6k7qmayguubd3f8t18s
  ✅ FIXED: Created role_assignment for admin@meridian.app
     Workspace: Main Workspace
     Role: workspace-manager

============================================================
📊 SUMMARY
============================================================
Total workspace_user entries: 3
Already correct: 2
Fixed: 1 ✅
Errors: 0
============================================================

✅ SUCCESS! Workspace permissions have been fixed.

🎯 NEXT STEPS:
1. Restart the API server (Ctrl+C then npm run dev)
2. Clear browser localStorage
3. Refresh the frontend

WebSocket connections should now work! 🚀
```

## After Running

1. **DON'T restart server yet** - it will restart on file save
2. **Clear browser localStorage:**
   ```javascript
   // In browser console (F12):
   localStorage.clear();
   location.reload();
   ```
3. **Check for errors** - should be gone!

## What Gets Fixed

For each `workspace_user` entry without a `role_assignment`, creates:

```typescript
{
  userId: workspaceUser.userId,
  role: "workspace-manager",
  workspaceId: workspaceUser.workspaceId,
  isActive: true,
  reason: "Migration: Fix missing role_assignment for WebSocket access"
}
```

## Verification

After running, all these should work:
- ✅ WebSocket connections (no "Access denied" errors)
- ✅ Real-time features
- ✅ Workspace settings access
- ✅ Full workspace permissions

## Safety

- ✅ Read-only checks before any writes
- ✅ Only creates missing entries (doesn't modify existing)
- ✅ Detailed logging of all actions
- ✅ Error handling per entry (one failure doesn't stop others)
- ✅ Can be run multiple times safely (idempotent)

## Troubleshooting

### "No workspace_user entries found"
- Check database connection in `.env`
- Verify `workspace_user` table exists
- Run `npm run db:push` to sync schema

### Script runs but errors persist
1. Verify script output shows "Fixed: 1 ✅" (or more)
2. Clear browser cache COMPLETELY
3. Hard refresh (Ctrl+Shift+R)
4. Check you're using the correct workspace ID

### "Already correct: X"
If all entries are "Already correct" but you still get errors:
- The issue is likely stale browser cache
- Clear ALL localStorage and cookies
- Or use incognito mode

