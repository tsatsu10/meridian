import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockDb,
  resetMockDb,
} from "../../../tests/helpers/test-database";
import { userProfileTable, userTable } from "../../../database/schema";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

/**
 * Regression: the profile page rendered an editable "Full Name" field and
 * reported "Profile updated successfully!", but the name was never persisted —
 * it was absent from the client payload, the route's zod schema, and this
 * controller. Meanwhile GET /profile *did* return it (joined from users), so
 * the page displayed a field it could not write, and the value silently
 * reverted on reload.
 *
 * `name` lives on `users`, not `user_profiles`, so it needs its own write.
 */
describe("updateProfile", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([{ id: "profile-1" }]);
  });

  it("writes name to the users table, not user_profiles", async () => {
    // user exists, profile row exists
    mockDb.__setSelectResults([{ id: "user-1" }], [{ id: "profile-1" }]);

    const { default: updateProfile } = await import("../update-profile");
    await updateProfile("user-1", { name: "Ada Lovelace", bio: "Engineer" });

    const updatedTables = mockDb.update.mock.calls.map((call) => call[0]);
    expect(updatedTables).toContain(userTable);

    const userSet = mockDb.set.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find((payload) => "name" in payload);
    expect(userSet?.name).toBe("Ada Lovelace");
  });

  it("keeps name out of the user_profiles payload", async () => {
    mockDb.__setSelectResults([{ id: "user-1" }], [{ id: "profile-1" }]);

    const { default: updateProfile } = await import("../update-profile");
    await updateProfile("user-1", { name: "Ada Lovelace", bio: "Engineer" });

    // user_profiles has no `name` column — writing it there would throw at runtime.
    const profileSet = mockDb.set.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find((payload) => "bio" in payload);
    expect(profileSet).toBeDefined();
    expect(profileSet).not.toHaveProperty("name");
  });

  it("does not touch the users table when no name is supplied", async () => {
    mockDb.__setSelectResults([{ id: "user-1" }], [{ id: "profile-1" }]);

    const { default: updateProfile } = await import("../update-profile");
    await updateProfile("user-1", { bio: "Just a bio" });

    const updatedTables = mockDb.update.mock.calls.map((call) => call[0]);
    expect(updatedTables).not.toContain(userTable);
    expect(updatedTables).toContain(userProfileTable);
  });

  it("still creates a profile row when the user has none", async () => {
    mockDb.__setSelectResults([{ id: "user-1" }], []);

    const { default: updateProfile } = await import("../update-profile");
    await updateProfile("user-1", { name: "Ada", bio: "Engineer" });

    expect(mockDb.insert).toHaveBeenCalledWith(userProfileTable);
    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(inserted).not.toHaveProperty("name");
    expect(inserted.bio).toBe("Engineer");
  });
});
