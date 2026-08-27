/**
 * resolveRolePermissions — integration tests against a real database.
 *
 * WHY THIS FILE EXISTS, and why the sibling unit tests are not enough:
 *
 * `resolveRolePermissions` is on the hot path of every authenticated request —
 * `requirePermission`, `checkWorkspacePermission` and `checkProjectPermission`
 * all resolve through it. Its fail-closed guarantees live entirely in a SQL
 * WHERE clause:
 *
 *     and(eq(roles.id, role), eq(roles.isActive, true), isNull(roles.deletedAt))
 *
 * The shared mock in `tests/helpers/test-database.ts` sets
 * `chain.where = vi.fn().mockReturnValue(chain)` — it accepts the predicate and
 * throws it away. So a unit test CANNOT detect a dropped or weakened `.where()`
 * clause: delete `eq(roles.isActive, true)` and every mocked test still passes.
 *
 * That is not hypothetical. A missing `eq(roleAssignmentTable.isActive, true)`
 * in the sibling permission-ceiling lookup survived 24 commits, five security
 * reviews and 475 passing tests, and was caught only by a whole-branch review.
 *
 * Each test below therefore isolates ONE predicate and asserts it denies. If
 * any single predicate is removed from the query, exactly one of these fails.
 *
 * Skips cleanly when no database is provisioned, matching the other
 * DB-integration suites in this repo.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../../../database/connection";
// Imported from the subfile, never the barrel: schema.ts re-exports this module
// with `export *` while the module imports back from ../schema, and that cycle
// means the barrel does not expose `roles` at runtime.
import { roles } from "../../../database/schema/rbac-unified";
import { workspaceTable } from "../../../database/schema";
import {
  invalidateRoleCache,
  resolveRolePermissions,
} from "../resolve-role-permissions";

/**
 * `roles.workspace_id` is a foreign key onto `workspaces`, so the fixture must
 * live in a workspace that really exists — resolved once in beforeAll.
 *
 * The mismatch case does NOT need a second real workspace: the workspace that
 * `resolveRolePermissions` is *called with* is only ever compared against the
 * row, never inserted, so a value that exists nowhere is exactly the right
 * input for "a workspace this role does not belong to".
 */
let WORKSPACE_ID = "";
const OTHER_WORKSPACE_ID = "resolve-int-workspace-that-does-not-exist";
const ROLE_NAME = "resolve-int-fixture";

let db: ReturnType<typeof getDatabase>;

/**
 * `tests/setup.ts` pins DATABASE_URL to a dedicated `meridian_test` database.
 * That database is not provisioned in most environments, so every DB suite in
 * this repo skips by default — which would make this file advertise coverage
 * it never actually provides, the precise failure this test exists to prevent.
 *
 * So: try the dedicated test database first, and fall back to whatever
 * DATABASE_URL the environment really has (`.env`). The suite only ever
 * inserts and deletes rows it created, identified by a fixture-specific name
 * and workspace id that cannot collide with real data, and cleans up after
 * every test — so running against a development database is safe.
 */
async function connect(): Promise<boolean> {
  if (
    await initializeDatabase()
      .then(() => true)
      .catch(() => false)
  ) {
    return true;
  }

  const { config } = await import("dotenv");
  const parsed = config({ path: "./.env" }).parsed;
  const fallback = parsed?.DATABASE_URL;
  if (!fallback) {
    return false;
  }

  process.env.DATABASE_URL = fallback;
  return initializeDatabase()
    .then(() => true)
    .catch(() => false);
}

const dbAvailable = await connect();

/**
 * Inserts a custom role granting exactly `canViewTasks`, scoped to
 * WORKSPACE_ID. `overrides` lets each test flip one field so the assertion
 * isolates a single predicate.
 */
async function createFixtureRole(
  overrides: Partial<{ isActive: boolean; deletedAt: Date | null }> = {},
): Promise<string> {
  const [row] = await db
    .insert(roles)
    .values({
      name: ROLE_NAME,
      slug: ROLE_NAME,
      type: "custom",
      permissions: ["canViewTasks"],
      workspaceId: WORKSPACE_ID,
      isActive: overrides.isActive ?? true,
      deletedAt: overrides.deletedAt ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("fixture role insert returned no row");
  }

  // The resolver caches for 30s keyed by `${roleId}:${workspaceId}`; a fresh id
  // cannot collide, but invalidate anyway so a rerun in the same process can
  // never read a previous run's entry.
  invalidateRoleCache(row.id);
  return row.id;
}

describe.skipIf(!dbAvailable)("resolveRolePermissions (integration)", () => {
  beforeAll(async () => {
    db = getDatabase();

    const [workspace] = await db
      .select({ id: workspaceTable.id })
      .from(workspaceTable)
      .limit(1);

    if (!workspace) {
      throw new Error(
        "no workspace exists to anchor the fixture role — seed the database first",
      );
    }
    WORKSPACE_ID = workspace.id;
  });

  afterEach(async () => {
    await db.delete(roles).where(eq(roles.name, ROLE_NAME));
  });

  it("resolves a custom role's permissions in its own workspace", async () => {
    const id = await createFixtureRole();

    await expect(resolveRolePermissions(id, WORKSPACE_ID)).resolves.toEqual({
      canViewTasks: true,
    });
  });

  // Pins the tenant boundary. Without it, a custom role from one workspace
  // would grant its permissions to a caller in another.
  it("denies a custom role when the workspace does not match", async () => {
    const id = await createFixtureRole();

    await expect(
      resolveRolePermissions(id, OTHER_WORKSPACE_ID),
    ).resolves.toEqual({});
  });

  // Pins `eq(roles.isActive, true)`. Deactivating a role must revoke it.
  it("denies an inactive role", async () => {
    const id = await createFixtureRole({ isActive: false });

    await expect(resolveRolePermissions(id, WORKSPACE_ID)).resolves.toEqual({});
  });

  // Pins `isNull(roles.deletedAt)`. Soft delete must revoke, not merely hide.
  it("denies a soft-deleted role", async () => {
    const id = await createFixtureRole({ deletedAt: new Date() });

    await expect(resolveRolePermissions(id, WORKSPACE_ID)).resolves.toEqual({});
  });

  it("denies an unknown role id", async () => {
    await expect(
      resolveRolePermissions("no-such-role-id", WORKSPACE_ID),
    ).resolves.toEqual({});
  });

  // Built-in roles must never take the database path: their rows carry
  // permissions = NULL and resolve from the ROLE_PERMISSIONS constant. If they
  // ever hit the DB branch they would resolve to {} and lock every existing
  // user out — all 48 live assignments use built-in slugs.
  it("resolves a built-in role from the constant, not the database", async () => {
    const resolved = await resolveRolePermissions("workspace-manager", null);

    expect(Object.keys(resolved).length).toBeGreaterThan(0);
    expect(resolved.canManageRoles).toBe(true);
  });
});
