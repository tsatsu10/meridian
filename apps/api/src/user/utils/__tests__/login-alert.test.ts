import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: "Login Alerts → Email Alerts" on the Security page stored
 * `loginNotifications` and nothing ever read it. There was no login-alert code
 * anywhere in the API, so the switch promised notifications that could never
 * arrive.
 */

const sendNotificationEmail = vi.fn().mockResolvedValue(true);
const getSecurityPreferences = vi.fn();
const isKnownDevice = vi.fn();

vi.mock("../../../services/email-service", () => ({
  emailService: {
    sendNotificationEmail: (...args: unknown[]) =>
      sendNotificationEmail(...args),
  },
  default: {
    sendNotificationEmail: (...args: unknown[]) =>
      sendNotificationEmail(...args),
  },
}));

vi.mock("../security-preferences", () => ({
  getSecurityPreferences: (email: string) => getSecurityPreferences(email),
}));

vi.mock("../known-device", () => ({
  isKnownDevice: (...args: unknown[]) => isKnownDevice(...args),
}));

vi.mock("../../../utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("sendLoginAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSecurityPreferences.mockResolvedValue({
      sessionTimeout: true,
      loginNotifications: true,
    });
    isKnownDevice.mockResolvedValue(false);
  });

  it("emails the account when an unrecognised device signs in", async () => {
    const { sendLoginAlert } = await import("../login-alert");

    await sendLoginAlert({
      userId: "u1",
      userEmail: "owner@example.com",
      userName: "Owner",
      ipAddress: "203.0.113.7",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(sendNotificationEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = sendNotificationEmail.mock.calls[0];
    expect(to).toBe("owner@example.com");
    expect(String(subject)).toMatch(/sign-in|login/i);
    expect(String(body)).toContain("Chrome on Windows");
    expect(String(body)).toContain("203.0.113.7");
  });

  it("stays silent when the user turned login notifications off", async () => {
    getSecurityPreferences.mockResolvedValue({
      sessionTimeout: true,
      loginNotifications: false,
    });
    const { sendLoginAlert } = await import("../login-alert");

    await sendLoginAlert({
      userId: "u1",
      userEmail: "owner@example.com",
      userName: "Owner",
      ipAddress: "203.0.113.7",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    });

    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("stays silent for a device the account has used before", async () => {
    isKnownDevice.mockResolvedValue(true);
    const { sendLoginAlert } = await import("../login-alert");

    await sendLoginAlert({
      userId: "u1",
      userEmail: "owner@example.com",
      userName: "Owner",
      ipAddress: "203.0.113.7",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    });

    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("never lets a mail failure break the sign-in", async () => {
    sendNotificationEmail.mockRejectedValueOnce(new Error("SMTP down"));
    const { sendLoginAlert } = await import("../login-alert");

    await expect(
      sendLoginAlert({
        userId: "u1",
        userEmail: "owner@example.com",
        userName: "Owner",
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
  });

  it("never lets a preferences lookup failure break the sign-in", async () => {
    getSecurityPreferences.mockRejectedValueOnce(new Error("db down"));
    const { sendLoginAlert } = await import("../login-alert");

    await expect(
      sendLoginAlert({
        userId: "u1",
        userEmail: "owner@example.com",
        userName: "Owner",
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
  });
});
