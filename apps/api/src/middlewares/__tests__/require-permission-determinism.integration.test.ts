/**
 * requirePermission — determinism and least-privilege, against a real database.
 *
 * WHY THIS FILE EXISTS, and why a mocked test cannot replace it:
 *
 * `requirePermission` used to select the caller's role with `.limit(1)` and no
 * `orderBy`, filtered only on `userId` + `isActive`. A user holding more than
 * one active assignment therefore authorized against whichever row Postgres
 * happened to return — the same request could be allowed or denied on
 * consecutive calls. Eleven real users hold multiple active assignments.
 *
 * That also created a privilege-escalation primitive: creating a workspace
 * self-assigns `workspace-manager` (workspace/controllers/create-workspace.ts)
 * WITHOUT deactivating the caller's existing assignments, so any authenticated
 * user could add a high-privilege row and wait to win the lottery.
 *
 * The guard now intersects: it grants only if EVERY active assignment grants
 * the permission. Intersection is order-independent, which is the property
 * these tests pin.
 *
 * The shared mock in `tests/helpers/test-database.ts` sets
 * `chain.where = vi.fn().mockReturnValue(chain)` — it accepts predicates and
 * throws them away, and it does not order rows at all. So a mocked test can
 * detect neither a dropped `.where()` nor a missing `.orderBy()`, which is
 * precisely what this behaviour is made of. Hence a real database.
 *
 * Skips cleanly when no database is provisioned, matching the other
 * DB-integration suites in this repo.
 */

import { Hono } from "hono";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../../database/connection";
import {
  roleAssignmentTable,
  userTable,
  workspaceTable,
} from "../../database/schema";
import type { PermissionAction } from "../../types/rbac";
import { requirePermission } from "../rbac";

const FIXTURE_EMAIL = "require-permission-int-fixture@example.invalid";
const FIXTURE_WORKSPACE_NAME = "require-permission-int-fixture";

let db: ReturnType<typeof getDatabase>;
let userId = "";
let workspaceA = "";
let workspaceB = "";

/**
 * `tests/setup.ts` pins DATABASE_URL to a dedicated `meridian_test` database
 * that is not provisioned in most environments, so every DB suite here skips
 * by default — which would make this file advertise coverage it never
 * provides, the exact failure it exists to prevent. So: try the dedicated test
 * database first, then fall back to the environment's real DATABASE_URL.
 *
 * Every row this suite touches is one it created, keyed by a fixture email and
 * workspace name that cannot collide with real data, and it cleans up after
 * each test — so running against a development database is safe.
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
  const fallback = config({ path: "./.env" }).parsed?.DATABASE_URL;
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
 * Inserts one active role assignment. `assignedAt` is explicit so each test
 * controls the ordering the middleware sees — the whole point being that the
 * outcome must not depend on it.
 */
async function assign(role: string, wsId: string, assignedAt: Date) {
  await db.insert(roleAssignmentTable).values({
    userId,
    role,
    workspaceId: wsId,
    isActive: true,
    assignedAt,
  });
}

/**
 * Drives the real middleware through a real Hono request. `userEmail` is
 * injected the way the auth middleware would, so `requirePermission` runs
 * exactly as it does in production.
 */
async function callGuarded(
  permission: PermissionAction = "canManageRoles",
  scope: "every" | "any" = "every",
): Promise<number> {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userEmail", FIXTURE_EMAIL);
    await next();
  });
  app.get("/guarded", requirePermission(permission, { scope }), (c) =>
    c.json({ ok: true }),
  );

  const res = await app.request("/guarded");
  return res.status;
}

