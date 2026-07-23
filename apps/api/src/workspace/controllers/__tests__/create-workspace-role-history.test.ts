/**
 * createWorkspace assigns the creator a workspace-manager role but never
 * recorded it in role_history — the TODO claimed "roleHistoryTable doesn't
 * exist in schema yet", which is stale: the table has existed since at
 * least the RBAC module (apps/api/src/rbac/index.ts inserts into it on
 * every /assign call). This left workspace-creation role grants invisible
 * to the audit trail that every other role assignment produces.
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
    .mockResolvedValue([{ id: "workspace-1", name: "New Workspace" }]),
};

vi.mock("../../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../../events", () => ({
  publishEvent: vi.fn(),
}));

vi.mock("../../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("createWorkspace records the owner's role grant in role history", () => {
  it("inserts into roleHistoryTable for the workspace creator", async () => {
    const { default: createWorkspace } = await import("../create-workspace");

    await createWorkspace("New Workspace", "owner@example.com");

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
