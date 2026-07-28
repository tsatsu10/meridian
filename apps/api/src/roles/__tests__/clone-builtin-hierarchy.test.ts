/**
 * Cloning a built-in role — the clone-side half of the same ceiling split
 * covered for /assign in rbac/__tests__/assign-role-hierarchy-ceiling.test.ts.
 * See roles/lib/role-ceiling.ts for the reasoning.
 *
 * cloneRole's contract is "cloning a system role is allowed — the copy is
 * always a custom role, so this is how an admin starts from a built-in and
 * narrows it." The permission-subset ceiling in createRole silently broke
 * that for two of the eleven built-ins: `contractor` and `department-head`
 * each grant permissions that `workspace-manager` — the only role that can
 * reach a role-mutation route, since it alone grants canManageRoles — does
 * not hold. Cloning either one 403'd for every possible actor.
 *
 * The fix compares ROLE_HIERARCHY levels when the actor's role AND the clone
 * source are both built-in, and leaves the subset ceiling in place for every
 * other case. That distinction is what stops it from being an escalation:
 * a custom role can never take the hierarchy branch, so a custom role that
 * grants canManageRoles still cannot clone workspace-manager into a
 * workspace and then assign the copy.
 *
 * `baseRoleId` is safe to key that decision on because it is
 * server-controlled: POST /roles' zod schema has no such field, so only
 * cloneRole ever sets it, always to the id of a role the caller was already
 * allowed to READ (getRole enforces the tenant boundary first).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";
import { ROLE_PERMISSIONS } from "../../constants/rbac";
import { recordToPermissions } from "../lib/permission-set";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));
vi.mock("../lib/audit", () => ({ recordRoleAudit: vi.fn() }));

const mockDb = createMockDb();

const managerPermissions = ROLE_PERMISSIONS["workspace-manager"];

/** A stored `roles` row for a seeded built-in (permissions live in the constant). */
function systemRoleRow(id: string) {
  return {
    id,
    name: id,
    description: null,
    type: "system" as const,
    color: "#3B82F6",
    createdAt: new Date("2026-01-01"),
    isActive: true,
    workspaceId: null,
    permissions: null,
  };
}

