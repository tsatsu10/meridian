import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import changePassword from "../change-password";
import { API_BASE_URL } from "@/constants/urls";

describe("changePassword", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to the change-password endpoint with the session cookie", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password updated" }),
    });

    await changePassword({
      currentPassword: "OldPassw0rd!",
      newPassword: "NewPassw0rd!",
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(`${API_BASE_URL}/users/change-password`);
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body as string)).toEqual({
      currentPassword: "OldPassw0rd!",
      newPassword: "NewPassw0rd!",
    });
  });

  it("throws the server's error message when the current password is wrong", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: "Current password is incorrect" },
      }),
    });

    await expect(
      changePassword({
        currentPassword: "wrong",
        newPassword: "NewPassw0rd!",
      }),
    ).rejects.toThrow("Current password is incorrect");
  });
});
