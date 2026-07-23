/**
 * Regression: Team Management's "Team Settings" card duplicated Workspace
 * Settings' "Member Settings" card (same 4 toggles: allowMemberInvites,
 * requireAdminApproval, enableGuestAccess, autoRemoveInactive) but was the
 * broken copy — it PATCHed /api/workspace/settings, a route that doesn't
 * exist (the workspace router only defines /:id/settings), so every toggle
 * flipped on, 404'd, and visibly reverted. It also kept its own duplicate,
 * non-workspace-scoped localStorage state fully disconnected from the real
 * workspace record.
 *
 * The card is removed; Team Management now links to Workspace Settings
 * instead of re-implementing the same controls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamManagementSettings } from "../team-management";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/components/providers/auth-provider/hooks/use-auth", () => ({
  default: () => ({ user: { id: "u1", email: "admin@meridian.app" } }),
}));

const stableWorkspace = { id: "ws-1", name: "Acme" };
vi.mock("@/store/workspace", () => ({
  useWorkspaceStore: (selector: (s: { workspace: typeof stableWorkspace }) => unknown) =>
    selector({ workspace: stableWorkspace }),
}));

vi.mock("@/components/shared/modals/invite-user-modal", () => ({
  InviteUserModal: () => null,
}));

vi.mock("@/components/user/clickable-user-profile", () => ({
  ClickableUserProfile: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/performance/lazy-dashboard-layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/dashboard/universal-error-boundary", () => ({
  withErrorBoundary: (Component: React.ComponentType) => Component,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamManagementSettings />
    </QueryClientProvider>,
  );
}

describe("Team Management settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assignments: [] }),
    });
  });

  it("does not render the broken duplicate Team Settings toggles", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/team overview/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/^team settings$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/allow member invites/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/auto-remove inactive members/i),
    ).not.toBeInTheDocument();
  });

  it("links to Workspace Settings instead of duplicating its controls", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/team overview/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /workspace settings/i }),
    ).toBeInTheDocument();
  });

  it("never calls the nonexistent PATCH /api/workspace/settings route", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/team overview/i)).toBeInTheDocument();
    });

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => String(c[0]),
    );
    expect(calls.some((url) => url.includes("/workspace/settings"))).toBe(
      false,
    );
  });
});
