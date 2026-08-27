/**
 * Three RBAC read routes joined `userTable` and projected it WHOLE:
 *
 *   GET /assignments      .select({ assignment: roleAssignmentTable, user: userTable })
 *   GET /history/:userId  .select({ history: roleHistoryTable, changedByUser: userTable })
 *   GET /departments      .select({ department: departmentTable, headUser: userTable })
 *
 * Handing drizzle a table object as a projection selects EVERY column on it.
 * `users` carries `password` (an argon2 hash), `twoFactorSecret` and
 * `twoFactorBackupCodes` (see database/schema.ts), so all three responses
 * shipped credentials and 2FA material for every joined user. This repo
 * already treated the identical bug on GET /api/users/me as critical.
 *
 * Each is now an explicit column list. The assertions below inspect the
 * projection object the route hands to `db.select()` rather than the response
 * body, because the shared mock db returns whatever rows a test sets — the
 * projection is the thing that actually decides what leaves the database, and
 * it is what regressed.
 *
 * NOTE: this file deliberately does NOT assert anything about authorization
 * on these routes. That scoping now exists (rbac/lib/workspace-scope.ts) and
 * is covered by lib/__tests__/workspace-scope.integration.test.ts against a
 * real database; the fix under test HERE is only the credential projection.
 *
 * The scoping module is stubbed below so each route runs past its tenant
 * filter and reaches the projection. Without the stub the helpers return an
 * empty list from the mock db, every route short-circuits to an empty
 * response, and these assertions would silently test nothing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";
import { userTable } from "../../database/schema";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../services/rbac/role-audit-service", () => ({
  RoleAuditService: {
    getUserAuditTrail: vi.fn(),
    getWorkspaceAuditTrail: vi.fn(),
    getAuditStats: vi.fn(),
  },
}));

vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (_c: Context, next: Next) => {
    await next();
  },
  checkWorkspacePermission: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("../../roles/lib/resolve-role-permissions", () => ({
  resolveRolePermissions: vi.fn(async () => ({})),
  invalidateRoleCache: vi.fn(),
}));

// Stubbed so the routes get past their tenant filter — see the header note.
vi.mock("../lib/workspace-scope", () => ({
  memberWorkspaceIds: vi.fn(async () => ["ws-1"]),
  workspaceIdsGranting: vi.fn(async () => ["ws-1"]),
  userIdForEmail: vi.fn(async () => "caller-1"),
  visibleWorkspaceIdsOrNone: (visible: string[]) => visible,
}));

const mockDb = createMockDb();

/** Columns that must never leave the database on any of these routes. */
const FORBIDDEN = ["password", "twoFactorSecret", "twoFactorBackupCodes"];

function buildApp() {
  return import("../index").then(({ default: rbacRoutes }) => {
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "caller@example.com");
      await next();
    });
    app.route("/", rbacRoutes);
    return app;
  });
}

/**
 * The projection handed to the db.select() that actually joins the user table
 * — located by the key the route projects it under, NOT by call index. A
 * request now issues several selects (tenant scoping runs first), and indexing
 * into the first one silently inspected the wrong query.
 */
function projectionContaining(key: string): Record<string, unknown> {
  const calls = (mockDb.select as unknown as { mock: { calls: unknown[][] } })
    .mock.calls;
  const match = calls
    .map((call) => call[0] as Record<string, unknown> | undefined)
    .find((projection) => projection && key in projection);

  if (!match) {
    throw new Error(
      `no db.select() projected a "${key}" key — the route did not reach its user join (${calls.length} select call(s) made)`,
    );
  }
  return match;
}

describe("RBAC read routes must not project user credentials", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.__setSelectResults([]);
  });

  // Discriminating control: proves the assertions below can actually fail.
  // Projecting the table object — exactly what the three routes used to do —
  // does expose the forbidden column names, so a regression is detectable by
  // this method rather than silently passing.
  it("control: projecting userTable wholesale exposes password and 2FA columns", () => {
    const keys = Object.keys(userTable);
    for (const column of FORBIDDEN) {
      expect(keys).toContain(column);
    }
  });

  it.each([
    ["GET /assignments", "/assignments", "user"],
    ["GET /history/:userId", "/history/user-1", "changedByUser"],
    ["GET /departments", "/departments", "headUser"],
  ])("%s projects only safe user columns", async (_label, path, key) => {
    const app = await buildApp();
    const res = await app.request(path);

    expect(res.status).toBe(200);

    const projected = projectionContaining(key)[key] as Record<string, unknown>;
    const columns = Object.keys(projected);

    expect(columns.sort()).toEqual(["avatar", "email", "id", "name"]);
    for (const forbidden of FORBIDDEN) {
      expect(columns).not.toContain(forbidden);
    }
  });
});