describe.skipIf(!dbAvailable)("requirePermission (integration)", () => {
  beforeAll(async () => {
    db = getDatabase();

    // DEMO_MODE + the admin email short-circuit the guard entirely. The
    // fixture is not the admin, but pin the mode off so a developer's .env
    // cannot turn these assertions into vacuous passes.
    process.env.DEMO_MODE = "false";

    await db.delete(userTable).where(eq(userTable.email, FIXTURE_EMAIL));
    const [user] = await db
      .insert(userTable)
      .values({
        email: FIXTURE_EMAIL,
        name: "requirePermission fixture",
        password: "not-a-real-hash",
      })
      .returning();
    if (!user) throw new Error("fixture user insert returned no row");
    userId = user.id;

    const [a] = await db
      .insert(workspaceTable)
      .values({ name: FIXTURE_WORKSPACE_NAME, ownerId: userId })
      .returning();
    const [b] = await db
      .insert(workspaceTable)
      .values({ name: FIXTURE_WORKSPACE_NAME, ownerId: userId })
      .returning();
    if (!a || !b) throw new Error("fixture workspace insert returned no row");
    workspaceA = a.id;
    workspaceB = b.id;
  });

  afterEach(async () => {
    await db
      .delete(roleAssignmentTable)
      .where(eq(roleAssignmentTable.userId, userId));
  });

  // Baseline: the ordinary single-assignment case must be untouched. If this
  // fails, the change broke every normal user.
  it("grants when the caller's only assignment holds the permission", async () => {
    await assign("workspace-manager", workspaceA, new Date("2020-01-01"));

    await expect(callGuarded()).resolves.toBe(200);
  });

  it("denies when the caller's only assignment lacks the permission", async () => {
    await assign("guest", workspaceA, new Date("2020-01-01"));

    await expect(callGuarded()).resolves.toBe(403);
  });

  // The shape of all 11 real multi-assignment users today: the same role, once
  // per workspace they created. They must keep working.
  it("grants when every one of several assignments holds the permission", async () => {
    await assign("workspace-manager", workspaceA, new Date("2020-01-01"));
    await assign("workspace-manager", workspaceB, new Date("2021-01-01"));

    await expect(callGuarded()).resolves.toBe(200);
  });

  // THE escalation case. `guest` lacks canManageRoles; `workspace-manager`
  // holds it. Under the old `.limit(1)` lottery this was a coin flip.
  //
  // Both orderings are asserted because order-independence IS the fix: the
  // high-privilege row is inserted older in one test and newer in the other,
  // and neither may grant.
  it("denies a mixed set when the high-privilege assignment is the NEWER row", async () => {
    await assign("guest", workspaceA, new Date("2020-01-01"));
    await assign("workspace-manager", workspaceB, new Date("2021-01-01"));

    await expect(callGuarded()).resolves.toBe(403);
  });

  it("denies a mixed set when the high-privilege assignment is the OLDER row", async () => {
    await assign("workspace-manager", workspaceB, new Date("2020-01-01"));
    await assign("guest", workspaceA, new Date("2021-01-01"));

    await expect(callGuarded()).resolves.toBe(403);
  });

  // Identical timestamps remove the only tiebreak the ordering has, which is
  // the case most likely to expose a residual dependence on row order.
  it("denies a mixed set deterministically across repeated identical calls", async () => {
    const sameInstant = new Date("2020-01-01");
    await assign("guest", workspaceA, sameInstant);
    await assign("workspace-manager", workspaceB, sameInstant);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => callGuarded()),
    );

    expect(results).toEqual(Array(8).fill(403));
  });

  // Pins `eq(roleAssignmentTable.isActive, true)`. A revoked high-privilege
  // assignment must not count toward the intersection — nor resurrect access.
  it("ignores inactive assignments", async () => {
    await assign("guest", workspaceA, new Date("2020-01-01"));
    await db.insert(roleAssignmentTable).values({
      userId,
      role: "workspace-manager",
      workspaceId: workspaceB,
      isActive: false,
      assignedAt: new Date("2021-01-01"),
    });

    await expect(callGuarded()).resolves.toBe(403);
  });

  // A caller with no active assignment is a guest, exactly as before the change.
  it("treats a caller with no active assignment as a guest", async () => {
    await expect(callGuarded()).resolves.toBe(403);
    await expect(callGuarded("canViewPublicProjects")).resolves.toBe(200);
  });

  describe('scope: "any" (routes that re-check with a scoped permission)', () => {
    // THE REGRESSION that intersection-everywhere caused, and the reason
    // scope: "any" exists. Alice owns workspace B — creating it self-assigned
    // her workspace-manager — and workspace A's admin later assigns her
    // `member` there. Under `every` she loses canManageRoles entirely and is
    // locked out of role management in her OWN workspace, because the coarse
    // gate on /api/rbac/assign runs before the scoped check that would have
    // allowed her.
    it("admits an owner who also holds a lower role in another workspace", async () => {
      await assign("workspace-manager", workspaceB, new Date("2020-01-01"));
      await assign("member", workspaceA, new Date("2021-01-01"));

      expect(await callGuarded("canManageRoles", "every")).toBe(403);
      expect(await callGuarded("canManageRoles", "any")).toBe(200);
    });

    // `any` must still deny someone who holds the permission NOWHERE —
    // otherwise the pre-filter would admit every authenticated caller.
    it("still denies a caller holding the permission in no workspace", async () => {
      await assign("guest", workspaceA, new Date("2020-01-01"));
      await assign("member", workspaceB, new Date("2021-01-01"));

      await expect(callGuarded("canManageRoles", "any")).resolves.toBe(403);
    });

    // Union is order-independent too, so `any` is deterministic as well.
    it("is order-independent", async () => {
      const sameInstant = new Date("2020-01-01");
      await assign("member", workspaceA, sameInstant);
      await assign("workspace-manager", workspaceB, sameInstant);

      const results = await Promise.all(
        Array.from({ length: 8 }, () => callGuarded("canManageRoles", "any")),
      );

      expect(results).toEqual(Array(8).fill(200));
    });
  });
});

// Workspaces and the user are created once in beforeAll and shared by every
// test, so they are torn down once at the end — never per test, which would
// pull the workspaces out from under the assignments' foreign key. Deleting
// the user cascades to both.
afterAll(async () => {
  if (!dbAvailable || !userId) return;
  await db
    .delete(workspaceTable)
    .where(
      and(
        eq(workspaceTable.ownerId, userId),
        eq(workspaceTable.name, FIXTURE_WORKSPACE_NAME),
      ),
    );
  await db.delete(userTable).where(eq(userTable.email, FIXTURE_EMAIL));
});
