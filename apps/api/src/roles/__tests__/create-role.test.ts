import { beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPException } from "hono/http-exception";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));
vi.mock("../lib/audit", () => ({ recordRoleAudit: vi.fn() }));

const mockDb = createMockDb();

describe("createRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([
      { id: "new-role", name: "Auditor", type: "custom" },
    ]);
  });

  it("creates a custom role when the permissions are a subset of the actor's", async () => {
    const { createRole } = await import("../controllers/create-role");

    const result = await createRole({
      name: "Auditor",
      description: "Read-only auditor",
      color: "#3B82F6",
      permissions: ["canViewTasks"],
      workspaceId: "ws-1",
      actorUserId: "user-1",
      actorPermissions: { canViewTasks: true, canCreateTasks: true },
    });

    expect(result.id).toBe("new-role");
    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(inserted.type).toBe("custom");
    expect(inserted.permissions).toEqual(["canViewTasks"]);
    expect(inserted.workspaceId).toBe("ws-1");
  });

  // The escalation guard.
  it("rejects permissions the actor does not hold, naming them", async () => {
    const { createRole } = await import("../controllers/create-role");

    await expect(
      createRole({
        name: "Superuser",
        description: null,
        color: "#3B82F6",
        permissions: ["canViewTasks", "canManageRoles"],
        workspaceId: "ws-1",
        actorUserId: "user-1",
        actorPermissions: { canViewTasks: true },
      }),
    ).rejects.toThrow(/canManageRoles/);
  });

  it("refuses to create a role without a workspace", async () => {
    const { createRole } = await import("../controllers/create-role");

    await expect(
      createRole({
        name: "Global",
        description: null,
        color: "#3B82F6",
        permissions: [],
        workspaceId: "",
        actorUserId: "user-1",
        actorPermissions: {},
      }),
    ).rejects.toBeInstanceOf(HTTPException);
  });

  // Pins the fail-closed ceiling: an actor with no resolved permissions for
  // the target workspace (e.g. no matching role assignment there) must not
  // be able to grant ANY permission. This is what makes scoping
  // actorContext's lookup to the target workspace safe — if the lookup ever
  // finds nothing, the ceiling must be empty, not "no restriction."
  it("rejects every requested permission when the actor's resolved permissions are empty", async () => {
    const { createRole } = await import("../controllers/create-role");

    await expect(
      createRole({
        name: "Anything",
        description: null,
        color: "#3B82F6",
        permissions: ["canViewTasks"],
        workspaceId: "ws-1",
        actorUserId: "user-1",
        actorPermissions: {},
      }),
    ).rejects.toThrow(/canViewTasks/);
  });
});
