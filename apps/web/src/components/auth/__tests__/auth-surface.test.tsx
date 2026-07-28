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
    // The credential step's DOM node may already be mounted (it is — see
    // "mounts both steps from first paint" below, which keeps the panel
    // from resizing on the first transition), but it must not be
    // *presented*: not reachable by role/keyboard, not announced.
    // queryByText doesn't check any of that (it would find the node
    // whether or not it's aria-hidden), so this asserts via role instead.
    expect(
      screen.queryByRole("button", { name: /change email/i }),
    ).not.toBeInTheDocument();
  });

  it("mounts both steps from first paint so the panel never resizes, including on the first transition", () => {
    const { container } = render(
      <AuthSurface intent="sign-in" renderCredentialStep={credential} />,
    );

    // Both grid cells must exist before the user ever advances — that's
    // what keeps the panel's height stable through the very first
    // transition (the one nearly every real user hits), not just
    // subsequent back/forward toggles.
    const identityStep = container.querySelector('[data-auth-step="identity"]');
    const credentialStep = container.querySelector(
      '[data-auth-step="credential"]',
    );
    expect(identityStep).toBeInTheDocument();
    expect(credentialStep).toBeInTheDocument();

    // But on first paint the credential step must not be presented: hidden
    // from assistive tech and not reachable by keyboard/role queries.
    expect(credentialStep).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.queryByRole("button", { name: /change email/i }),
    ).not.toBeInTheDocument();
  });

  it("advances to the credential step with the email", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // getByRole excludes aria-hidden subtrees, so this only resolves once
    // the credential step is actually the active, presented step — not
    // merely mounted (it's mounted from first paint; see the "mounts both
    // steps" test above).
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /change email/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/credential step for person@example.com/i),
    ).toBeInTheDocument();
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

    // The credential step's node is always mounted (see "mounts both
    // steps"), so this asserts via role — it must still not be presented.
    expect(
      screen.queryByRole("button", { name: /change email/i }),
    ).not.toBeInTheDocument();
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

  it("hides the identity step's control from the accessibility tree once the credential step is active", async () => {
    // The reflow/orphan-control bug: without an explicit gate, the outgoing
    // step could stay mounted, focusable and reachable via getByRole while
    // visually fading out underneath the incoming step.
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/credential step for person@example.com/i),
      ).toBeInTheDocument(),
    );

    // getByRole excludes anything aria-hidden (or otherwise inaccessible),
    // so this only passes if the identity step's email input is no longer
    // reachable — even though the node itself is still in the DOM so
    // "change email" can restore it instantly.
    expect(
      screen.queryByRole("textbox", { name: /email/i }),
    ).not.toBeInTheDocument();
    // Only the credential step's own control should be reachable now.
    expect(
      screen.getByRole("button", { name: /change email/i }),
    ).toBeInTheDocument();
  });

  it("hides the credential step's control from the accessibility tree while back on identity", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /change email/i }),
    );

    // Back on identity: the credential step's "change email" control must
    // not be reachable even though it stayed mounted for a fast return trip.
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
    // prop (see data-step-transition-duration in auth-surface.tsx), not an
    // independently-computed marker, so this fails if the reduced-motion
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
