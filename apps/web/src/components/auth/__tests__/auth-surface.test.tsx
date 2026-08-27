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
    // Only one step is ever mounted at a time (AnimatePresence
    // mode="wait"), so the credential step's node is genuinely absent here,
    // not merely hidden — a plain DOM-presence check is the honest one.
    expect(screen.queryByText(/credential step/i)).not.toBeInTheDocument();
  });

  it("mounts only the active step, never both, so the panel is never sized to fit a step the user isn't on", () => {
    // This is the regression the "dead space" bug was: an earlier version
    // mounted both steps permanently (to avoid a layout jump on the first
    // transition) which left the panel sized to fit whichever step was
    // taller, all the time — a visible gap under step 01 on every load.
    const { container } = render(
      <AuthSurface intent="sign-in" renderCredentialStep={credential} />,
    );

    expect(container.querySelectorAll("[data-auth-step]").length).toBe(1);
    expect(
      container.querySelector('[data-auth-step="identity"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-auth-step="credential"]'),
    ).not.toBeInTheDocument();
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
    // Under mode="wait" the identity step fully unmounts on advance and
    // remounts fresh on return (rather than merely toggling visibility),
    // so restoring it isn't synchronous — this awaits the credential
    // step's exit and the identity step's fresh mount.
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /change email/i }),
    );

    expect(await screen.findByLabelText(/email/i)).toHaveValue(
      "person@example.com",
    );
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

    // Flush ~400ms before asserting: a debounced email-existence probe (say
    // 300ms) would not have fired yet immediately after the click, so this
    // guards against a debounced enumeration leak that an immediate
    // assertion would miss entirely.
    await new Promise((resolve) => setTimeout(resolve, 400));

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

  it("does not leave the identity step's control reachable once the credential step is active", async () => {
    // The orphan-control bug this guards against: a hidden-but-still-mounted
    // outgoing step remaining focusable/announced while a different step is
    // already showing. Under mode="wait" the identity step fully unmounts
    // (asserted directly), which is a stronger guarantee than "hidden."
    const user = userEvent.setup();
    const { container } = render(
      <AuthSurface intent="sign-in" renderCredentialStep={credential} />,
    );

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/credential step for person@example.com/i),
      ).toBeInTheDocument(),
    );

    expect(
      container.querySelector('[data-auth-step="identity"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /email/i }),
    ).not.toBeInTheDocument();
  });

  it("does not leave the credential step's control reachable while back on identity", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuthSurface intent="sign-in" renderCredentialStep={credential} />,
    );

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /change email/i }),
    );

    await waitFor(() =>
      expect(
        container.querySelector('[data-auth-step="credential"]'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /change email/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
  });

  it("makes the step transition instant when the user prefers reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    );

    const { container } = render(
      <AuthSurface intent="sign-in" renderCredentialStep={credential} />,
    );

    // Reads the literal value passed to the motion elements' `transition`
    // prop (shared with the panel's height-animating layout wrapper), not
    // an independently-computed marker, so this fails if the reduced-motion
    // check is ever wired up but the duration itself isn't gated by it.
    expect(
      container.querySelector("[data-step-transition-duration]"),
    ).toHaveAttribute("data-step-transition-duration", "0");
  });

  it("animates the step transition over 240ms by default", () => {
    const { container } = render(
      <AuthSurface intent="sign-in" renderCredentialStep={credential} />,
    );

    expect(
      container.querySelector("[data-step-transition-duration]"),
    ).toHaveAttribute("data-step-transition-duration", "0.24");
  });
});
