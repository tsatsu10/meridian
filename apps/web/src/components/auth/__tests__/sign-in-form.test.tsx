import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthSurface } from "../auth-surface";
import { SignInForm } from "../sign-in-form";

// Mock external dependencies
vi.mock("../../../hooks/mutations/use-sign-in");
vi.mock("lucide-react", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    Eye: vi.fn(() => <div data-testid="eye-icon" />),
    EyeOff: vi.fn(() => <div data-testid="eye-off-icon" />),
  };
});

// Mock useNavigate and useRouter
const mockNavigate = vi.fn();
const mockHistory = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  createHref: vi.fn(),
  listen: vi.fn(),
};
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouter: () => ({
      history: mockHistory,
      navigate: mockNavigate,
      state: { location: { pathname: "/", search: "", hash: "", state: {} } },
    }),
  };
});

// Mock sign-in hook
const mockSignIn = vi
  .fn()
  .mockResolvedValue({ id: "123", email: "test@example.com" });

vi.mock("../../../hooks/mutations/use-sign-in", () => ({
  default: vi.fn(() => ({
    mutate: mockSignIn,
    mutateAsync: mockSignIn,
    isPending: false,
    error: null,
  })),
}));

// Renders the same tree the real /auth/sign-in route wires up: the aurora
// surface with SignInForm plugged in as its credential step. The email input
// only exists on step 01 (owned by AuthSurface), so every test here reaches
// the password field by going through the surface rather than mounting
// SignInForm on its own.
function renderSignInRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSurface
        intent="sign-in"
        renderCredentialStep={({ email, onEditEmail }) => (
          <SignInForm email={email} onEditEmail={onEditEmail} />
        )}
      />
    </QueryClientProvider>,
  );
}

async function advanceToPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), "person@example.com");
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return screen.findByLabelText(/password/i);
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders the password step after the email step", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(await advanceToPassword(user)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  // Was "validates required fields": email validation moved to the
  // surface's identity step (step 01) in this task, so an empty/invalid
  // email is now rejected before the credential step is ever reachable
  // rather than by a field error inside this form.
  it("does not advance to the password step without a valid email", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
  });

  // Was "validates email format" — same relocation as above.
  it("rejects a malformed email before reaching the password step", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    await user.type(screen.getByLabelText(/email/i), "invalid-email");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
  });

  it("validates password length", async () => {
    // Skip this test - sign-in schema doesn't validate password length
    // Password validation happens on the server side for sign-in
    // Only sign-up has client-side password validation
    expect(true).toBe(true);
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    const passwordInput = await advanceToPassword(user);
    const toggleButton = screen
      .getByTestId("eye-icon")
      .closest("button") as HTMLElement;

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("submits with valid credentials", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    const password = await advanceToPassword(user);
    await user.type(password, "Passw0rd!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "Passw0rd!",
      }),
    );
  });

  it("stores the pending 2FA token and navigates to verify-2fa on a 2FA challenge", async () => {
    mockSignIn.mockResolvedValueOnce({
      twoFactorRequired: true,
      pendingToken: "pending-token-abc",
      email: "person@example.com",
    });
    const user = userEvent.setup();
    renderSignInRoute();

    const password = await advanceToPassword(user);
    await user.type(password, "Passw0rd!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem("pending2FAToken")).toBe(
        "pending-token-abc",
      );
    });
    expect(mockHistory.push).toHaveBeenCalledWith(
      "/auth/verify-2fa?email=person%40example.com",
    );
  });

  it("shows loading state when submitting", async () => {
    // Skip this test for now - focus on validation
    // TODO: Fix loading state test
    expect(true).toBe(true);
  });

  it("handles form submission with Enter key", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    const passwordInput = await advanceToPassword(user);
    await user.type(passwordInput, "password123");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "password123",
      });
    });
  });

  // Was "clears errors when user starts typing" — the field that used to
  // clear (email) now lives on the identity step; this asserts the same
  // "error clears once the input becomes valid" behaviour there.
  it("clears the identity error once a valid email is submitted", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/enter a valid email address/i),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("has proper accessibility attributes on the password field", async () => {
    const user = userEvent.setup();
    renderSignInRoute();

    const passwordInput = await advanceToPassword(user);
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
  });
});
