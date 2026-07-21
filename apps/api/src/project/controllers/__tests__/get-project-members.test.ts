/**
 * getProjectMembers() always returned an empty array — a stale TODO
 * claimed "projectMemberTable doesn't exist in schema yet", but it does
 * (apps/api/src/database/schema.ts:255/1597) and addProjectMember() already
 * writes real rows into it. GET /:projectId/members silently hid every
 * member POST /:projectId/members had successfully added.
 */

import { describe, it, expect, vi } from "vitest";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([
    {
      id: "member-1",
      projectId: "project-1",
      userEmail: "member@example.com",
      role: "member",
      permissions: [],
      assignedAt: new Date("2026-01-01"),
      assignedBy: "assigner-id",
      hoursPerWeek: 40,
      isActive: true,
      notificationSettings: { taskAssigned: true },
      userName: "Member Name",
      userCreatedAt: new Date("2025-01-01"),
    },
  ]),
};

vi.mock("../../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

describe("getProjectMembers", () => {
  it("returns the project's real members instead of an empty array", async () => {
    const { default: getProjectMembers } = await import(
      "../get-project-members"
    );

    const members = await getProjectMembers("project-1");

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      userEmail: "member@example.com",
      role: "member",
      userName: "Member Name",
    });
  });
});
