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
