import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ForgotPasswordForm } from "../forgot-password-form";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// These tests used to run against a form whose submit handler was
// `await new Promise(r => setTimeout(r, 2000))` — no network call at all. Now
// that it posts for real, fetch has to be stubbed or jsdom attempts a live
// request; the stub is also what lets us assert the request is actually made,
// which is the regression that matters here.
// Typed as a real fetch signature rather than `vi.fn(async () => …)`, whose
// zero-arg inference makes `mock.calls[0]` an empty tuple — the assertions
// below read the URL and init out of it.
type FetchCall = (input: string, init: RequestInit) => Promise<Response>;

function stubFetch(impl?: FetchCall) {
  const fetchMock = vi.fn<FetchCall>(
    impl ??
      (async () =>
        new Response(JSON.stringify({ success: true }), { status: 200 })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submitEmail(email: string) {
  const emailInput = screen.getByPlaceholderText(/enter your email address/i);
  await userEvent.type(emailInput, email);
  fireEvent.click(screen.getByRole("button", { name: /submit/i }));
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Initial Rendering", () => {
    it("should render email input field", () => {
      stubFetch();
      render(<ForgotPasswordForm />);

      expect(
        screen.getByPlaceholderText(/enter your email address/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    it("should render submit button and cancel link", () => {
      stubFetch();
      render(<ForgotPasswordForm />);

      expect(
        screen.getByRole("button", { name: /submit/i }),
      ).toBeInTheDocument();
      // Cancel is a link, not a button
      expect(screen.getByRole("link", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("should show error for invalid email format", async () => {
      const fetchMock = stubFetch();
      render(<ForgotPasswordForm />);

      await submitEmail("invalid-email");

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should not show error for valid email format", async () => {
      stubFetch();
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText(
        /enter your email address/i,
      );
      await userEvent.type(emailInput, "valid@example.com");

      void screen.getByRole("button", { name: /submit/i });

      // No validation error should appear
      expect(
        screen.queryByText(/please enter a valid email address/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should POST the address to the forgot-password endpoint", async () => {
      const fetchMock = stubFetch();
      render(<ForgotPasswordForm />);

      await submitEmail("test@example.com");

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/auth\/forgot-password$/);
      expect(init.method).toBe("POST");
      // Session cookies must ride along so the request behaves the same way
      // as every other call in the app.
      expect(init.credentials).toBe("include");
      expect(JSON.parse(init.body as string)).toEqual({
        email: "test@example.com",
      });
    });

    it("should show success state after submission", async () => {
      stubFetch();
      render(<ForgotPasswordForm />);

      await submitEmail("test@example.com");

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Should display the email address
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should not claim an email was sent to a known account", async () => {
      stubFetch();
      render(<ForgotPasswordForm />);

      await submitEmail("test@example.com");

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // The API answers success whether or not the address is registered, so
      // the confirmation must stay conditional — asserting delivery would both
      // mislead and confirm the account exists.
      expect(screen.getByText(/if an account exists for/i)).toBeInTheDocument();
    });

    it("should surface a failure instead of showing the success screen", async () => {
      stubFetch(
        async () =>
          new Response(JSON.stringify({ error: { message: "SMTP is down" } }), {
            status: 500,
          }),
      );
      render(<ForgotPasswordForm />);

      await submitEmail("test@example.com");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
      expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
    });

    it("should allow returning to form from success state", async () => {
      stubFetch();
      render(<ForgotPasswordForm />);

      await submitEmail("test@example.com");

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /back to form/i }));

      // Should show form again
      expect(
        screen.getByPlaceholderText(/enter your email address/i),
      ).toBeInTheDocument();
    });

    it("should disable submit button while loading", async () => {
      // Never resolves, so the pending state stays observable.
      stubFetch(() => new Promise<Response>(() => {}));
      render(<ForgotPasswordForm />);

      await submitEmail("test@example.com");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
      });
    });
  });
});
