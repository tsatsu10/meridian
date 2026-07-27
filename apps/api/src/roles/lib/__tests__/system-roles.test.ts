import { describe, expect, it } from "vitest";
import { SYSTEM_ROLE_IDS, isSystemRoleId } from "../system-roles";

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
