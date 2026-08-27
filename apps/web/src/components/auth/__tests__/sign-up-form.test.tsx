import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthSurface } from "../auth-surface";
import { SignUpForm } from "../sign-up-form";

// Mock external dependencies
vi.mock("lucide-react", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    Eye: vi.fn(() => <div data-testid="eye-icon" />),
    EyeOff: vi.fn(() => <div data-testid="eye-off-icon" />),
  };
});

const mockPush = vi.fn();
const mockSetUser = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    history: { push: mockPush },
  }),
}));

vi.mock("../../providers/auth-provider/hooks/use-auth", () => ({
  default: () => ({
    setUser: mockSetUser,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSignUp = vi.fn();
vi.mock("@/hooks/mutations/use-sign-up", () => ({
  default: () => ({
    mutateAsync: mockSignUp,
    isPending: false,
  }),
}));

// Renders the same tree the real /auth/sign-up route wires up: the aurora
// surface with SignUpForm plugged in as its credential step. The email input
// only exists on step 01 (owned by AuthSurface), so every test here reaches
// the name/password fields by going through the surface rather than mounting
// SignUpForm on its own.
function renderSignUpRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSurface
        intent="sign-up"
        renderCredentialStep={({ email, onEditEmail }) => (
          <SignUpForm email={email} onEditEmail={onEditEmail} />
        )}
      />
    </QueryClientProvider>,
  );
}

async function advanceToCredentials(
  user: ReturnType<typeof userEvent.setup>,
  email = "test@example.com",
) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return screen.findByLabelText(/name/i);
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the credential step after the email step", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(await advanceToCredentials(user)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i }),
      ).toBeInTheDocument();
    });
  });

  // Was "validates required fields via email/password on one screen": email
  // validation moved to the surface's identity step (step 01) in this task,
  // so an empty/invalid email is now rejected before the credential step is
  // ever reachable rather than by a field error inside this form.
  describe("Validation", () => {
    it("does not advance to the credential step without a valid email", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();

      await user.click(screen.getByRole("button", { name: /continue/i }));

      expect(
        await screen.findByText(/enter a valid email address/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /create account/i }),
      ).not.toBeInTheDocument();
    });

    it("should show error for empty name field", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user);

      await user.type(screen.getByLabelText(/^password/i), "password123");
      await user.type(screen.getByLabelText(/confirm/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it("should show error for password less than 8 characters", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user);

      await user.type(screen.getByLabelText(/name/i), "Test User");
      await user.type(screen.getByLabelText(/^password/i), "short");
      await user.type(screen.getByLabelText(/confirm/i), "short");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user);

      await user.type(screen.getByLabelText(/name/i), "Test User");
      await user.type(screen.getByLabelText(/^password/i), "password123");
      await user.type(screen.getByLabelText(/confirm/i), "password456");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });
  });

  describe("Password Visibility Toggle", () => {
    it("should toggle password visibility", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user);

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen
        .getAllByTestId("eye-icon")[0]
        .closest("button") as HTMLElement;

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("should toggle confirm password visibility independently", async () => {
      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user);

      const confirmInput = screen.getByLabelText(/confirm/i);
      expect(confirmInput).toHaveAttribute("type", "password");

      const confirmToggle = screen
        .getAllByTestId("eye-icon")[1]
        .closest("button") as HTMLElement;

      await user.click(confirmToggle);
      expect(confirmInput).toHaveAttribute("type", "text");
    });
  });

  describe("Form Submission", () => {
    it("should successfully submit form with valid data", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      };
      mockSignUp.mockResolvedValue(mockUser);

      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user, "test@example.com");

      await user.type(screen.getByLabelText(/name/i), "Test User");
      await user.type(screen.getByLabelText(/^password/i), "password123");
      await user.type(screen.getByLabelText(/confirm/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
    });

    it("creates an account from the credential step", async () => {
      mockSignUp.mockResolvedValue({
        id: "user-2",
        email: "new@example.com",
        name: "New Person",
      });

      const user = userEvent.setup();
      renderSignUpRoute();

      await user.type(screen.getByLabelText(/email/i), "new@example.com");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await user.type(await screen.findByLabelText(/name/i), "New Person");
      await user.type(screen.getByLabelText(/^password/i), "Passw0rd!");
      await user.type(screen.getByLabelText(/confirm/i), "Passw0rd!");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() =>
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "new@example.com",
            name: "New Person",
          }),
        ),
      );
    });

    it("submits the form with Enter key", async () => {
      mockSignUp.mockResolvedValue({
        id: "user-3",
        email: "test@example.com",
        name: "Test User",
      });

      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user, "test@example.com");

      await user.type(screen.getByLabelText(/name/i), "Test User");
      await user.type(screen.getByLabelText(/^password/i), "password123");
      const confirmInput = screen.getByLabelText(/confirm/i);
      await user.type(confirmInput, "password123");
      await user.type(confirmInput, "{Enter}");

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should handle submission errors gracefully", async () => {
      const { toast } = await import("sonner");
      mockSignUp.mockRejectedValue(new Error("Email already exists"));

      const user = userEvent.setup();
      renderSignUpRoute();
      await advanceToCredentials(user, "existing@example.com");

      await user.type(screen.getByLabelText(/name/i), "Test User");
      await user.type(screen.getByLabelText(/^password/i), "password123");
      await user.type(screen.getByLabelText(/confirm/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Couldn't create your account. Email already exists.",
        );
      });
    });
  });
});
