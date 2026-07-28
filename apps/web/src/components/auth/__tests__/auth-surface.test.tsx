import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSurface } from "../auth-surface";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
});

const credential = ({
  email,
  onEditEmail,
}: { email: string; onEditEmail: () => void }) => (
  <div>
    <span>credential step for {email}</span>
    <button type="button" onClick={onEditEmail}>
      change email
    </button>
  </div>
);

describe("AuthSurface", () => {
  it("starts on the identity step", () => {
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText(/credential step/i)).not.toBeInTheDocument();
  });

  it("advances to the credential step with the email", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/credential step for person@example.com/i),
      ).toBeInTheDocument(),
    );
  });

  it("returns to identity with the email preserved", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /change email/i }),
    );

    expect(screen.getByLabelText(/email/i)).toHaveValue("person@example.com");
  });

  it("refuses to advance on an invalid email", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.queryByText(/credential step/i)).not.toBeInTheDocument();
  });

  it("never contacts the server on the identity step", async () => {
    // The enumeration guarantee: no request may reveal whether the address is
    // registered, so step 01 must make no request at all.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("offers account creation on the sign-in intent", () => {
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);
    expect(
      screen.getByRole("link", { name: /create an account/i }),
    ).toHaveAttribute("href", "/auth/sign-up");
  });

  it("offers sign-in on the sign-up intent", () => {
    render(<AuthSurface intent="sign-up" renderCredentialStep={credential} />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });
});
