import { describe, expect, it } from "vitest";
import { groupPermissions } from "../permission-groups";

describe("groupPermissions", () => {
  // There are 157 permission keys; a flat checkbox list is unusable.
  it("groups by verb prefix", () => {
    const result = groupPermissions([
      "canViewTasks",
      "canViewProjects",
      "canManageRoles",
      "canCreateTasks",
    ]);

    expect(result).toEqual([
      { group: "Create", permissions: ["canCreateTasks"] },
      { group: "Manage", permissions: ["canManageRoles"] },
      { group: "View", permissions: ["canViewProjects", "canViewTasks"] },
    ]);
  });

  it("puts unrecognised shapes in Other", () => {
    expect(groupPermissions(["somethingElse"])).toEqual([
      { group: "Other", permissions: ["somethingElse"] },
    ]);
  });

  it("returns an empty array for no permissions", () => {
    expect(groupPermissions([])).toEqual([]);
  });
});
