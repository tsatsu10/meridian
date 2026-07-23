/**
 * Change-Password Controller Tests
 *
 * Regression: the Security settings page's password-change form never
 * called any API — handlePasswordChange did `setTimeout(resolve, 2000)`
 * then showed "Password updated successfully!" no matter what the user
 * typed. This is the backend half of the real fix: no endpoint existed to
 * call in the first place.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcrypt";
import changePassword from "../change-password";
import { getErrorDetails, isOperationalError } from "../../../utils/errors";
import {
  createMockDb,
  mockUsers,
  resetMockDb,
} from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("changePassword", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("updates the stored hash when the current password is correct", async () => {
    const currentPassword = "OldPassw0rd!";
    const hashedCurrent = await bcrypt.hash(currentPassword, 10);

    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([
      { ...mockUsers.validUser, password: hashedCurrent },
    ]);
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();

    await changePassword(
      mockUsers.validUser.email,
      currentPassword,
      "NewPassw0rd!",
    );

    expect(mockDb.update).toHaveBeenCalled();
    const [setArg] = mockDb.set.mock.calls[0];
    expect(setArg.password).not.toBe(hashedCurrent);
    await expect(bcrypt.compare("NewPassw0rd!", setArg.password)).resolves.toBe(
      true,
    );
  });

  it("rejects with a 401-mapped, operational error when the current password is wrong", async () => {
    const hashedCurrent = await bcrypt.hash("OldPassw0rd!", 10);

    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([
      { ...mockUsers.validUser, password: hashedCurrent },
    ]);

    let caught: unknown;
    try {
      await changePassword(
        mockUsers.validUser.email,
        "wrong-password",
        "NewPassw0rd!",
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    const details = getErrorDetails(caught);
    expect(details.statusCode).toBe(401);
    expect(isOperationalError(caught as Error)).toBe(true);
  });

  it("never touches the database when the current password is wrong", async () => {
    const hashedCurrent = await bcrypt.hash("OldPassw0rd!", 10);

    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([
      { ...mockUsers.validUser, password: hashedCurrent },
    ]);

    await changePassword(
      mockUsers.validUser.email,
      "wrong-password",
      "NewPassw0rd!",
    ).catch(() => undefined);

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects a new password that fails the strength policy", async () => {
    const currentPassword = "OldPassw0rd!";
    const hashedCurrent = await bcrypt.hash(currentPassword, 10);

    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([
      { ...mockUsers.validUser, password: hashedCurrent },
    ]);

    await expect(
      changePassword(mockUsers.validUser.email, currentPassword, "weak"),
    ).rejects.toThrow();
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
