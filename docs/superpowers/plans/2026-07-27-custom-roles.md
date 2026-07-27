# Custom Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Manage Roles page work by building the missing `/api/roles` layer, so workspace-scoped custom roles can be created, edited, cloned, deleted, assigned and actually enforced.

**Architecture:** No schema migration — the `roles` and `role_audit_log` tables already exist (empty) and the frontend `Role` interface already matches `roles` column-for-column. The 11 built-in roles are seeded as `type='system'` rows whose permissions still come from the `ROLE_PERMISSIONS` constant. Permission resolution is extended name-first: a built-in role name resolves exactly as it does today, and only an unrecognised value is looked up as a custom role id — so the path for all 48 existing assignments is unchanged.

**Tech Stack:** Hono, Drizzle ORM (PostgreSQL), Zod, Vitest, React + TanStack Router/Query.

**Spec:** `docs/superpowers/specs/2026-07-27-custom-roles-design.md`

## Global Constraints

- **Import rbac-unified tables from the subfile, never the barrel.** `apps/api/src/database/schema.ts:1791` does `export * from "./schema/rbac-unified"`, but `rbac-unified.ts:21` imports `{ users, workspaceTable }` back from `"../schema"`. That cycle makes the star-export silently yield nothing under CJS, so `import { roles } from "../database/schema"` **fails at runtime**. Always use `import { roles, roleAuditLog } from "../database/schema/rbac-unified"`. Verified working.
- **Web typecheck must be `npx tsc --noEmit -p tsconfig.app.json`.** A bare `tsc --noEmit` in `apps/web` checks zero files.
- **API typecheck is `npx tsc --noEmit -p tsconfig.json`** from `apps/api`.
- **Fail closed.** Any unresolvable role yields `{}` permissions (deny). Never fall back to a default-permissive set.
- **Every write endpoint** requires `canManageRoles` via the existing `requirePermission` middleware, plus the subset guard.
- **Custom roles are always workspace-scoped**: `workspace_id` must be non-null. System roles are global (`workspace_id` null) and reject writes.
- **Never mutate `ROLE_PERMISSIONS`.** It stays the single source of truth for built-in permissions; seeded system rows keep `permissions = NULL`.
- Run `npx biome check --write <files>` on touched files before each commit.

## File Structure

**Create (API):**
- `apps/api/src/roles/lib/permission-set.ts` — pure conversions + subset guard.
- `apps/api/src/roles/lib/system-roles.ts` — the 11 built-in ids + idempotent seeding.
- `apps/api/src/roles/lib/resolve-role-permissions.ts` — name-first resolution + TTL cache.
- `apps/api/src/roles/lib/audit.ts` — writes `role_audit_log` entries.
- `apps/api/src/roles/controllers/list-roles.ts`
- `apps/api/src/roles/controllers/get-role.ts`
- `apps/api/src/roles/controllers/get-role-usage.ts`
- `apps/api/src/roles/controllers/create-role.ts`
- `apps/api/src/roles/controllers/update-role.ts`
- `apps/api/src/roles/controllers/delete-role.ts`
- `apps/api/src/roles/controllers/clone-role.ts`
- `apps/api/src/roles/index.ts` — Hono router.

**Modify (API):**
- `apps/api/src/middlewares/rbac.ts` — line 87, swap `getRolePermissions(userRole)` for the resolver.
- `apps/api/src/index.ts` — mount `/api/roles`; seed system roles after DB init.

**Modify (Web):**
- `apps/web/src/routes/dashboard/settings/roles-unified.tsx` — lines 66, 96, 123.
- `apps/web/src/components/rbac/role-modal.tsx` — permission editor.

---

### Task 1: Permission set helpers and the subset guard

Pure functions, no database. This is the security primitive the write endpoints depend on, so it is built and tested first.

**Files:**
- Create: `apps/api/src/roles/lib/permission-set.ts`
- Test: `apps/api/src/roles/lib/__tests__/permission-set.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `permissionsToRecord(list: string[]): Record<string, boolean>`
  - `recordToPermissions(record: Record<string, boolean>): string[]`
  - `findExcessPermissions(requested: string[], actorPermissions: Record<string, boolean>): string[]`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/lib/__tests__/permission-set.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  findExcessPermissions,
  permissionsToRecord,
  recordToPermissions,
} from "../permission-set";

describe("permissionsToRecord", () => {
  it("maps a granted list into the Record shape requirePermission expects", () => {
    expect(permissionsToRecord(["canViewTasks", "canCreateTasks"])).toEqual({
      canViewTasks: true,
      canCreateTasks: true,
    });
  });

  it("returns an empty record for an empty list", () => {
    expect(permissionsToRecord([])).toEqual({});
  });
});

describe("recordToPermissions", () => {
  it("keeps only granted keys", () => {
    expect(
      recordToPermissions({ canViewTasks: true, canDeleteTasks: false }),
    ).toEqual(["canViewTasks"]);
  });
});

// The escalation guard. A user must never be able to mint a role holding a
// permission they do not themselves hold.
describe("findExcessPermissions", () => {
  const actor = { canViewTasks: true, canCreateTasks: true };

  it("allows a strict subset", () => {
    expect(findExcessPermissions(["canViewTasks"], actor)).toEqual([]);
  });

  it("allows an equal set", () => {
    expect(
      findExcessPermissions(["canViewTasks", "canCreateTasks"], actor),
    ).toEqual([]);
  });

  it("reports permissions the actor does not hold", () => {
    expect(findExcessPermissions(["canViewTasks", "canManageRoles"], actor)).toEqual([
      "canManageRoles",
    ]);
  });

  it("treats an explicitly false actor permission as not held", () => {
    expect(findExcessPermissions(["canDeleteTasks"], { canDeleteTasks: false })).toEqual([
      "canDeleteTasks",
    ]);
  });

  it("reports every offending key, not just the first", () => {
    expect(findExcessPermissions(["canManageRoles", "canAccessAuditLogs"], actor)).toEqual([
      "canManageRoles",
      "canAccessAuditLogs",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/permission-set.test.ts`
Expected: FAIL — cannot resolve `../permission-set`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/roles/lib/permission-set.ts`:

```typescript
/**
 * Pure helpers for moving between the two shapes a permission set takes:
 * the `string[]` stored in `roles.permissions`, and the
 * `Record<string, boolean>` that requirePermission checks against.
 */

export function permissionsToRecord(list: string[]): Record<string, boolean> {
  const record: Record<string, boolean> = {};
  for (const permission of list) {
    record[permission] = true;
  }
  return record;
}

export function recordToPermissions(
  record: Record<string, boolean>,
): string[] {
  return Object.entries(record)
    .filter(([, granted]) => granted)
    .map(([permission]) => permission);
}

/**
 * The escalation guard: returns the requested permissions the actor does not
 * themselves hold. A non-empty result must be rejected, so that nobody can
 * create a role more powerful than they are.
 */
