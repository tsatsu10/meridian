import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

const customRole = {
  id: "role-1",
  name: "Auditor",
  description: null,
  type: "custom" as const,
  color: "#3B82F6",
  usersCount: 0,
  lastUsedAt: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  workspaceId: "ws-1",
  permissions: ["canViewProjects"],
};

const systemRole = {
  id: "member",
  name: "Member",
  description: null,
  type: "system" as const,
  color: "#3B82F6",
  usersCount: 0,
  lastUsedAt: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  workspaceId: null,
  permissions: null,
};

describe("getRole cross-tenant scoping", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  // Pins a cross-tenant IDOR: without this check, any authenticated user
  // could read a custom role belonging to a workspace they are not a member
  // of just by knowing (or guessing) its id.
  it("throws 404 for a custom role whose workspaceId is not in memberWorkspaceIds", async () => {
    mockDb.__setSelectResults([customRole]);

    const { getRole } = await import("../controllers/get-role");

    await expect(getRole("role-1", ["ws-other"])).rejects.toMatchObject({
      status: 404,
    });
  });

  it("succeeds for a custom role whose workspaceId IS in memberWorkspaceIds", async () => {
    mockDb.__setSelectResults([customRole]);

    const { getRole } = await import("../controllers/get-role");

    const result = await getRole("role-1", ["ws-1"]);
    expect(result.id).toBe("role-1");
  });

  it("succeeds for a system role even when memberWorkspaceIds is empty", async () => {
    mockDb.__setSelectResults([systemRole]);

    const { getRole } = await import("../controllers/get-role");

    const result = await getRole("member", []);
    expect(result.id).toBe("member");
  });
});

describe("getRoleUsage cross-tenant scoping", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("throws 404 for an out-of-workspace custom role and does not return assignments", async () => {
    mockDb.__setSelectResults(
      // role lookup
      [{ id: "role-1", workspaceId: "ws-1" }],
      // assignments (should never be reached/used)
      [{ userId: "user-1", assignedAt: new Date("2026-02-01") }],
    );

    const { getRoleUsage } = await import("../controllers/get-role-usage");

    await expect(getRoleUsage("role-1", ["ws-other"])).rejects.toMatchObject({
      status: 404,
    });
  });
});
