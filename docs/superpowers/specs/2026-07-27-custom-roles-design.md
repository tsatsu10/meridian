# Custom Roles — Design

**Date:** 2026-07-27
**Status:** Approved, ready for implementation planning

## Problem

`/dashboard/settings/roles-unified` ("Manage Roles") is reachable from three
places in the UI — the navigation config, the settings index, and
team-management — but it has never worked. It calls `/api/roles`, `/api/roles/:id`,
`/api/roles/:id/usage` and `/api/roles/:id/clone`, none of which exist
(`GET /api/roles` returns 404 when authenticated; the 401 you see unauthenticated
is just the global auth gate firing before routing).

The 11 roles are compiled into `apps/api/src/constants/rbac.ts` as
`ROLE_PERMISSIONS`, mirrored in `apps/web/src/lib/permissions/definitions.ts`.
There is no concept of a user-defined role, so the page's create / edit / clone /
delete surface has nothing behind it.

## What already exists

Investigation found substantially more scaffolding than expected:

| Piece | Status |
| --- | --- |
| `roles` table | **Exists in the database**, 0 rows. Columns match the frontend `Role` interface field-for-field. |
| `role_audit_log` table | Exists, 0 rows. Action enum already includes `role_created` / `role_updated` / `role_deleted`. |
| `role_assignment` table | **Live**, 48 rows. `role` is plain `text` with no enum constraint. |
| `role_history` table | **Live**, 50 rows. Records assignment changes; `user_id` is NOT NULL. |
| UI pages | Exist — `roles-unified.tsx` (390 lines), `roles-unified.$roleId.tsx` (395 lines). |
| UI components | `RoleCard`, `RoleModal` exist. `Role` interface already matches the table. |
| `/api/roles/*` | **Missing entirely.** This is the only real gap. |

Consequently **no schema migration is required**. `roles` is already created, and
because `role_assignment.role` is unconstrained text it can already hold a custom
role id.

Dead duplicates also exist — `role_assignments` (plural), `permission_overrides`,
`role_templates`, all 0 rows. They are out of scope; see "Out of scope".

## Approach

Three options were considered for how a custom role resolves at permission-check
time:

- **A. Name-first, then id lookup.** `requirePermission` keeps its current
  behaviour when the stored role is one of the 11 built-in names; only when it
  is not does it treat the value as a custom role id and load permissions from
  `roles`.
- **B. Move everything into the database.** Seed all 11 as rows, delete the
  constant, always resolve from the database.
- **C. Copy permissions onto the assignment.** Materialise the permission set
  into `role_assignment` at assign time.

**Chosen: A.** It is strictly additive — the resolution path for all 48 existing
assignments is byte-identical, and custom roles are the only new branch. B puts
every existing user on a new code path, where a seeding mistake means a lockout.
C goes stale: editing a role would not propagate to users already holding it.

This matters more than usual here because this codebase's RBAC has already
produced a privilege-escalation bug (`/api/rbac/assign` with no authz check) and
a force-override bug (the web provider hardcoding every user to
workspace-manager). Confining new risk to an unreachable-by-default branch is
deliberate.

## Design

### 1. Data model

No migration. Seed the 11 built-ins into `roles` as:

- `type = 'system'`
- `permissions = NULL` — permissions continue to come from `ROLE_PERMISSIONS`,
  so there remains exactly one source of truth for built-in permissions
- `workspace_id = NULL` (global)
- `id` = the existing role slug (`workspace-manager`, `team-lead`, …) so that
  existing `role_assignment.role` values keep matching by both name and id

Custom roles are `type = 'custom'`, `permissions` = JSON array of granted
permission keys, `workspace_id` = the owning workspace.

Seeding is idempotent (upsert by id, updating name/description only) and runs at
startup immediately after database initialisation, so a fresh clone and an
existing database converge on the same state without drift.

### 2. Permission resolution

In `apps/api/src/middlewares/rbac.ts`, `requirePermission` currently does:

```
role = activeAssignment?.role ?? "guest"
permissions = getRolePermissions(role)      // ROLE_PERMISSIONS[role] || {}
```

Extended to:

1. If `role` is one of the 11 built-in names → `getRolePermissions(role)`.
   **Unchanged path.**
2. Otherwise → look up `roles` by id, scoped to the assignment's workspace,
   requiring `is_active = true` and `deleted_at IS NULL`. Convert its
   `permissions` array into the same `Record<string, boolean>` shape.
3. Any miss — unknown id, inactive, soft-deleted, wrong workspace — yields `{}`,
   i.e. denied.

