/**
 * Email Service Tests
 * Unit tests for email composition, sending, and retry behavior.
 * SendGrid is mocked — no real emails are sent.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import sgMail from "@sendgrid/mail";
import { EmailService } from "./email-service";

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}));

const sendMock = vi.mocked(sgMail.send);

describe("EmailService", () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.stubEnv("SENDGRID_API_KEY", "test-api-key");
    vi.stubEnv("FROM_EMAIL", "test@meridian.app");
    vi.stubEnv("FRONTEND_URL", "http://localhost:5173");
    vi.clearAllMocks();
    sendMock.mockResolvedValue([
      { statusCode: 202, body: {}, headers: {} },
      {},
    ] as unknown as Awaited<ReturnType<typeof sgMail.send>>);
    emailService = new EmailService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("configures SendGrid with the API key", () => {
      expect(sgMail.setApiKey).toHaveBeenCalledWith("test-api-key");
    });

    it("does not send when no API key is configured", async () => {
      vi.stubEnv("SENDGRID_API_KEY", "");
      vi.stubEnv("AWS_SES_API_KEY", "");
      const uninitialized = new EmailService();

      const result = await uninitialized.sendVerificationEmail(
        "user@example.com",
        "token",
        "User",
      );

      expect(result).toBe(false);
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("sendVerificationEmail", () => {
    it("sends and reports success", async () => {
      const result = await emailService.sendVerificationEmail(
        "user@example.com",
        "verification-token-123",
        "John Doe",
      );

      expect(result).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it("addresses the recipient and includes the verification link", async () => {
      await emailService.sendVerificationEmail(
        "user@example.com",
        "token-abc",
        "Jane",
      );

      const msg = sendMock.mock.calls[0][0] as {
        to: string;
        subject: string;
        html: string;
        from: { email: string };
      };
      expect(msg.to).toBe("user@example.com");
      expect(msg.subject).toBe("Verify your Meridian account");
      expect(msg.from.email).toBe("test@meridian.app");
      expect(msg.html).toContain("Hi Jane");
      expect(msg.html).toContain("/verify-email?token=token-abc");
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("sends and includes the reset link with token", async () => {
      const result = await emailService.sendPasswordResetEmail(
        "user@example.com",
        "reset-token-123",
        "John Doe",
      );

      expect(result).toBe(true);
      const msg = sendMock.mock.calls[0][0] as { html: string };
      expect(msg.html).toContain("token=reset-token-123");
    });
  });

  describe("sendWelcomeEmail", () => {
    it("sends and reports success", async () => {
      const result = await emailService.sendWelcomeEmail(
        "user@example.com",
        "New User",
      );

      expect(result).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry logic", () => {
    it("retries failed sends and succeeds on a later attempt", async () => {
      vi.useFakeTimers();
      sendMock
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValueOnce([
          { statusCode: 202, body: {}, headers: {} },
          {},
        ] as unknown as Awaited<ReturnType<typeof sgMail.send>>);

      const pending = emailService.sendVerificationEmail(
        "user@example.com",
        "token",
        "User",
      );
      await vi.runAllTimersAsync();
      const result = await pending;

      expect(sendMock).toHaveBeenCalledTimes(3);
      expect(result).toBe(true);
    });

    it("gives up after 3 attempts and reports failure", async () => {
      vi.useFakeTimers();
      sendMock.mockRejectedValue(new Error("Always fail"));

      const pending = emailService.sendVerificationEmail(
        "user@example.com",
        "token",
        "User",
      );
      await vi.runAllTimersAsync();
      const result = await pending;

      expect(sendMock).toHaveBeenCalledTimes(3);
      expect(result).toBe(false);
    });
  });
});
