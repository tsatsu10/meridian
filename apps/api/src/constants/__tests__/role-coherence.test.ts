/**
 * Invariants the role matrix must satisfy to describe a coherent authority
 * level. These are not style rules — every one of them was violated, and each
 * violation was reproduced live against the running API.
 *
 * Measured before the fix, as guest@meridian.app with its assignment
 * temporarily set to each role in its own workspace:
 *
 *   role              GET workspace   GET task   project analytics
 *   member                 403          200            403
 *   team-lead              403          403            403
 *   project-manager        403          403            403
 *   department-head        200          403            403
 *   workspace-viewer       200          200            403
 *
 * So a project manager could create, update, delete and assign a task it was
 * forbidden to open, and could not load the workspace its projects live in.
 */

import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "../rbac";

type Role = keyof typeof ROLE_PERMISSIONS;
const ROLES = Object.keys(ROLE_PERMISSIONS) as Role[];

const holds = (role: Role, permission: string) =>
  (ROLE_PERMISSIONS[role] as Record<string, boolean>)[permission] === true;

/**
 * Modifying a resource you cannot read is not a coherent authority level: the
 * UI cannot render the thing being edited, and the role's own view route
 * refuses it.
 */
const RESOURCES: { name: string; view: string; modify: string[] }[] = [
  {
    name: "tasks",
    view: "canViewTasks",
    modify: [
      "canCreateTasks",
      "canUpdateTasks",
      "canDeleteTasks",
      "canAssignTasks",
      "canCreateSubtasks",
      "canEditSubtasks",
      "canDeleteSubtasks",
      "canAssignSubtasks",
      "canManageSubtaskHierarchy",
    ],
  },
  {
    name: "projects",
    view: "canViewProjects",
    modify: [
      "canCreateProjects",
      "canUpdateProjects",
      "canDeleteProjects",
      "canArchiveProjects",
      "canCloneProjects",
      "canManageProjectSettings",
      "canManageProjectTeam",
      "canManageProjectBudget",
      "canManageProjectMembers",
    ],
  },
  {
    name: "the workspace",
    view: "canViewWorkspace",
    modify: [
      "canManageWorkspace",
      "canManageWorkspaceSettings",
      "canDeleteWorkspace",
      "canInviteUsers",
      "canManageRoles",
    ],
  },
  {
    name: "milestones",
    view: "canViewProjectMilestones",
    modify: ["canManageProjectMilestones"],
  },
  {
    name: "teams",
    view: "canViewTeam",
    modify: ["canManageTeamMembers", "canCreateTeams"],
  },
];

describe("role matrix coherence", () => {
  describe.each(RESOURCES)("$name", ({ view, modify }) => {
    it.each(ROLES)(
      `%s: if it can modify, it must hold ${view}`,
      (role: Role) => {
        const modifiers = modify.filter((permission) =>
          holds(role, permission),
        );
        if (modifiers.length === 0) return;

        expect(
          holds(role, view),
          `${role} holds ${modifiers.join(", ")} but not ${view} — it can change what it cannot read`,
        ).toBe(true);
      },
    );
  });

  // Projects are reached through a workspace: the dashboard loads
  // GET /api/workspaces/:id before it can show anything inside. A role that
  // can see projects but not the workspace is locked out of the app itself.
  it.each(ROLES)(
    "%s: if it can view projects, it can view the workspace they live in",
    (role: Role) => {
      if (!holds(role, "canViewProjects")) return;

      expect(
        holds(role, "canViewWorkspace"),
        `${role} can view projects but GET /api/workspaces/:id would 403 — verified live before this was fixed`,
      ).toBe(true);
    },
  );

  // workspace-manager is the owner role: it must be able to do anything any
  // other role can. It used to fall three permissions short —
  // canManageDepartment (department-head only) and canViewAssignedTasks /
  // canUpdateAssignedTasks (contractor only) — so a workspace owner could not
  // do things a contractor could, while the matrix comment claimed
  // "ALL permissions".
  //
  // This is also what lets roles/lib/role-ceiling.ts reason about assignment:
  // the only role holding canManageRoles can now hand out any built-in role
  // without a subset check rejecting it.
  it("workspace-manager holds every permission any other role holds", () => {
    const missing = ROLES.filter((role) => role !== "workspace-manager")
      .flatMap((role) =>
        Object.keys(ROLE_PERMISSIONS[role] as Record<string, boolean>)
          .filter((permission) => holds(role, permission))
          .map((permission) => ({ role, permission })),
      )
      .filter(({ permission }) => !holds("workspace-manager", permission))
      .map(({ role, permission }) => `${permission} (held by ${role})`);

    expect(
      [...new Set(missing)],
      `workspace-manager is missing: ${[...new Set(missing)].join(", ")}`,
    ).toEqual([]);
  });

  // A guard nobody can satisfy is a permanently dead feature. This catches a
  // permission being renamed in the matrix but not at its call site.
  it("every load-bearing permission is held by at least one role", () => {
    const orphans = [
      ...new Set(
        ROLES.flatMap((role) =>
          Object.keys(ROLE_PERMISSIONS[role] as Record<string, boolean>),
        ),
      ),
    ].filter((permission) => !ROLES.some((role) => holds(role, permission)));

    expect(orphans, `no role holds: ${orphans.join(", ")}`).toEqual([]);
  });
});