export function findExcessPermissions(
  requested: string[],
  actorPermissions: Record<string, boolean>,
): string[] {
  return requested.filter((permission) => actorPermissions[permission] !== true);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/permission-set.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles/lib/permission-set.ts apps/api/src/roles/lib/__tests__/permission-set.test.ts
git add apps/api/src/roles/lib/permission-set.ts apps/api/src/roles/lib/__tests__/permission-set.test.ts
git commit -m "feat(roles): add permission set helpers and escalation subset guard"
```

---

### Task 2: Seed the 11 built-in roles

**Files:**
- Create: `apps/api/src/roles/lib/system-roles.ts`
- Test: `apps/api/src/roles/lib/__tests__/system-roles.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `SYSTEM_ROLE_IDS: readonly string[]` — the 11 slugs.
  - `isSystemRoleId(value: string): boolean`
  - `seedSystemRoles(): Promise<void>` — idempotent upsert.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/lib/__tests__/system-roles.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { SYSTEM_ROLE_IDS, isSystemRoleId } from "../system-roles";

describe("SYSTEM_ROLE_IDS", () => {
  it("contains exactly the 11 built-in roles", () => {
    expect([...SYSTEM_ROLE_IDS].sort()).toEqual(
      [
        "client",
        "contractor",
        "department-head",
        "guest",
        "member",
        "project-manager",
        "project-viewer",
        "stakeholder",
        "team-lead",
        "workspace-manager",
        "workspace-viewer",
      ].sort(),
    );
  });
});

describe("isSystemRoleId", () => {
  it("recognises a built-in role name", () => {
    expect(isSystemRoleId("workspace-manager")).toBe(true);
  });

  // This is what keeps existing assignments on the unchanged resolution path.
  it("rejects a cuid-style custom role id", () => {
    expect(isSystemRoleId("hbtbd8gzkhu8skpwy4229nsh")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSystemRoleId("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/system-roles.test.ts`
Expected: FAIL — cannot resolve `../system-roles`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/roles/lib/system-roles.ts`:

```typescript
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
// NOTE: imported from the subfile, not "../../database/schema". The barrel's
// `export * from "./schema/rbac-unified"` is circular (rbac-unified imports
// back from ../schema), so these names are absent from the barrel at runtime.
import { roles } from "../../database/schema/rbac-unified";
import { ROLE_PERMISSIONS } from "../../constants/rbac";
import logger from "../../utils/logger";

/**
 * The built-in roles. Their ids are the same slugs already stored in
 * `role_assignment.role`, so seeding them does not invalidate any existing
 * assignment.
 */
export const SYSTEM_ROLE_IDS = Object.keys(ROLE_PERMISSIONS) as readonly string[];

const SYSTEM_ROLE_ID_SET = new Set(SYSTEM_ROLE_IDS);

export function isSystemRoleId(value: string): boolean {
  return SYSTEM_ROLE_ID_SET.has(value);
}

function toDisplayName(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Idempotent. `permissions` is deliberately left NULL for system roles: their
 * permissions continue to come from the ROLE_PERMISSIONS constant, so there is
 * exactly one source of truth.
 */
export async function seedSystemRoles(): Promise<void> {
  const db = getDatabase();

  for (const id of SYSTEM_ROLE_IDS) {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(roles).values({
      id,
      name: toDisplayName(id),
      description: `Built-in ${toDisplayName(id)} role`,
      type: "system",
      permissions: null,
      workspaceId: null,
      isActive: true,
    });
  }

  logger.debug(`🛡️ Seeded ${SYSTEM_ROLE_IDS.length} system roles`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/system-roles.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire seeding into startup**

In `apps/api/src/index.ts`, inside `startServer()`, immediately after `await initializeDatabase();` and before `await startServer()` is reached — specifically in the existing `main()` sequence right after `logger.debug("✅ Database initialized");` — add:

```typescript
    const { seedSystemRoles } = await import("./roles/lib/system-roles");
    await seedSystemRoles();
    logger.debug("✅ System roles seeded");
```

- [ ] **Step 6: Verify seeding against the real database**

```bash
cd apps/api && npx tsx -e "
import 'dotenv/config';
import { initializeDatabase, getDatabase } from './src/database/connection';
import { roles } from './src/database/schema/rbac-unified';
import { seedSystemRoles } from './src/roles/lib/system-roles';
await initializeDatabase();
await seedSystemRoles();
await seedSystemRoles(); // twice, to prove idempotence
const rows = await getDatabase().select().from(roles);
console.log('rows:', rows.length, '(expected 11)');
process.exit(0);
"
```
Expected: `rows: 11`.

- [ ] **Step 7: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles/lib/system-roles.ts apps/api/src/roles/lib/__tests__/system-roles.test.ts apps/api/src/index.ts
git add apps/api/src/roles/lib/system-roles.ts apps/api/src/roles/lib/__tests__/system-roles.test.ts apps/api/src/index.ts
git commit -m "feat(roles): seed the 11 built-in roles as system rows"
```

---

### Task 3: Role permission resolution with cache

**Files:**
- Create: `apps/api/src/roles/lib/resolve-role-permissions.ts`
- Test: `apps/api/src/roles/lib/__tests__/resolve-role-permissions.test.ts`

**Interfaces:**
- Consumes: `permissionsToRecord` (Task 1), `isSystemRoleId` (Task 2).
- Produces:
  - `resolveRolePermissions(role: string, workspaceId: string | null): Promise<Record<string, boolean>>`
  - `invalidateRoleCache(roleId: string): void`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/lib/__tests__/resolve-role-permissions.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("resolveRolePermissions", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    vi.resetModules();
  });

  // The whole point of name-first resolution: existing assignments must not
  // touch the database or change behaviour at all.
  it("resolves a built-in role from the constant without querying", async () => {
    const { resolveRolePermissions } = await import("../resolve-role-permissions");
    const { getRolePermissions } = await import("../../../constants/rbac");

    const result = await resolveRolePermissions("workspace-manager", null);

    expect(result).toEqual(getRolePermissions("workspace-manager"));
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("resolves a custom role from its stored permission list", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-1",
        permissions: ["canViewTasks", "canCreateTasks"],
        isActive: true,
        deletedAt: null,
        workspaceId: "ws-1",
      },
    ]);

    const { resolveRolePermissions } = await import("../resolve-role-permissions");
    const result = await resolveRolePermissions("role-1", "ws-1");

    expect(result).toEqual({ canViewTasks: true, canCreateTasks: true });
  });

  it("denies when the custom role does not exist", async () => {
    mockDb.__setSelectResults([]);

    const { resolveRolePermissions } = await import("../resolve-role-permissions");

    expect(await resolveRolePermissions("does-not-exist", "ws-1")).toEqual({});
  });

  it("denies when the role has no stored permissions", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", permissions: null, isActive: true, deletedAt: null, workspaceId: "ws-1" },
    ]);

    const { resolveRolePermissions } = await import("../resolve-role-permissions");

    expect(await resolveRolePermissions("role-1", "ws-1")).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/resolve-role-permissions.test.ts`
Expected: FAIL — cannot resolve `../resolve-role-permissions`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/roles/lib/resolve-role-permissions.ts`:

```typescript
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { getRolePermissions } from "../../constants/rbac";
import type { UserRole } from "../../types/rbac";
import { isSystemRoleId } from "./system-roles";
import { permissionsToRecord } from "./permission-set";

const CACHE_TTL_MS = 30_000;

type CacheEntry = { permissions: Record<string, boolean>; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function invalidateRoleCache(roleId: string): void {
  for (const key of cache.keys()) {
    if (key === roleId || key.startsWith(`${roleId}:`)) {
      cache.delete(key);
    }
  }
}

/**
 * Resolves a stored `role_assignment.role` value into a permission record.
 *
 * Built-in role names resolve from the ROLE_PERMISSIONS constant exactly as
 * they always have — no query, no behaviour change. Anything else is treated
 * as a custom role id.
 *
 * Fails closed: an unknown, inactive, soft-deleted or wrong-workspace role
 * yields {}, which denies every permission check.
 */
export async function resolveRolePermissions(
  role: string,
  workspaceId: string | null,
): Promise<Record<string, boolean>> {
  if (isSystemRoleId(role)) {
    return getRolePermissions(role as UserRole);
  }

  const cacheKey = `${role}:${workspaceId ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.id, role),
        eq(roles.isActive, true),
        isNull(roles.deletedAt),
      ),
    )
    .limit(1);

  const [row] = found as {
    permissions: string[] | null;
    workspaceId: string | null;
  }[];

  let permissions: Record<string, boolean> = {};
  if (row?.permissions && (row.workspaceId === null || row.workspaceId === workspaceId)) {
    permissions = permissionsToRecord(row.permissions);
  }

  cache.set(cacheKey, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return permissions;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/resolve-role-permissions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles/lib/resolve-role-permissions.ts apps/api/src/roles/lib/__tests__/resolve-role-permissions.test.ts
git add apps/api/src/roles/lib/resolve-role-permissions.ts apps/api/src/roles/lib/__tests__/resolve-role-permissions.test.ts
git commit -m "feat(roles): resolve custom role permissions, fail closed"
```

---

### Task 4: Wire resolution into requirePermission

The riskiest change in the plan — it touches the live authorization hot path. The regression test comes first and must prove existing behaviour is untouched.

**Files:**
- Modify: `apps/api/src/middlewares/rbac.ts:87`
- Test: `apps/api/src/middlewares/__tests__/rbac-custom-roles.test.ts`

**Interfaces:**
- Consumes: `resolveRolePermissions` (Task 3).
- Produces: no new exports; `requirePermission` behaviour is extended.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/middlewares/__tests__/rbac-custom-roles.test.ts`:

```typescript
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRolePermissions = vi.fn();

vi.mock("../../roles/lib/resolve-role-permissions", () => ({
  resolveRolePermissions: (role: string, workspaceId: string | null) =>
    resolveRolePermissions(role, workspaceId),
  invalidateRoleCache: vi.fn(),
}));

const mockDb = {
  select: vi.fn(),
};

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

/**
 * Builds a chainable select() whose awaited value is `rows`.
 */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  // biome-ignore lint/suspicious/noThenProperty: mock must be awaitable like drizzle's builder
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return chain;
}

describe("requirePermission with custom roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEMO_MODE = "false";
  });

  it("grants access when the assigned custom role carries the permission", async () => {
    mockDb.select
      .mockReturnValueOnce(selectReturning([{ id: "user-1", email: "u@example.com" }]))
      .mockReturnValueOnce(selectReturning([{ role: "custom-role-1", workspaceId: "ws-1", isActive: true }]))
      .mockReturnValueOnce(selectReturning([]));

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { requirePermission } = await import("../rbac");
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "u@example.com");
      await next();
    });
    app.get("/protected", requirePermission("canViewTasks"), (c) => c.json({ ok: true }));

    const res = await app.request("/protected");

    expect(res.status).toBe(200);
    expect(resolveRolePermissions).toHaveBeenCalledWith("custom-role-1", "ws-1");
  });

  it("denies when the custom role resolves to no permissions", async () => {
    mockDb.select
      .mockReturnValueOnce(selectReturning([{ id: "user-1", email: "u@example.com" }]))
      .mockReturnValueOnce(selectReturning([{ role: "deleted-role", workspaceId: "ws-1", isActive: true }]))
      .mockReturnValueOnce(selectReturning([]));

    resolveRolePermissions.mockResolvedValue({});

    const { requirePermission } = await import("../rbac");
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "u@example.com");
      await next();
    });
    app.get("/protected", requirePermission("canViewTasks"), (c) => c.json({ ok: true }));

    expect((await app.request("/protected")).status).toBe(403);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/middlewares/__tests__/rbac-custom-roles.test.ts`
Expected: FAIL — `resolveRolePermissions` is never called, because `rbac.ts` still calls `getRolePermissions` directly.

- [ ] **Step 3: Change the resolution call**

In `apps/api/src/middlewares/rbac.ts`, replace line 83-87:

```typescript
      const userRole: UserRole =
        (roleAssignment[0]?.role as UserRole | undefined) ?? "guest";

      // Get base permissions for the role
      const rolePermissions = getRolePermissions(userRole);
```

with:

```typescript
      const assignedRole = roleAssignment[0]?.role ?? "guest";
      const userRole = assignedRole as UserRole;

      // Built-in role names resolve from the ROLE_PERMISSIONS constant exactly
      // as before; anything else is looked up as a custom role id. Unknown or
      // revoked roles resolve to {}, i.e. denied — the same fail-closed
      // behaviour ROLE_PERMISSIONS[role] || {} already had.
      const rolePermissions = await resolveRolePermissions(
        assignedRole,
        roleAssignment[0]?.workspaceId ?? null,
      );
```

Add the import near the other local imports at the top of the file:

```typescript
import { resolveRolePermissions } from "../roles/lib/resolve-role-permissions";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/middlewares/__tests__/rbac-custom-roles.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole existing RBAC suite for regressions**

Run: `cd apps/api && npx vitest run src/rbac src/middlewares`
Expected: PASS with no new failures.

- [ ] **Step 6: Prove live assignments are unaffected**

```bash
cd apps/api && npx tsx -e "
import 'dotenv/config';
import { initializeDatabase, getDatabase } from './src/database/connection';
import { roleAssignmentTable } from './src/database/schema';
import { getRolePermissions } from './src/constants/rbac';
import { resolveRolePermissions } from './src/roles/lib/resolve-role-permissions';
import { eq } from 'drizzle-orm';
await initializeDatabase();
const rows = await getDatabase().select().from(roleAssignmentTable).where(eq(roleAssignmentTable.isActive, true));
let mismatches = 0;
for (const r of rows) {
  const before = JSON.stringify(getRolePermissions(r.role));
  const after = JSON.stringify(await resolveRolePermissions(r.role, r.workspaceId ?? null));
  if (before !== after) { mismatches++; console.log('MISMATCH', r.role); }
}
console.log('assignments checked:', rows.length, '| mismatches:', mismatches, '(expected 0)');
process.exit(0);
"
```
Expected: `mismatches: 0`.

- [ ] **Step 7: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/middlewares/rbac.ts apps/api/src/middlewares/__tests__/rbac-custom-roles.test.ts
git add apps/api/src/middlewares/rbac.ts apps/api/src/middlewares/__tests__/rbac-custom-roles.test.ts
git commit -m "feat(roles): enforce custom role permissions in requirePermission"
```

---

### Task 5: Audit log helper

**Files:**
- Create: `apps/api/src/roles/lib/audit.ts`
- Test: `apps/api/src/roles/lib/__tests__/audit.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `recordRoleAudit(input: RoleAuditInput): Promise<void>` where

```typescript
type RoleAuditInput = {
  action: "role_created" | "role_updated" | "role_deleted";
  roleId: string;
  changedBy: string;
  workspaceId: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};
```

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/lib/__tests__/audit.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("recordRoleAudit", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  // role_history is unusable for definition changes: its user_id is NOT NULL
  // and creating a role involves no user. role_audit_log is purpose-built.
  it("writes a role_created entry with before/after values", async () => {
    const { recordRoleAudit } = await import("../audit");

    await recordRoleAudit({
      action: "role_created",
      roleId: "role-1",
      changedBy: "user-1",
      workspaceId: "ws-1",
      newValue: { name: "Auditor" },
    });

    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(inserted.action).toBe("role_created");
    expect(inserted.roleId).toBe("role-1");
    expect(inserted.changedBy).toBe("user-1");
    expect(inserted.newValue).toEqual({ name: "Auditor" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/audit.test.ts`
Expected: FAIL — cannot resolve `../audit`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/roles/lib/audit.ts`:

```typescript
import { getDatabase } from "../../database/connection";
import { roleAuditLog } from "../../database/schema/rbac-unified";
import logger from "../../utils/logger";

export type RoleAuditInput = {
  action: "role_created" | "role_updated" | "role_deleted";
  roleId: string;
  changedBy: string;
  workspaceId: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Records a role *definition* change.
 *
 * Deliberately not role_history: that table records assignment changes and its
 * user_id is NOT NULL, whereas creating a role involves no user. The
 * assignmentId column here references the unused role_assignments table and is
 * left null.
 *
 * Auditing must never break the operation it is recording, so failures are
 * logged rather than thrown.
 */
export async function recordRoleAudit(input: RoleAuditInput): Promise<void> {
  try {
    await getDatabase()
      .insert(roleAuditLog)
      .values({
        action: input.action,
        roleId: input.roleId,
        changedBy: input.changedBy,
        workspaceId: input.workspaceId,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
  } catch (error) {
    logger.error("Failed to record role audit entry:", error);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/roles/lib/__tests__/audit.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles/lib/audit.ts apps/api/src/roles/lib/__tests__/audit.test.ts
git add apps/api/src/roles/lib/audit.ts apps/api/src/roles/lib/__tests__/audit.test.ts
git commit -m "feat(roles): record role definition changes to role_audit_log"
```

---

### Task 6: List and read endpoints, router mounted

Delivers a working read-only Manage Roles page.

**Files:**
- Create: `apps/api/src/roles/controllers/list-roles.ts`
- Create: `apps/api/src/roles/controllers/get-role.ts`
- Create: `apps/api/src/roles/controllers/get-role-usage.ts`
- Create: `apps/api/src/roles/index.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/roles/__tests__/list-roles.test.ts`

**Interfaces:**
- Consumes: `isSystemRoleId` (Task 2).
- Produces:
  - `listRoles(opts): Promise<RoleDto[]>`
  - `getRole(id): Promise<RoleDto & { permissions: string[]; workspaceId: string | null }>`
  - `getRoleUsage(id): Promise<{ usersCount: number; lastUsedAt: Date | null; assignments: { userId: string; assignedAt: Date | null }[] }>`
  - `RoleDto` = `{ id, name, description, type, color, usersCount, lastUsedAt, isActive, createdAt }` — matches the web `Role` interface in `apps/web/src/components/rbac/role-card.tsx`.
  - Route `GET /api/roles/permissions/all` → `{ permissions: string[] }`. **This endpoint is not in the spec** — it was discovered during plan review because `role-modal.tsx` already queries it to populate its permission picker. Without it the modal's picker is empty.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/__tests__/list-roles.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("listRoles", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("derives usersCount from active assignments rather than the stored column", async () => {
    mockDb.__setSelectResults(
      // roles
      [
        {
          id: "role-1",
          name: "Auditor",
          description: null,
          type: "custom",
          color: "#3B82F6",
          usersCount: 999, // stale denormalised value, must be ignored
          lastUsedAt: null,
          isActive: true,
          createdAt: new Date("2026-01-01"),
          workspaceId: "ws-1",
        },
      ],
      // active assignments
      [{ role: "role-1", assignedAt: new Date("2026-02-01") }],
    );

    const { listRoles } = await import("../controllers/list-roles");
    const result = await listRoles({ memberWorkspaceIds: ["ws-1"] });

    expect(result).toHaveLength(1);
    expect(result[0].usersCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/__tests__/list-roles.test.ts`
Expected: FAIL — cannot resolve `../controllers/list-roles`.

- [ ] **Step 3: Write list-roles.ts**

Create `apps/api/src/roles/controllers/list-roles.ts`:

```typescript
import { and, eq, isNull, inArray, or } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { roleAssignmentTable } from "../../database/schema";

export type RoleDto = {
  id: string;
  name: string;
  description: string | null;
  type: "system" | "custom";
  color: string;
  usersCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

type ListRolesOptions = {
  /** Workspaces the caller belongs to. Custom roles outside these are hidden. */
  memberWorkspaceIds: string[];
  type?: "all" | "system" | "custom";
  search?: string;
};

export async function listRoles(
  options: ListRolesOptions,
): Promise<RoleDto[]> {
  const db = getDatabase();

  // System roles are global and visible to everyone; custom roles are only
  // ever returned for workspaces the caller is a member of, so this endpoint
  // cannot be used to enumerate another tenant's roles.
  const visibility =
    options.memberWorkspaceIds.length > 0
      ? or(
          eq(roles.type, "system"),
          inArray(roles.workspaceId, options.memberWorkspaceIds),
        )
      : eq(roles.type, "system");

  const rows = await db
    .select()
    .from(roles)
    .where(and(isNull(roles.deletedAt), visibility));

  const assignments = await db
    .select({
      role: roleAssignmentTable.role,
      assignedAt: roleAssignmentTable.assignedAt,
    })
    .from(roleAssignmentTable)
    .where(eq(roleAssignmentTable.isActive, true));

  const usage = new Map<string, { count: number; lastUsedAt: Date | null }>();
  for (const assignment of assignments) {
    const current = usage.get(assignment.role) ?? { count: 0, lastUsedAt: null };
    current.count += 1;
    const at = assignment.assignedAt ? new Date(assignment.assignedAt) : null;
    if (at && (!current.lastUsedAt || at > current.lastUsedAt)) {
      current.lastUsedAt = at;
    }
    usage.set(assignment.role, current);
  }

  const typed = rows as unknown as (RoleDto & { workspaceId: string | null })[];

  return typed
    .filter((row) => {
      if (options.type && options.type !== "all" && row.type !== options.type) {
        return false;
      }
      if (options.search) {
        return row.name.toLowerCase().includes(options.search.toLowerCase());
      }
      return true;
    })
    .map((row) => {
      const stats = usage.get(row.id);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        color: row.color,
        // Derived, never the denormalised roles.users_count column, which drifts.
        usersCount: stats?.count ?? 0,
        lastUsedAt: stats?.lastUsedAt ?? null,
        isActive: row.isActive,
        createdAt: row.createdAt,
      };
    });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/roles/__tests__/list-roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Write get-role.ts and get-role-usage.ts**

Create `apps/api/src/roles/controllers/get-role.ts`:

```typescript
import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { getRolePermissions } from "../../constants/rbac";
import type { UserRole } from "../../types/rbac";
import { isSystemRoleId } from "../lib/system-roles";
import { recordToPermissions } from "../lib/permission-set";
import type { RoleDto } from "./list-roles";

export async function getRole(
  id: string,
): Promise<RoleDto & { permissions: string[]; workspaceId: string | null }> {
  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
    .limit(1);

  const [row] = found as unknown as (RoleDto & {
    permissions: string[] | null;
    workspaceId: string | null;
  })[];

  if (!row) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  // System roles keep permissions in the constant, so read them from there.
  const permissions = isSystemRoleId(row.id)
    ? recordToPermissions(getRolePermissions(row.id as UserRole))
    : (row.permissions ?? []);

  return { ...row, permissions };
}
```

Create `apps/api/src/roles/controllers/get-role-usage.ts`:

```typescript
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { roleAssignmentTable } from "../../database/schema";

export async function getRoleUsage(roleId: string): Promise<{
  usersCount: number;
  lastUsedAt: Date | null;
  assignments: { userId: string; assignedAt: Date | null }[];
}> {
  const rows = await getDatabase()
    .select({
      userId: roleAssignmentTable.userId,
      assignedAt: roleAssignmentTable.assignedAt,
    })
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.role, roleId),
        eq(roleAssignmentTable.isActive, true),
      ),
    );

  let lastUsedAt: Date | null = null;
  for (const row of rows) {
    const at = row.assignedAt ? new Date(row.assignedAt) : null;
    if (at && (!lastUsedAt || at > lastUsedAt)) {
      lastUsedAt = at;
    }
  }

  return { usersCount: rows.length, lastUsedAt, assignments: rows };
}
```

- [ ] **Step 6: Create the router and mount it**

Create `apps/api/src/roles/index.ts`:

```typescript
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { workspaceUserTable } from "../database/schema";
import { listRoles } from "./controllers/list-roles";
import { getRole } from "./controllers/get-role";
import { getRoleUsage } from "./controllers/get-role-usage";

const rolesRouter = new Hono<{
  Variables: { userEmail: string; userId?: string };
}>();

/** Workspaces the caller belongs to — the tenant boundary for custom roles. */
async function memberWorkspaceIds(userEmail: string): Promise<string[]> {
  const rows = await getDatabase()
    .select({ workspaceId: workspaceUserTable.workspaceId })
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userEmail, userEmail));
  return rows.map((row) => row.workspaceId);
}

rolesRouter
  .get("/", async (c) => {
    const type = c.req.query("type") as "all" | "system" | "custom" | undefined;
    const search = c.req.query("search") ?? undefined;
    const roleList = await listRoles({
      memberWorkspaceIds: await memberWorkspaceIds(c.get("userEmail")),
      type,
      search,
    });
    return c.json({ roles: roleList });
  })
  // Registered before "/:id" so the literal path is not captured as an id.
  // RoleModal already queries this to populate its permission picker.
  .get("/permissions/all", (c) =>
    c.json({ permissions: ALL_PERMISSION_KEYS }),
  )
  .get("/:id/usage", async (c) => c.json(await getRoleUsage(c.req.param("id"))))
  .get("/:id", async (c) => c.json({ role: await getRole(c.req.param("id")) }));

export default rolesRouter;
```

`ALL_PERMISSION_KEYS` is derived once from the constant — add near the top of
the router file:

```typescript
import { ROLE_PERMISSIONS } from "../constants/rbac";

/**
 * Every permission key the system knows about.
 *
 * Deliberately the union across all roles, not the keys of the most
 * privileged one: workspace-manager is missing canViewAssignedTasks,
 * canUpdateAssignedTasks and canManageDepartment, which other roles define.
 * Taking any single role's keys would silently omit permissions from the
 * editor.
 */
const ALL_PERMISSION_KEYS = [
  ...new Set(
    Object.values(ROLE_PERMISSIONS).flatMap((permissions) =>
      Object.keys(permissions as Record<string, boolean>),
    ),
  ),
].sort();
```

In `apps/api/src/index.ts`, add the import alongside the other routers:

```typescript
import rolesRouter from "./roles";
```

and mount it next to the other `app.route` calls:

```typescript
const rolesRoute = app.route("/api/roles", rolesRouter);
```

Note the `/:id/usage` route is registered before `/:id` so it is not shadowed.

- [ ] **Step 7: Verify against the running API**

```bash
cd "$(git rev-parse --show-toplevel)" && cookie=$(curl -s -i -X POST http://localhost:3005/api/users/sign-in -H "Content-Type: application/json" -d '{"email":"admin@meridian.app","password":"demo123"}' | grep -i "^set-cookie:" | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1 | paste -sd'; ')
curl -s -H "Cookie: $cookie" http://localhost:3005/api/roles | head -c 400
```
Expected: JSON `{"roles":[...]}` containing the 11 system roles.

- [ ] **Step 8: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles apps/api/src/index.ts
git add apps/api/src/roles apps/api/src/index.ts
git commit -m "feat(roles): add list/get/usage endpoints and mount /api/roles"
```

---

### Task 7: Create endpoint with the escalation guard

**Files:**
- Create: `apps/api/src/roles/controllers/create-role.ts`
- Modify: `apps/api/src/roles/index.ts`
- Test: `apps/api/src/roles/__tests__/create-role.test.ts`

**Interfaces:**
- Consumes: `findExcessPermissions` (Task 1), `recordRoleAudit` (Task 5), `resolveRolePermissions` (Task 3).
- Produces: `createRole(input): Promise<RoleDto>` where `input` is
  `{ name, description, color, permissions, workspaceId, actorUserId, actorPermissions }`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/__tests__/create-role.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPException } from "hono/http-exception";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));
vi.mock("../lib/audit", () => ({ recordRoleAudit: vi.fn() }));

const mockDb = createMockDb();

describe("createRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([
      { id: "new-role", name: "Auditor", type: "custom" },
    ]);
  });

  it("creates a custom role when the permissions are a subset of the actor's", async () => {
    const { createRole } = await import("../controllers/create-role");

    const result = await createRole({
      name: "Auditor",
      description: "Read-only auditor",
      color: "#3B82F6",
      permissions: ["canViewTasks"],
      workspaceId: "ws-1",
      actorUserId: "user-1",
      actorPermissions: { canViewTasks: true, canCreateTasks: true },
    });

    expect(result.id).toBe("new-role");
    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(inserted.type).toBe("custom");
    expect(inserted.permissions).toEqual(["canViewTasks"]);
    expect(inserted.workspaceId).toBe("ws-1");
  });

  // The escalation guard.
  it("rejects permissions the actor does not hold, naming them", async () => {
    const { createRole } = await import("../controllers/create-role");

    await expect(
      createRole({
        name: "Superuser",
        description: null,
        color: "#3B82F6",
        permissions: ["canViewTasks", "canManageRoles"],
        workspaceId: "ws-1",
        actorUserId: "user-1",
        actorPermissions: { canViewTasks: true },
      }),
    ).rejects.toThrow(/canManageRoles/);
  });

  it("refuses to create a role without a workspace", async () => {
    const { createRole } = await import("../controllers/create-role");

    await expect(
      createRole({
        name: "Global",
        description: null,
        color: "#3B82F6",
        permissions: [],
        workspaceId: "",
        actorUserId: "user-1",
        actorPermissions: {},
      }),
    ).rejects.toBeInstanceOf(HTTPException);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/__tests__/create-role.test.ts`
Expected: FAIL — cannot resolve `../controllers/create-role`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/roles/controllers/create-role.ts`:

```typescript
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { findExcessPermissions } from "../lib/permission-set";
import { recordRoleAudit } from "../lib/audit";
import type { RoleDto } from "./list-roles";

export type CreateRoleInput = {
  name: string;
  description: string | null;
  color: string;
  permissions: string[];
  workspaceId: string;
  actorUserId: string;
  actorPermissions: Record<string, boolean>;
  baseRoleId?: string | null;
  ipAddress?: string;
  userAgent?: string;
};

export async function createRole(input: CreateRoleInput): Promise<RoleDto> {
  if (!input.workspaceId) {
    throw new HTTPException(400, {
      message: "Custom roles must belong to a workspace",
    });
  }

  // Escalation guard: you cannot mint a role more powerful than yourself.
  const excess = findExcessPermissions(input.permissions, input.actorPermissions);
  if (excess.length > 0) {
    throw new HTTPException(403, {
      message: `You cannot grant permissions you do not hold: ${excess.join(", ")}`,
    });
  }

  const [created] = await getDatabase()
    .insert(roles)
    .values({
      name: input.name,
      description: input.description,
      type: "custom",
      permissions: input.permissions,
      workspaceId: input.workspaceId,
      color: input.color,
      baseRoleId: input.baseRoleId ?? null,
      createdBy: input.actorUserId,
      isActive: true,
    })
    .returning();

  if (!created) {
    throw new Error("createRole: insert returned no row");
  }

  await recordRoleAudit({
    action: "role_created",
    roleId: created.id,
    changedBy: input.actorUserId,
    workspaceId: input.workspaceId,
    newValue: { name: input.name, permissions: input.permissions },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return created as unknown as RoleDto;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/roles/__tests__/create-role.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the route**

In `apps/api/src/roles/index.ts`, add these imports:

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq as eqOp } from "drizzle-orm";
import { userTable, roleAssignmentTable } from "../database/schema";
import { requirePermission } from "../middlewares/rbac";
import { resolveRolePermissions } from "./lib/resolve-role-permissions";
import { createRole } from "./controllers/create-role";
```

Add this helper below `memberWorkspaceIds`:

```typescript
/** The actor's own effective permissions — the ceiling for any role they create. */
async function actorContext(userEmail: string) {
  const db = getDatabase();
  const [user] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eqOp(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const [assignment] = await db
    .select()
    .from(roleAssignmentTable)
    .where(eqOp(roleAssignmentTable.userId, user.id))
    .limit(1);

  const permissions = await resolveRolePermissions(
    assignment?.role ?? "guest",
    assignment?.workspaceId ?? null,
  );

  return { userId: user.id, permissions };
}
```

Import `HTTPException` at the top: `import { HTTPException } from "hono/http-exception";`

Then add the route to the chain:

```typescript
  .post(
    "/",
    requirePermission("canManageRoles"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).nullable().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        permissions: z.array(z.string()).default([]),
        workspaceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const actor = await actorContext(c.get("userEmail"));
      const role = await createRole({
        name: body.name,
        description: body.description ?? null,
        color: body.color ?? "#3B82F6",
        permissions: body.permissions,
        workspaceId: body.workspaceId,
        actorUserId: actor.userId,
        actorPermissions: actor.permissions,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role }, 201);
    },
  )
```

- [ ] **Step 6: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles
git add apps/api/src/roles
git commit -m "feat(roles): add create endpoint with escalation subset guard"
```

---

### Task 8: Update, delete and clone endpoints

**Files:**
- Create: `apps/api/src/roles/controllers/update-role.ts`
- Create: `apps/api/src/roles/controllers/delete-role.ts`
- Create: `apps/api/src/roles/controllers/clone-role.ts`
- Modify: `apps/api/src/roles/index.ts`
- Test: `apps/api/src/roles/__tests__/update-delete-clone.test.ts`

**Interfaces:**
- Consumes: `findExcessPermissions` (Task 1), `isSystemRoleId` (Task 2), `invalidateRoleCache` (Task 3), `recordRoleAudit` (Task 5), `getRole` (Task 6), `getRoleUsage` (Task 6), `createRole` (Task 7).
- Produces:
  - `updateRole(id, input): Promise<RoleDto>`
  - `deleteRole(id, actorUserId): Promise<{ success: true }>`
  - `cloneRole(id, input): Promise<RoleDto>`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/roles/__tests__/update-delete-clone.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));
vi.mock("../lib/audit", () => ({ recordRoleAudit: vi.fn() }));

const getRoleUsage = vi.fn();
vi.mock("../controllers/get-role-usage", () => ({
  getRoleUsage: (id: string) => getRoleUsage(id),
}));

const mockDb = createMockDb();

describe("updateRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([{ id: "role-1", name: "Renamed" }]);
  });

  it("refuses to modify a built-in role", async () => {
    const { updateRole } = await import("../controllers/update-role");

    await expect(
      updateRole("workspace-manager", {
        name: "Hijacked",
        actorUserId: "user-1",
        actorPermissions: { canManageRoles: true },
      }),
    ).rejects.toThrow(/built-in/i);
  });

  it("rejects permissions the actor does not hold", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", type: "custom", workspaceId: "ws-1", permissions: [] },
    ]);
    const { updateRole } = await import("../controllers/update-role");

    await expect(
      updateRole("role-1", {
        permissions: ["canManageRoles"],
        actorUserId: "user-1",
        actorPermissions: { canViewTasks: true },
      }),
    ).rejects.toThrow(/canManageRoles/);
  });
});

describe("deleteRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("refuses to delete a built-in role", async () => {
    const { deleteRole } = await import("../controllers/delete-role");
    await expect(deleteRole("member", "user-1")).rejects.toThrow(/built-in/i);
  });

  // Deleting a role in use would silently strip its holders of all access.
  it("refuses to delete a role that is still assigned, with the count", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", type: "custom", workspaceId: "ws-1" },
    ]);
    getRoleUsage.mockResolvedValue({ usersCount: 3, lastUsedAt: null, assignments: [] });

    const { deleteRole } = await import("../controllers/delete-role");
    await expect(deleteRole("role-1", "user-1")).rejects.toThrow(/3/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/roles/__tests__/update-delete-clone.test.ts`
Expected: FAIL — cannot resolve the controllers.

- [ ] **Step 3: Write update-role.ts**

```typescript
import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { isSystemRoleId } from "../lib/system-roles";
import { findExcessPermissions } from "../lib/permission-set";
import { invalidateRoleCache } from "../lib/resolve-role-permissions";
import { recordRoleAudit } from "../lib/audit";
import type { RoleDto } from "./list-roles";

export type UpdateRoleInput = {
  name?: string;
  description?: string | null;
  color?: string;
  permissions?: string[];
  isActive?: boolean;
  actorUserId: string;
  actorPermissions: Record<string, boolean>;
  ipAddress?: string;
  userAgent?: string;
};

export async function updateRole(
  id: string,
  input: UpdateRoleInput,
): Promise<RoleDto> {
  if (isSystemRoleId(id)) {
    throw new HTTPException(400, {
      message: "Built-in roles cannot be modified",
    });
  }

  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
    .limit(1);

  const [existing] = found as unknown as {
    id: string;
    workspaceId: string | null;
    permissions: string[] | null;
  }[];

  if (!existing) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  if (input.permissions) {
    const excess = findExcessPermissions(input.permissions, input.actorPermissions);
    if (excess.length > 0) {
      throw new HTTPException(403, {
        message: `You cannot grant permissions you do not hold: ${excess.join(", ")}`,
      });
    }
  }

  const [updated] = await db
    .update(roles)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(roles.id, id))
    .returning();

  // Holders must pick the change up immediately, not after the TTL.
  invalidateRoleCache(id);

  await recordRoleAudit({
    action: "role_updated",
    roleId: id,
    changedBy: input.actorUserId,
    workspaceId: existing.workspaceId,
    previousValue: { permissions: existing.permissions },
    newValue: { permissions: input.permissions ?? existing.permissions },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return updated as unknown as RoleDto;
}
```

- [ ] **Step 4: Write delete-role.ts**

```typescript
import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { isSystemRoleId } from "../lib/system-roles";
import { invalidateRoleCache } from "../lib/resolve-role-permissions";
import { recordRoleAudit } from "../lib/audit";
import { getRoleUsage } from "./get-role-usage";

export async function deleteRole(
  id: string,
  actorUserId: string,
  meta: { ipAddress?: string; userAgent?: string } = {},
): Promise<{ success: true }> {
  if (isSystemRoleId(id)) {
    throw new HTTPException(400, {
      message: "Built-in roles cannot be deleted",
    });
  }

  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
    .limit(1);

  const [existing] = found as unknown as { id: string; workspaceId: string | null }[];
  if (!existing) {
    throw new HTTPException(404, { message: "Role not found" });
  }

  // Deleting an assigned role would silently strip its holders of all access.
  const usage = await getRoleUsage(id);
  if (usage.usersCount > 0) {
    throw new HTTPException(400, {
      message: `Cannot delete: ${usage.usersCount} user(s) still have this role. Reassign them first.`,
    });
  }

  await db
    .update(roles)
    .set({ deletedAt: new Date(), deletedBy: actorUserId, isActive: false })
    .where(eq(roles.id, id));

  invalidateRoleCache(id);

  await recordRoleAudit({
    action: "role_deleted",
    roleId: id,
    changedBy: actorUserId,
    workspaceId: existing.workspaceId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { success: true };
}
```

- [ ] **Step 5: Write clone-role.ts**

```typescript
import { getRole } from "./get-role";
import { createRole } from "./create-role";
import type { RoleDto } from "./list-roles";

export type CloneRoleInput = {
  name?: string;
  workspaceId: string;
  actorUserId: string;
  actorPermissions: Record<string, boolean>;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Cloning a system role is allowed — the copy is always a custom role, so this
 * is how an admin starts from a built-in and narrows it.
 */
export async function cloneRole(
  sourceId: string,
  input: CloneRoleInput,
): Promise<RoleDto> {
  const source = await getRole(sourceId);

  return createRole({
    name: input.name ?? `${source.name} (copy)`,
    description: source.description,
    color: source.color,
    permissions: source.permissions,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    actorPermissions: input.actorPermissions,
    baseRoleId: source.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/api && npx vitest run src/roles/__tests__/update-delete-clone.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Add the routes**

Add to the chain in `apps/api/src/roles/index.ts`:

```typescript
  .put(
    "/:id",
    requirePermission("canManageRoles"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const actor = await actorContext(c.get("userEmail"));
      const role = await updateRole(c.req.param("id"), {
        ...c.req.valid("json"),
        actorUserId: actor.userId,
        actorPermissions: actor.permissions,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role });
    },
  )
  .delete("/:id", requirePermission("canManageRoles"), async (c) => {
    const actor = await actorContext(c.get("userEmail"));
    return c.json(
      await deleteRole(c.req.param("id"), actor.userId, {
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      }),
    );
  })
  .post(
    "/:id/clone",
    requirePermission("canManageRoles"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100).optional(),
        workspaceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const actor = await actorContext(c.get("userEmail"));
      const role = await cloneRole(c.req.param("id"), {
        name: body.name,
        workspaceId: body.workspaceId,
        actorUserId: actor.userId,
        actorPermissions: actor.permissions,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role }, 201);
    },
  )
```

with imports:

```typescript
import { updateRole } from "./controllers/update-role";
import { deleteRole } from "./controllers/delete-role";
import { cloneRole } from "./controllers/clone-role";
```

- [ ] **Step 8: Write the authz integration test**

The spec requires proving every write endpoint is gated. `requirePermission` is
applied declaratively, so it is easy to omit on a new route and never notice —
this test fails loudly if that happens.

Create `apps/api/src/roles/__tests__/authz.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import rolesRouter from "../index";

/**
 * Every mutating route must sit behind requirePermission("canManageRoles").
 * With no userEmail set on the context the middleware short-circuits, so a
 * route that reaches its handler (and therefore fails differently) is a route
 * that is not gated.
 */
describe("roles write endpoints require canManageRoles", () => {
  const cases: [string, string][] = [
    ["POST", "/"],
    ["PUT", "/some-role"],
    ["DELETE", "/some-role"],
    ["POST", "/some-role/clone"],
  ];

  it.each(cases)("%s %s is not publicly writable", async (method, path) => {
    const res = await rolesRouter.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify({}),
    });

    expect([401, 403]).toContain(res.status);
  });
});
```

- [ ] **Step 9: Run the authz test**

Run: `cd apps/api && npx vitest run src/roles/__tests__/authz.test.ts`
Expected: PASS (4 cases). If any returns 200/201/400, that route is missing its
`requirePermission("canManageRoles")` guard — add it before continuing.

- [ ] **Step 10: Typecheck, format and commit**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../.. && npx biome check --write apps/api/src/roles
git add apps/api/src/roles
git commit -m "feat(roles): add update, soft-delete and clone endpoints"
```

---

### Task 9: Repoint the frontend and add the permission editor

**Files:**
- Modify: `apps/web/src/routes/dashboard/settings/roles-unified.tsx:66,96,123`
- Modify: `apps/web/src/components/rbac/role-modal.tsx`
- Create: `apps/web/src/lib/permissions/permission-groups.ts`
- Test: `apps/web/src/lib/permissions/__tests__/permission-groups.test.ts`

**Interfaces:**
- Consumes: the API from Tasks 6-8.
- Produces: `groupPermissions(keys: string[]): { group: string; permissions: string[] }[]`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/permissions/__tests__/permission-groups.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { groupPermissions } from "../permission-groups";

describe("groupPermissions", () => {
  // There are 157 permission keys; a flat checkbox list is unusable.
  it("groups by verb prefix", () => {
    const result = groupPermissions([
      "canViewTasks",
      "canViewProjects",
      "canManageRoles",
      "canCreateTasks",
    ]);

    expect(result).toEqual([
      { group: "Create", permissions: ["canCreateTasks"] },
      { group: "Manage", permissions: ["canManageRoles"] },
      { group: "View", permissions: ["canViewProjects", "canViewTasks"] },
    ]);
  });

  it("puts unrecognised shapes in Other", () => {
    expect(groupPermissions(["somethingElse"])).toEqual([
      { group: "Other", permissions: ["somethingElse"] },
    ]);
  });

  it("returns an empty array for no permissions", () => {
    expect(groupPermissions([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run src/lib/permissions/__tests__/permission-groups.test.ts`
Expected: FAIL — cannot resolve `../permission-groups`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/lib/permissions/permission-groups.ts`:

```typescript
/**
 * Groups permission keys by their verb so the role editor can render
 * collapsible sections. The codebase has 157 permission keys, which is
 * unusable as a single flat checkbox list.
 */
const KNOWN_VERBS = [
  "Access",
  "Approve",
  "Archive",
  "Assign",
  "Create",
  "Delete",
  "Edit",
  "Export",
  "Import",
  "Invite",
  "Manage",
  "Update",
  "View",
];

export function groupPermissions(
  keys: string[],
): { group: string; permissions: string[] }[] {
  const groups = new Map<string, string[]>();

  for (const key of keys) {
    const verb = KNOWN_VERBS.find((candidate) => key.startsWith(`can${candidate}`));
    const group = verb ?? "Other";
    const bucket = groups.get(group) ?? [];
    bucket.push(key);
    groups.set(group, bucket);
  }

  return [...groups.entries()]
    .map(([group, permissions]) => ({ group, permissions: permissions.sort() }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run src/lib/permissions/__tests__/permission-groups.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Repoint the fetches**

The frontend needs less work than expected. `role-modal.tsx` already holds
`formData` with `name`/`description`/`color`/`permissions`/`baseRoleId`, already
reads `workspaceId` from `useWorkspaceStore()`, and already queries
`GET /roles/permissions/all` for its picker (which Task 6 now provides). The
three call sites in `roles-unified.tsx` already target the correct paths — they
404'd only because the backend did not exist.

Verify each response is unwrapped correctly:

- Line 66-67 list call: response is `{ roles: Role[] }`; the page already reads
  `data.roles`. No change needed.
- Line 96 delete call: now returns `{ success: true }`. No change needed.
- Line 123 clone call: must send a JSON body with `workspaceId`. Change it to:

```typescript
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/clone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
```

Obtain `workspaceId` the same way `role-modal.tsx` already does — add to the
page component:

```typescript
import useWorkspaceStore from "@/store/workspace";
// ...inside the component:
const { workspace } = useWorkspaceStore();
const workspaceId = workspace?.id || "";
```

- [ ] **Step 6: Group the permission picker**

`role-modal.tsx` currently renders `allPermissions` as one flat list of 157
checkboxes. Replace that rendering with grouped sections using
`groupPermissions` from Step 3, and disable any permission the actor does not
hold so the server-side subset rule is visible rather than surprising the user
with a 403:

```tsx
{groupPermissions(allPermissions ?? []).map(({ group, permissions }) => (
  <div key={group} className="space-y-2">
    <h4 className="text-sm font-medium text-muted-foreground">{group}</h4>
    <div className="grid grid-cols-2 gap-2">
      {permissions.map((permission) => {
        const actorHasIt = actorPermissions[permission] === true;
        return (
          <label
            key={permission}
            className="flex items-center gap-2 text-sm"
            title={actorHasIt ? undefined : "You do not hold this permission"}
          >
            <input
              type="checkbox"
              disabled={isSystemRole || !actorHasIt}
              checked={formData.permissions.includes(permission)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  permissions: e.target.checked
                    ? [...prev.permissions, permission]
                    : prev.permissions.filter((p) => p !== permission),
                }))
              }
            />
            <span className={actorHasIt ? "" : "opacity-50"}>{permission}</span>
          </label>
        );
      })}
    </div>
  </div>
))}
```

`actorPermissions` comes from the existing RBAC context:

```typescript
import { useRBACAuth } from "@/lib/permissions";
// ...inside the component:
const { user: rbacUser } = useRBACAuth();
const actorPermissions = (rbacUser?.permissions ?? {}) as Record<string, boolean>;
```

Note `role-modal.tsx` declares its **own** local `Role` interface at line 43,
separate from the exported one in `role-card.tsx`. Leave both as they are —
unifying them is unrelated cleanup and would widen this change.

- [ ] **Step 7: Verify the page end-to-end in the browser**

Load `http://localhost:5174/dashboard/settings/roles-unified` signed in as `admin@meridian.app` / `demo123`. Confirm: the 11 system roles render; each shows a real `usersCount`; Delete on a system role is rejected with "Built-in roles cannot be deleted"; Clone produces a new custom role.

- [ ] **Step 8: Typecheck, format and commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.app.json
cd .. && npx biome check --write apps/web/src/lib/permissions apps/web/src/routes/dashboard/settings/roles-unified.tsx apps/web/src/components/rbac/role-modal.tsx
git add apps/web/src/lib/permissions apps/web/src/routes/dashboard/settings/roles-unified.tsx apps/web/src/components/rbac/role-modal.tsx
git commit -m "feat(roles): point Manage Roles at the real API and group permissions"
```

---

### Task 10: Full-suite regression check

**Files:** none created; this task is verification only.

- [ ] **Step 1: Run the API suite**

Run: `cd apps/api && npx vitest run`
Expected: no new failures. The 12 failures in `src/__tests__/health-api.test.ts` are pre-existing and unrelated — confirm the count is still exactly 12 and the file is still the only failing one.

- [ ] **Step 2: Run the web suite**

Run: `cd apps/web && npx vitest run`
Expected: no new failures beyond the known pre-existing `milestone-dashboard.test.tsx` failure and the flaky `create-project-modal.test.tsx`.

- [ ] **Step 3: Typecheck both apps**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd ../web && npx tsc --noEmit -p tsconfig.app.json
```
Expected: both exit 0.

- [ ] **Step 4: Confirm live permissions are unchanged**

Re-run the script from Task 4 Step 6. Expected: `mismatches: 0`.

- [ ] **Step 5: Commit any fixes**

Stage by explicit path — **never `git add -A`**. This working tree carries
unrelated in-flight work from another session
(`apps/api/src/user-preferences/`, `apps/web/src/lib/dev/`) which must not be
swept into a roles commit.

```bash
git add apps/api/src/roles apps/web/src/lib/permissions
git status --short   # confirm nothing unrelated is staged
git commit -m "test(roles): fix regressions found in full-suite run"
```
(Skip if nothing changed.)
