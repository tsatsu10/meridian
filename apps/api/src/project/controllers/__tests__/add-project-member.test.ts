/**
 * addProjectMember stored notificationSettings via JSON.stringify(...)
 * before inserting into a jsonb column. jsonb columns take a plain JS
 * value directly (drizzle handles the JSON encoding) — stringifying first
 * double-encodes it, so a later read returns a raw string instead of the
 * parsed object every consumer (e.g. getProjectMembers) expects.
 */

import { describe, it, expect, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { projectMemberTable } from "../../../database/schema";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "member-1" }]),
};

vi.mock("../../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

describe("addProjectMember", () => {
  it("stores notificationSettings as a plain object, not a JSON string", async () => {
    mockDb.where
      .mockResolvedValueOnce([{ id: "project-1" }]) // project lookup
      .mockResolvedValueOnce([{ id: "user-1" }]) // user lookup
      .mockResolvedValueOnce([]); // no existing membership

    const { default: addProjectMember } = await import("../add-project-member");

    await addProjectMember({
      projectId: "project-1",
      userEmail: "member@example.com",
      notificationSettings: { taskAssigned: true },
    });

    const insertedValues = mockDb.values.mock.calls[0]?.[0];
    expect(insertedValues.notificationSettings).toEqual({
      taskAssigned: true,
    });
  });

  it("scopes the existing-membership check to BOTH projectId and userEmail", async () => {
    // `eq(a) && eq(b)` in JS discards the left operand (both are truthy
    // objects), so the query would only filter by userEmail — incorrectly
    // treating membership in ANY project as membership in THIS one.
    mockDb.where
      .mockResolvedValueOnce([{ id: "project-2" }])
      .mockResolvedValueOnce([{ id: "user-1" }])
      .mockResolvedValueOnce([]);

    const { default: addProjectMember } = await import("../add-project-member");

    await addProjectMember({
      projectId: "project-2",
      userEmail: "member@example.com",
    });

    const membershipCheckWhereArg = mockDb.where.mock.calls[2]?.[0];
    const expectedWhereArg = and(
      eq(projectMemberTable.projectId, "project-2"),
      eq(projectMemberTable.userEmail, "member@example.com"),
    );
    expect(membershipCheckWhereArg).toEqual(expectedWhereArg);
  });
});
