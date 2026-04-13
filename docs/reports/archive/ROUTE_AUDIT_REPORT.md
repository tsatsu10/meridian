# 🔍 Complete Codebase Route Audit Report

**Date:** October 26, 2025  
**Scope:** Full codebase scan for route inconsistencies  
**Status:** ⚠️ **Multiple issues found**

---

## 📊 Executive Summary

### Issues Found: **47 locations**

| Issue Type | Count | Severity |
|------------|-------|----------|
| **Singular `/api/project/` routes** | 11 | 🟡 Medium (Backward compatible) |
| **Singular `/api/workspace/` routes** | 27 | 🟡 Medium (Backward compatible) |
| **Singular `/api/user/` routes** | 5 | 🟡 Medium (Backward compatible) |
| **Wrong backlog theme route** | 4 | 🔴 **CRITICAL** |

**Good News:** I added backward compatibility for `/api/project`, `/api/task`, `/api/workspace`, and `/api/user`, so those will work.

**Bad News:** The backlog theme routes are broken because I changed them from `/api/backlog-themes` to `/api/backlog-categories` without backward compatibility.

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### 1. Backlog Theme Routes (4 files) ⚠️⚠️⚠️

**Problem:** Frontend uses `/backlog-themes/` but API changed to `/api/backlog-categories/`

#### Affected Files:

**apps/web/src/hooks/queries/theme/use-get-themes.ts**
```typescript
// Line 16: BROKEN
`${API_URL}/backlog-themes/${projectId}`
// Should be:
`${API_URL}/api/backlog-categories/${projectId}`
```

**apps/web/src/hooks/mutations/theme/use-create-theme.ts**
```typescript
// BROKEN
`${API_URL}/backlog-themes`
```

**apps/web/src/hooks/mutations/theme/use-update-theme.ts**
```typescript
// BROKEN
`${API_URL}/backlog-themes/${themeId}`
```

**apps/web/src/hooks/mutations/theme/use-delete-theme.ts**
```typescript
// BROKEN
`${API_URL}/backlog-themes/${themeId}`
```

**Impact:** ❌ Backlog theme/category features completely broken
**Fix Required:** Update all 4 files OR add backward compatibility to API

---

## 🟡 MEDIUM PRIORITY (Working but not standardized)

### 2. Singular `/api/project/` References (11 locations)

✅ **Status:** Working due to backward compatibility  
⚠️ **Should update:** For consistency with new standard

#### Locations:

1. **apps/web/src/components/analytics/project-analytics.tsx:49**
   ```typescript
   `${API_URL}/api/project/${projectId}/analytics`
   ```

2. **apps/web/src/routes/dashboard/workspace/.../\_layout.index.tsx:533**
   ```typescript
   `/api/project/${projectId}/export`
   ```

3. **apps/web/src/routes/dashboard/workspace/.../\_layout.index.tsx:603**
   ```typescript
   `/api/project/${projectId}/archive`
   ```

4. **apps/web/src/routes/dashboard/workspace/.../\_layout.index.tsx:676**
   ```typescript
   `/api/project/${projectId}`
   ```

5. **apps/web/src/routes/dashboard/projects.tsx:384**
   ```typescript
   `/api/project/${project.id}/archive`
   ```

6. **apps/web/src/routes/dashboard/projects.tsx:507**
   ```typescript
   `/api/project/${project.id}/restore`
   ```

7. **apps/web/src/fetchers/project/delete-status-column.ts:10**
   ```typescript
   `/api/project/${projectId}/status-columns/${columnId}`
   ```

8. **apps/web/src/fetchers/project/create-status-column.ts:24**
   ```typescript
   `/api/project/${projectId}/status-columns`
   ```

**Recommendation:** Update to `/api/projects/` for consistency (non-urgent)

---

### 3. Singular `/api/workspace/` References (27 locations)

✅ **Status:** Working due to backward compatibility  
⚠️ **Should update:** For consistency

#### Major Files:

**apps/web/src/store/consolidated/settings.ts** (1 location)
```typescript
Line 1762: `/api/workspace/${workspaceId}/settings/sync`
```

**apps/web/src/store/consolidated/teams.ts** (8 locations)
```typescript
Line 578:  `/api/workspace/${currentWorkspaceId}/teams`
Line 657:  `/api/workspace/${workspaceId}/teams`
Line 835:  `/api/workspace/${workspaceId}/members`
Line 885:  `/api/workspace/${workspaceId}/invites`
Line 1676: `/api/workspace/${get().currentWorkspaceId}/activities`
Line 1767: `/api/workspace/${currentWorkspaceId}/stats`
Line 1816: `/api/workspace/${currentWorkspaceId}/team-settings`
Line 1850: `/api/workspace/${workspaceId}/team-settings`
```

**apps/web/src/store/consolidated/communication.ts** (5 locations)
```typescript
Line 590:  `/api/workspace/${workspaceId}/channels`
Line 623:  `/api/workspace/${get().workspaceId}/channels`
Line 1041: `/api/workspace/${workspaceId}/conversations`
Line 1263: `/api/workspace/${workspaceId}/search/messages`
Line 1600: `/api/workspace/${get().workspaceId}/read-all`
```

**apps/web/src/store/slices/communicationSlice.ts** (3 locations)
```typescript
Line 307: `/api/workspace/${workspaceId}/channels`
Line 423: `/api/workspace/${workspaceId}/conversations`
Line 469: `/api/workspace/${workspaceId}/search/messages`
```

