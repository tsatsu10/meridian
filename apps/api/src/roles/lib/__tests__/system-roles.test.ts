import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockDb,
  resetMockDb,
} from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../../../utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockDb = createMockDb();

import {
  SYSTEM_ROLE_IDS,
  isSystemRoleId,
  seedSystemRoles,
} from "../system-roles";

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

describe("seedSystemRoles", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
  });

  it("inserts exactly one row per built-in role", async () => {
    await seedSystemRoles();

    expect(mockDb.values.mock.calls).toHaveLength(SYSTEM_ROLE_IDS.length);
    expect(mockDb.values.mock.calls).toHaveLength(11);
  });

  // Pins the load-bearing invariant: role_assignment.role already stores
  // these exact slugs for 48 live rows. If a future edit ever drops the
  // explicit `id` here and lets the roles table's cuid default win instead,
  // every one of those existing assignments silently orphans (their
  // role_assignment.role no longer matches any roles.id) and nothing fails
  // loudly to catch it.
  it("inserts each row with its slug as the explicit id", async () => {
    await seedSystemRoles();

    const insertedIds = mockDb.values.mock.calls.map(
      (call) => (call[0] as { id: string }).id,
    );

    expect(insertedIds.sort()).toEqual([...SYSTEM_ROLE_IDS].sort());
    for (const id of insertedIds) {
      expect(SYSTEM_ROLE_IDS).toContain(id);
    }
  });

  it("inserts every row with null permissions and type 'system'", async () => {
    await seedSystemRoles();

    for (const call of mockDb.values.mock.calls) {
      const row = call[0] as { permissions: unknown; type: string };
      expect(row.permissions).toBeNull();
      expect(row.type).toBe("system");
    }
  });
});
