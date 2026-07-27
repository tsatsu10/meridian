import { describe, expect, it } from "vitest";
import { assignRoleSchema } from "../index";

/**
 * Regression: `role` was a z.enum of the 11 built-in slugs, so a custom role
 * id could never be assigned, which left the custom-role resolution path
 * unreachable in production.
 */
describe("assignRoleSchema", () => {
  it("accepts a built-in role slug", () => {
    const result = assignRoleSchema.safeParse({
      userId: "user-1",
      role: "workspace-manager",
      workspaceId: "ws-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a custom role id", () => {
    const result = assignRoleSchema.safeParse({
      userId: "user-1",
      role: "hbtbd8gzkhu8skpwy4229nsh",
      workspaceId: "ws-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty role", () => {
    const result = assignRoleSchema.safeParse({
      userId: "user-1",
      role: "",
      workspaceId: "ws-1",
    });
    expect(result.success).toBe(false);
  });

  // Critical 2 (Task 12 fix round): workspaceId used to be optional, which
  // let the cross-workspace check on a custom role silently no-op and let
  // the deactivate-existing UPDATE wipe the user's assignment in every
  // workspace they held one in. Assignments are workspace-scoped throughout
  // the resolution path now, so omitting it has no coherent meaning.
  it("rejects a missing workspaceId", () => {
    const result = assignRoleSchema.safeParse({
      userId: "user-1",
      role: "workspace-manager",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty workspaceId", () => {
    const result = assignRoleSchema.safeParse({
      userId: "user-1",
      role: "workspace-manager",
      workspaceId: "",
    });
    expect(result.success).toBe(false);
  });
});