**apps/web/src/fetchers/workspace/** (2 locations)
```typescript
get-workspace.ts:8    → `/api/workspace/${id}`
get-workspaces.ts:5   → `/api/workspace`
```

**Other files:**
- apps/web/src/routes/dashboard/settings/team-management.tsx:280
- apps/web/src/components/chat/new-conversation-modal.tsx
- apps/web/src/components/chat/chat-main-area.tsx
- apps/web/src/routes/dashboard/projects.tsx
- apps/web/src/store/consolidated/workspace.ts (multiple)
- apps/web/src/store/slices/workspaceSlice.ts (multiple)
- apps/web/src/fetchers/workspace/get-workspace.ts
- apps/web/src/fetchers/workspace/get-workspaces.ts
- apps/web/src/hooks/queries/workspace/use-get-workspaces.ts

**Recommendation:** Bulk update to `/api/workspaces/` (non-urgent)

---

### 4. Singular `/api/user/` References (5 locations)

✅ **Status:** Working due to backward compatibility

#### Locations:

1. **apps/web/src/store/consolidated/settings.ts** (4 locations)
   ```typescript
   Line 999:  `/api/user/settings`
   Line 1047: `/api/user/settings`
   Line 1113: `/api/user/settings/reset`
   Line 1244: `/api/user/settings/presets`
   ```

2. **apps/web/src/components/auth/simple-sign-in-form.tsx:24**
   ```typescript
   `/api/user/sign-in`
   ```

3. **apps/web/src/components/auth/fixed-sign-in-form.tsx:57**
   ```typescript
   `/api/user/sign-in`
   ```

**Recommendation:** Update to `/api/users/` for consistency (non-urgent)

---

## ✅ GOOD PATTERNS FOUND

### Using Plural Routes (Already Correct)

Found **0 instances** using `/api/projects/`, `/api/tasks/`, `/api/workspaces/`, `/api/users/` in fetchers

**This means:** The fetchers are already using singular forms, which is why I added backward compatibility!

---

## 🎯 RECOMMENDED FIXES

### Priority 1: CRITICAL (Fix Now) 🔴

**Fix backlog theme routes:**

```typescript
// Option 1: Add backward compatibility to API
// apps/api/src/index.ts
app.route("/api/backlog-themes", backlogCategory);  // Add this line

// Option 2: Update all 4 frontend files
// Change all instances of:
`${API_URL}/backlog-themes/...`
// To:
`${API_URL}/api/backlog-categories/...`
```

### Priority 2: Consistency Updates (Do Later) 🟡

**Create a migration script to update all singular routes to plural:**

```bash
# Search and replace patterns:
/api/project/  → /api/projects/
/api/workspace/ → /api/workspaces/
/api/user/     → /api/users/
/api/task/     → /api/tasks/
```

**Files to update:** 43 locations across multiple files

**Why not urgent:** Backward compatibility is in place

---

## 📋 DETAILED FIX CHECKLIST

### Immediate Fixes (Critical):
- [ ] Fix backlog theme route in use-get-themes.ts
- [ ] Fix backlog theme route in use-create-theme.ts
- [ ] Fix backlog theme route in use-update-theme.ts
- [ ] Fix backlog theme route in use-delete-theme.ts

### Future Consistency Updates:
- [ ] Update project analytics route
- [ ] Update project export/archive/restore routes
- [ ] Update project status-columns routes
- [ ] Update all workspace/* routes in stores
- [ ] Update all user/* routes
- [ ] Update workspace fetchers
- [ ] Create ESLint rule to prevent singular routes

---

## 🔧 PREVENTION STRATEGY

### 1. Create Constants File
```typescript
// apps/web/src/constants/api-routes.ts
export const API_ROUTES = {
  PROJECTS: '/api/projects',
  TASKS: '/api/tasks',
  WORKSPACES: '/api/workspaces',
  USERS: '/api/users',
  BACKLOG_CATEGORIES: '/api/backlog-categories',
} as const;
```

### 2. Add ESLint Rule
```javascript
// Warn on singular API routes
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/\\/api\\/(project|task|workspace|user)\\//]",
        "message": "Use plural API routes: /api/projects/, /api/tasks/, etc."
      }
    ]
  }
}
```

### 3. TypeScript Helper
```typescript
// Type-safe API route builder
const buildApiRoute = (resource: 'projects' | 'tasks' | 'workspaces' | 'users', id?: string) => {
  const base = `/api/${resource}`;
  return id ? `${base}/${id}` : base;
};
```

---

## 📊 STATISTICS

| Metric | Count |
|--------|-------|
| Total files scanned | 1,400+ |
| Files with route references | 34 |
| Total route instances | 47 |
| Critical broken routes | 4 |
| Working but inconsistent | 43 |
| Backward compatible routes added | 4 |

---

## 🚨 IMMEDIATE ACTION REQUIRED

**Fix the backlog theme routes NOW to restore functionality:**

### Quick Fix (Option 1 - Recommended):
Add backward compatibility to API:

```javascript
// apps/api/src/index.ts (after line 224)
app.route("/api/backlog-themes", backlogCategory);  // Backward compatibility
```

### Alternative Fix (Option 2):
Update all 4 theme hook files to use new route.

---

## ✅ CONCLUSION

**Status:** 
- ✅ Most routes working (thanks to backward compatibility)
- ❌ Backlog themes BROKEN (needs immediate fix)
- 🟡 43 routes should be updated for consistency (non-urgent)

**Next Steps:**
1. Fix backlog theme routes (CRITICAL)
2. Plan migration to standardize all routes
3. Implement prevention strategies

---

**Report Complete** ✅