Step 3 preserves today's behaviour: `ROLE_PERMISSIONS[role] || {}` already
returns `{}` for an unrecognised role, so the system is fail-closed now and
stays fail-closed. Assigning a bad role locks a user out; it never escalates.

A short-TTL in-process cache keyed by role id avoids adding a query per request,
invalidated on any write to that role.

### 3. Escalation guard

- Every write endpoint requires `canManageRoles` (reusing the existing
  `requirePermission` middleware).
- On create, update and clone, the requested permission set must be a **subset
  of the actor's own effective permissions in the target workspace** (resolved
  through the same path described in §2, not from a client-supplied role). A
  user cannot mint a role more powerful than themselves, which structurally
  prevents privilege escalation rather than relying on review discipline. An
  equal set is allowed; any permission the actor lacks is rejected with 403
  naming the offending keys.
- Custom roles are always workspace-scoped; `workspace_id` may not be NULL,
  so a custom role can never be global.
- System roles reject update, delete and permission edits with 400.

### 4. API surface

Mounted at `/api/roles` alongside the other routers in `apps/api/src/index.ts`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/roles` | List. Filters: `type` (all/system/custom), `workspaceId`, `search`. Returns `{ roles: Role[] }` — the shape the page already expects. System roles are visible to any authenticated user; **custom roles are only ever returned for workspaces the caller is a member of**, regardless of the `workspaceId` filter, so the list cannot be used to enumerate other tenants' roles. |
| GET | `/api/roles/:id` | Single role with its resolved permission list. |
| POST | `/api/roles` | Create custom role. Subset guard. |
| PUT | `/api/roles/:id` | Update custom role. Subset guard. 400 on system roles. |
| DELETE | `/api/roles/:id` | Soft delete via `deleted_at` / `deleted_by`. 400 on system roles. Blocked while in use. |
| POST | `/api/roles/:id/clone` | Copies permissions, sets `base_role_id` to the source. Subset guard. Cloning a system role is allowed — the copy is custom. |
| GET | `/api/roles/:id/usage` | `{ usersCount, lastUsedAt, assignments[] }`. |

### 5. Usage statistics and audit

`usersCount` is **derived** at read time by counting active `role_assignment`
rows, not read from the denormalised `roles.users_count` column, which cannot
then drift. The column is left in place but unused. `lastUsedAt` likewise comes
from the most recent matching assignment.

Deleting a role that is still assigned is refused with the count in the message,
so nobody is silently stripped of their permissions.

Auditing is split to match how the tables are actually shaped:

- **Role definition** changes (`role_created`, `role_updated`, `role_deleted`)
  → `role_audit_log`, which is purpose-built for it: it has `roleId`, a nullable
  `userId`, `previousValue` / `newValue` JSON, `changedBy`, `ipAddress` and
  `userAgent`. Its `assignmentId` column references the dead `role_assignments`
  table and is left NULL.
- **Assignment** changes → `role_history`, exactly as today. It is unsuitable
  for definition changes because its `user_id` is NOT NULL and creating a role
  involves no user.

### 6. Frontend

The pages and components already exist and `Role` already matches the table, so
this is mostly repointing:

- Point the four fetches at the real endpoints and drop the dead ones.
- Add a permission editor to `RoleModal`. With **157** permission keys a flat
  list is unusable, so group them by prefix (`canManage*`, `canView*`,
  `canCreate*`, `canAccess*`, …) into collapsible sections with a per-group
  select-all.
- Permissions the actor does not themselves hold are rendered disabled, making
  the server-side subset rule visible rather than a surprise 403.

### 7. Testing

- **Unit** — the subset guard (equal set allowed, subset allowed, superset
  rejected); resolution (built-in unchanged, custom resolved, unknown/inactive/
  soft-deleted/wrong-workspace all deny); cache invalidation on write.
- **Integration** — each endpoint's authz (no `canManageRoles` → 403); system
  roles reject writes; delete-while-in-use is refused.
- **Regression** — assert the existing 48 assignments resolve to identical
  permission sets before and after the change. This is the guard against
  breaking live users.

## Out of scope

- The dead `role_assignments` (plural), `permission_overrides` and
  `role_templates` tables, all 0 rows. Removing them is a separate cleanup;
  widening this change to include them adds migration risk for no user benefit.
- `permission_overrides` as a feature (per-user grants on top of a role).
- Making the 11 built-in permission sets editable.

## Success criteria

1. The Manage Roles page loads real data and every button on it works.
2. A custom role can be created, edited, cloned, assigned, and enforced — a user
   holding it gets exactly its permissions.
3. No existing user's effective permissions change (proven by the regression
   test).
4. A user without `canManageRoles` cannot reach any write endpoint, and no user
   can create a role exceeding their own permissions.
