/**
 * Query-shape guards for requirePermission's assignment lookup.
 *
 * The behavioural coverage for this lives in
 * require-permission-determinism.integration.test.ts, which exercises the real
 * escalation against a real Postgres. But that suite needs a provisioned
 * `meridian_test` database and skips without one — all 11 of its tests skip in
 * CI and in a default local checkout. So the fix it pins has, in practice, no
 * always-on protection.
 *
 * These tests do run everywhere. They assert the two properties of the query
 * that the escalation fix depends on:
 *
 *   1. `eq(roleAssignmentTable.isActive, true)` — without it, revoked
 *      assignments are read back and a removed role keeps granting.
 *
 *   2. An ORDER BY on the lookup. requirePermission used to select the
 *      caller's role with `.limit(1)` and no ordering, so Postgres returned
 *      whichever row was physically first in the heap; any UPDATE to the older
 *      row flipped the answer (guest -> workspace-manager, demonstrated).
 *      Deterministic ordering is what makes the decision reproducible.
 *
 * The mock returns its canned rows whatever the query asks for, so neither
 * property is observable from the middleware's response — only from the query
 * itself. That is what __selectCalls is for.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import {
  createMockDb,
  resetMockDb,
  whereColumns,
} from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../../roles/lib/resolve-role-permissions", () => ({
  resolveRolePermissions: vi.fn(async () => ({ canViewTasks: true })),
}));

vi.mock("./../custom-permission-override", () => ({
  applyCustomPermissionOverride: vi.fn(
    async (_email: string, _permission: string, allowed: boolean) => allowed,
  ),
}));

const mockDb = createMockDb();

async function callMiddleware() {
  const { requirePermission } = await import("../rbac");

  const app = new Hono<{ Variables: { userEmail: string } }>();
  app.use("*", async (c, next) => {
    c.set("userEmail", "actor@example.com");
    await next();
  });
  app.get("/probe", requirePermission("canViewTasks"), (c) =>
    c.json({ ok: true }),
  );

  return app.request("/probe");
}

describe("requirePermission assignment lookup", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DEMO_MODE = "false";
  });

  it("filters the assignment lookup on the caller and on isActive", async () => {
    mockDb.__setSelectResults(
      [{ id: "user-1", email: "actor@example.com" }], // user lookup
      [{ role: "member", workspaceId: "ws-1", isActive: true }], // assignments
    );

    await callMiddleware();

    // Second select() is the assignment lookup; the first resolves the user.
    const [where] = mockDb.__selectCalls[1].where;
    expect(whereColumns(where)).toEqual(
      expect.arrayContaining(["user_id", "is_active"]),
    );
  });

  it("orders the assignment lookup so the decision is reproducible", async () => {
    mockDb.__setSelectResults(
      [{ id: "user-1", email: "actor@example.com" }],
      [{ role: "member", workspaceId: "ws-1", isActive: true }],
    );

    await callMiddleware();

    // Without an ORDER BY the row Postgres returns is a physical-layout
    // accident, which is the escalation this replaced.
    expect(mockDb.__selectCalls[1].orderBy.length).toBeGreaterThan(0);
  });

  it("does not bound the lookup to a single row", async () => {
    mockDb.__setSelectResults(
      [{ id: "user-1", email: "actor@example.com" }],
      [{ role: "member", workspaceId: "ws-1", isActive: true }],
    );

    await callMiddleware();

    // The fix reads *every* active assignment and intersects them. A
    // reintroduced `.limit(1)` would restore the "pick one arbitrary
    // assignment" behaviour even with the ordering in place.
    expect(mockDb.__selectCalls[1].limit).toEqual([]);
  });
});