describe("cloning a built-in role", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([
      { id: "new-role", name: "Copy", type: "custom" },
    ]);
  });

  // The bug, stated as a fact about the data rather than about the code:
  // these permissions exist on other built-ins and not on workspace-manager,
  // so a subset ceiling can never be satisfied for them.
  // Premise, updated: workspace-manager is now a TRUE SUPERSET of every other
  // built-in. It used to lack exactly canManageDepartment (department-head)
  // and canViewAssignedTasks / canUpdateAssignedTasks (contractor), which is
  // what made a pure subset ceiling reject those two roles for every possible
  // actor and left them permanently unclonable. That trap is gone; the
  // hierarchy branch below remains because ordering is still the right
  // yardstick for an ordered ladder.
  it("premise: workspace-manager grants everything the other built-ins do", () => {
    expect(managerPermissions.canManageDepartment).toBe(true);
    expect(managerPermissions.canViewAssignedTasks).toBe(true);
    expect(managerPermissions.canUpdateAssignedTasks).toBe(true);
  });

  it("lets a workspace-manager clone department-head", async () => {
    mockDb.__setSelectResults([systemRoleRow("department-head")]);

    const { cloneRole } = await import("../controllers/clone-role");
    await cloneRole("department-head", {
      workspaceId: "ws-dest",
      actorUserId: "user-1",
      actorRole: "workspace-manager",
      actorPermissions: managerPermissions,
      memberWorkspaceIds: ["ws-dest"],
    });

    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    // The copy is a custom role carrying department-head's real permission
    // list — including canManageDepartment, the permission the subset ceiling
    // used to reject.
    expect(inserted.type).toBe("custom");
    expect(inserted.baseRoleId).toBe("department-head");
    expect(inserted.permissions).toContain("canManageDepartment");
  });

  it("lets a workspace-manager clone contractor", async () => {
    mockDb.__setSelectResults([systemRoleRow("contractor")]);

    const { cloneRole } = await import("../controllers/clone-role");
    await cloneRole("contractor", {
      workspaceId: "ws-dest",
      actorUserId: "user-1",
      actorRole: "workspace-manager",
      actorPermissions: managerPermissions,
      memberWorkspaceIds: ["ws-dest"],
    });

    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(inserted.permissions).toEqual(
      expect.arrayContaining([
        "canViewAssignedTasks",
        "canUpdateAssignedTasks",
      ]),
    );
  });

  it("refuses to clone a built-in ABOVE the actor's own level", async () => {
    mockDb.__setSelectResults([systemRoleRow("workspace-manager")]);

    const { cloneRole } = await import("../controllers/clone-role");
    await expect(
      cloneRole("workspace-manager", {
        workspaceId: "ws-dest",
        actorUserId: "user-1",
        actorRole: "department-head", // level 6 < 10
        actorPermissions: ROLE_PERMISSIONS["department-head"],
        memberWorkspaceIds: ["ws-dest"],
      }),
    ).rejects.toThrow(/workspace-manager/);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  // THE regression test for this fix: the hierarchy branch requires the
  // ACTOR to be built-in too. A blanket "the source is a system role"
  // exemption would make this succeed and hand a custom role holder the full
  // workspace-manager permission set.
  it("does NOT let an actor holding a CUSTOM role clone workspace-manager", async () => {
    mockDb.__setSelectResults([systemRoleRow("workspace-manager")]);

    const { cloneRole } = await import("../controllers/clone-role");
    await expect(
      cloneRole("workspace-manager", {
        workspaceId: "ws-dest",
        actorUserId: "user-1",
        // A custom role id, not a built-in slug — it has no hierarchy level.
        actorRole: "custom-role-with-manage-roles",
        actorPermissions: { canManageRoles: true },
        memberWorkspaceIds: ["ws-dest"],
      }),
    ).rejects.toThrow(/cannot grant permissions you do not hold/);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  // Cloning a CUSTOM source keeps the subset ceiling regardless of who the
  // actor is — a custom role's permission list is chosen by whoever made it,
  // so there is no ladder to measure it against.
  it("keeps the subset ceiling when the SOURCE is a custom role", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-1",
        name: "Power role",
        description: null,
        type: "custom" as const,
        color: "#3B82F6",
        createdAt: new Date("2026-01-01"),
        isActive: true,
        workspaceId: "ws-source",
        permissions: ["canManageRoles", "canDeleteWorkspace"],
      },
    ]);

    const { cloneRole } = await import("../controllers/clone-role");
    await expect(
      cloneRole("role-1", {
        workspaceId: "ws-dest",
        actorUserId: "user-1",
        actorRole: "workspace-manager",
        actorPermissions: { canManageRoles: true },
        memberWorkspaceIds: ["ws-source", "ws-dest"],
      }),
    ).rejects.toThrow(/canDeleteWorkspace/);
  });
});

describe("createRole without a clone source", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([
      { id: "new-role", name: "Auditor", type: "custom" },
    ]);
  });

  // A hand-authored permission list has no baseRoleId, so it can never reach
  // the hierarchy branch no matter what the actor's role is. Without this,
  // being a workspace-manager would be a blank cheque to mint any permission
  // string at all.
  //
  // The probe is a permission the actor genuinely does not hold. It used to be
  // `canManageDepartment`, but workspace-manager is now a true superset of the
  // built-ins, so no real permission key can exceed it — an invented key is
  // what still tests the ceiling rather than the matrix. This matters: role
  // permissions are stored as free-form strings, so a made-up one must not be
  // mintable and then silently satisfied by some future guard.
  it("applies the subset ceiling to a hand-authored role even for a workspace-manager", async () => {
    const { createRole } = await import("../controllers/create-role");

    await expect(
      createRole({
        name: "Superuser",
        description: null,
        color: "#3B82F6",
        permissions: ["canDoAbsolutelyAnything"],
        workspaceId: "ws-1",
        actorUserId: "user-1",
        actorRole: "workspace-manager",
        actorPermissions: managerPermissions,
      }),
    ).rejects.toThrow(/canDoAbsolutelyAnything/);
  });

  it("still creates a hand-authored role within the actor's permissions", async () => {
    const { createRole } = await import("../controllers/create-role");

    const result = await createRole({
      name: "Auditor",
      description: null,
      color: "#3B82F6",
      permissions: recordToPermissions(managerPermissions).slice(0, 3),
      workspaceId: "ws-1",
      actorUserId: "user-1",
      actorRole: "workspace-manager",
      actorPermissions: managerPermissions,
    });

    expect(result.id).toBe("new-role");
  });
});
