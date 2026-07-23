/**
 * createRootWorkspaceUser assigns the creator a workspace-manager role but
 * never recorded it in role_history — same stale-TODO gap as
 * apps/api/src/workspace/controllers/create-workspace.ts (roleHistoryTable
 * has existed since at least the RBAC module's /assign endpoint).
 */

import { describe, it, expect, vi } from "vitest";
import { roleHistoryTable } from "../../../database/schema";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi
    .fn()
    .mockResolvedValue([{ id: "user-1", email: "owner@example.com" }]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi
    .fn()
    .mockResolvedValue([{ id: "wu-1", workspaceId: "workspace-1" }]),
};

vi.mock("../../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("createRootWorkspaceUser records the owner's role grant in role history", () => {
  it("inserts into roleHistoryTable for the workspace creator", async () => {
    const { default: createRootWorkspaceUser } = await import(
      "../create-root-workspace-user"
    );

    await createRootWorkspaceUser("workspace-1", "owner@example.com");

    const insertedRoleHistoryCalls = mockDb.insert.mock.calls.filter(
      (call) => call[0] === roleHistoryTable,
    );
    expect(insertedRoleHistoryCalls.length).toBe(1);

    const valuesCallIndex = mockDb.insert.mock.calls.findIndex(
      (call) => call[0] === roleHistoryTable,
    );
    const recordedValues = mockDb.values.mock.calls[valuesCallIndex]?.[0];
    expect(recordedValues).toMatchObject({
      userId: "user-1",
      role: "workspace-manager",
      workspaceId: "workspace-1",
      action: "assigned",
      performedBy: "user-1",
    });
  });
});
