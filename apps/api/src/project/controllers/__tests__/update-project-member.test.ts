/**
 * Same double-encoding bug as addProjectMember: updateProjectMember
 * JSON.stringify'd notificationSettings before writing it into a jsonb
 * column, which already takes a plain JS value directly.
 */

import { describe, it, expect, vi } from "vitest";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "member-1" }]),
};

vi.mock("../../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

describe("updateProjectMember", () => {
  it("stores notificationSettings as a plain object, not a JSON string", async () => {
    mockDb.where.mockReturnThis(); // base: chain into .returning() for the update
    mockDb.where.mockResolvedValueOnce([{ id: "member-1" }]); // first call: existing-member lookup

    const { default: updateProjectMember } = await import(
      "../update-project-member"
    );

    await updateProjectMember("project-1", "member@example.com", {
      notificationSettings: { taskAssigned: true },
    });

    const setValues = mockDb.set.mock.calls[0]?.[0];
    expect(setValues.notificationSettings).toEqual({ taskAssigned: true });
  });
});
