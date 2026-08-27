import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockDb,
  resetMockDb,
} from "../../../tests/helpers/test-database";

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

    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(inserted.action).toBe("role_created");
    expect(inserted.roleId).toBe("role-1");
    expect(inserted.changedBy).toBe("user-1");
    expect(inserted.newValue).toEqual({ name: "Auditor" });
  });
});
