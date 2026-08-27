import { describe, expect, it } from "vitest";
import {
  findExcessPermissions,
  permissionsToRecord,
  recordToPermissions,
} from "../permission-set";

describe("permissionsToRecord", () => {
  it("maps a granted list into the Record shape requirePermission expects", () => {
    expect(permissionsToRecord(["canViewTasks", "canCreateTasks"])).toEqual({
      canViewTasks: true,
      canCreateTasks: true,
    });
  });

  it("returns an empty record for an empty list", () => {
    expect(permissionsToRecord([])).toEqual({});
  });
});

describe("recordToPermissions", () => {
  it("keeps only granted keys", () => {
    expect(
      recordToPermissions({ canViewTasks: true, canDeleteTasks: false }),
    ).toEqual(["canViewTasks"]);
  });
});

// The escalation guard. A user must never be able to mint a role holding a
// permission they do not themselves hold.
describe("findExcessPermissions", () => {
  const actor = { canViewTasks: true, canCreateTasks: true };

  it("allows a strict subset", () => {
    expect(findExcessPermissions(["canViewTasks"], actor)).toEqual([]);
  });

  it("allows an equal set", () => {
    expect(
      findExcessPermissions(["canViewTasks", "canCreateTasks"], actor),
    ).toEqual([]);
  });

  it("reports permissions the actor does not hold", () => {
    expect(
      findExcessPermissions(["canViewTasks", "canManageRoles"], actor),
    ).toEqual(["canManageRoles"]);
  });

  it("treats an explicitly false actor permission as not held", () => {
    expect(
      findExcessPermissions(["canDeleteTasks"], { canDeleteTasks: false }),
    ).toEqual(["canDeleteTasks"]);
  });

  it("reports every offending key, not just the first", () => {
    expect(
      findExcessPermissions(["canManageRoles", "canAccessAuditLogs"], actor),
    ).toEqual(["canManageRoles", "canAccessAuditLogs"]);
  });

  it("treats truthy-but-not-true values as not held (number)", () => {
    // Cast simulates untrusted runtime data reaching the guard. The guard must
    // require the exact value `true`, not just any truthy value, to prevent
    // a future refactoring to falsy-based checks from becoming an escalation
    // vector if the permission storage layer ever returns non-boolean truthy values.
    const actorWithNumberPermission = {
      canDeleteTasks: 1,
    } as unknown as Record<string, boolean>;
    expect(
      findExcessPermissions(["canDeleteTasks"], actorWithNumberPermission),
    ).toEqual(["canDeleteTasks"]);
  });

  it("treats truthy-but-not-true values as not held (string)", () => {
    // Cast simulates untrusted runtime data reaching the guard. Same defensive
    // guarantee as the number case: only exact `true` counts.
    const actorWithStringPermission = {
      canDeleteTasks: "yes",
    } as unknown as Record<string, boolean>;
    expect(
      findExcessPermissions(["canDeleteTasks"], actorWithStringPermission),
    ).toEqual(["canDeleteTasks"]);
  });
});
