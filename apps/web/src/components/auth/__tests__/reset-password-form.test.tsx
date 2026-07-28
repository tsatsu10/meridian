import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ResetPasswordForm } from "../reset-password-form";

const mockPush = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    history: { push: mockPush },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

async function fillAndSubmit(password: string, confirmPassword = password) {
  await userEvent.type(screen.getByLabelText(/new password/i), password);
  await userEvent.type(
    screen.getByLabelText(/confirm password/i),
    confirmPassword,
  );
  fireEvent.click(screen.getByRole("button", { name: /update password/i }));
}

const VALID_PASSWORD = "NewPassw0rd";

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the token and both passwords to the reset endpoint", async () => {
    const fetchMock = stubFetch();
    render(<ResetPasswordForm token="tok-123" />);

    await fillAndSubmit(VALID_PASSWORD);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/reset-password$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      token: "tok-123",
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });
  });

  it("rejects a password that misses the server's complexity rule", async () => {
    const fetchMock = stubFetch();
    render(<ResetPasswordForm token="tok-123" />);

    // Long enough, but all lowercase and no digit — the API's zValidator would
    // reject this, so the client must catch it first and show it inline on the
    // field rather than letting it round-trip into a toast.
    await fillAndSubmit("alllowercase");

    await waitFor(() => {
      expect(screen.getByText(/include at least one uppercase/i)).toBeVisible();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation without calling the API", async () => {
    const fetchMock = stubFetch();
    render(<ResetPasswordForm token="tok-123" />);

    await fillAndSubmit(VALID_PASSWORD, "Different0ne");

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeVisible();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the confirmation screen on success", async () => {
    stubFetch();
    render(<ResetPasswordForm token="tok-123" />);

    await fillAndSubmit(VALID_PASSWORD);

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /go to sign in/i }),
    ).toBeInTheDocument();
  });

  it("surfaces an expired or already-used token instead of claiming success", async () => {
    stubFetch(
      async () =>
        new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 400,
        }),
    );
    render(<ResetPasswordForm token="stale-token" />);

    await fillAndSubmit(VALID_PASSWORD);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    // The reason from the API has to reach the user — a generic failure would
    // leave them retrying a token that can never work.
    expect(vi.mocked(toast.error).mock.calls[0]?.[0]).toMatch(
      /invalid or expired token/i,
    );
    expect(screen.queryByText(/password updated/i)).not.toBeInTheDocument();
  });

  it("sends the user to sign-in from the confirmation screen", async () => {
    stubFetch();
    render(<ResetPasswordForm token="tok-123" />);

    await fillAndSubmit(VALID_PASSWORD);

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /go to sign in/i }));
    expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
  });

  it("disables the submit button while the request is in flight", async () => {
    stubFetch(() => new Promise<Response>(() => {}));
    render(<ResetPasswordForm token="tok-123" />);

    await fillAndSubmit(VALID_PASSWORD);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /updating/i })).toBeDisabled();
    });
  });
});
