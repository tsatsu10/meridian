import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailVerificationBanner } from "../email-verification-banner";

// Mock fetch
global.fetch = vi.fn();

// The component runs a 60s countdown on an interval. Fake timers with
// shouldAdvanceTime keep the clock moving with real time (so userEvent's
// internal delays and pending microtasks still elapse) while letting the
// countdown tests fast-forward 60s instantly.
const setupUser = () => userEvent.setup();

const flushAsync = () =>
  act(async () => {
    await Promise.resolve();
  });

describe("EmailVerificationBanner", () => {
  const mockOnResend = vi.fn();
  const mockOnDismiss = vi.fn();
  const defaultProps = {
    userEmail: "test@example.com",
    onResend: mockOnResend,
    onDismiss: mockOnDismiss,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should display user email in banner", () => {
      render(<EmailVerificationBanner {...defaultProps} />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should render resend email button", () => {
      render(<EmailVerificationBanner {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /resend email/i }),
      ).toBeInTheDocument();
    });

    it("should render help link", () => {
      render(<EmailVerificationBanner {...defaultProps} />);

      const helpLink = screen.getByRole("link", { name: /need help/i });
      expect(helpLink).toBeInTheDocument();
      expect(helpLink).toHaveAttribute("href", "/help/email-verification");
    });

    it("should render dismiss button when onDismiss provided", () => {
      render(<EmailVerificationBanner {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /dismiss/i }),
      ).toBeInTheDocument();
    });

    it("should not render dismiss button when onDismiss not provided", () => {
      render(<EmailVerificationBanner userEmail="test@example.com" />);

      expect(
        screen.queryByRole("button", { name: /dismiss/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Resend Functionality", () => {
    it("should send verification email successfully", async () => {
      const user = setupUser();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailVerificationBanner {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /resend email/i }));
      await flushAsync();

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/resend-verification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com" }),
        },
      );
      expect(
        screen.getByText(/✅ Verification email sent!/i),
      ).toBeInTheDocument();
      expect(mockOnResend).toHaveBeenCalled();
    });

    it("should show error message on failure", async () => {
      const user = setupUser();
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      render(<EmailVerificationBanner {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /resend email/i }));
      await flushAsync();

      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });

    it("should show countdown timer after sending", async () => {
      const user = setupUser();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailVerificationBanner {...defaultProps} />);

      const resendButton = screen.getByRole("button", {
        name: /resend email/i,
      });
      await user.click(resendButton);
      await flushAsync();

      expect(resendButton).toHaveTextContent(/resend in 60s/i);
      expect(resendButton).toBeDisabled();
    });

    it("should disable button during countdown", async () => {
      const user = setupUser();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailVerificationBanner {...defaultProps} />);

      const resendButton = screen.getByRole("button", {
        name: /resend email/i,
      });

      // Initially not disabled
      expect(resendButton).not.toBeDisabled();

      await user.click(resendButton);
      await flushAsync();

      expect(resendButton).toBeDisabled();
      expect(resendButton).toHaveTextContent(/resend in/i);
    });

    it("should re-enable button after countdown completes", async () => {
      const user = setupUser();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailVerificationBanner {...defaultProps} />);

      const resendButton = screen.getByRole("button", {
        name: /resend email/i,
      });
      await user.click(resendButton);
      await flushAsync();

      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();

      // Fast-forward through the 60 second cooldown
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      expect(
        screen.getByRole("button", { name: /resend email/i }),
      ).not.toBeDisabled();
    });
  });

  describe("Dismiss Functionality", () => {
    it("should call onDismiss when dismiss button clicked", async () => {
      const user = setupUser();
      render(<EmailVerificationBanner {...defaultProps} />);

      // The dismiss button has aria-label="Dismiss"
      await user.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });
});
