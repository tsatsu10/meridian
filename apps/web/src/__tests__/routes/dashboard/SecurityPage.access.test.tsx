import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Access control for /dashboard/security.
 *
 * The route used to throw from `beforeLoad` when `context.user.role` was not
 * "workspace-manager"/"admin". That role is the GLOBAL `users.role`, which is
 * "member" even for the workspace owner — workspace authority lives in
 * `workspace_members.role` — so the comparison could essentially never match
 * and the page was unreachable for everyone. Throwing from `beforeLoad` also
 * escaped to the dashboard error boundary, so the denial rendered as "There was
 * an error loading the dashboard" rather than the Access Restricted panel the
 * route already had.
 *
 * These tests pin the replacement: a permission check, rendered in the
 * component, with a loading state so it cannot flash a denial before RBAC
 * resolves.
 */

const mockHasPermission = vi.fn();
const mockIsLoading = { current: false };

vi.mock("@/lib/permissions/context", () => ({
  useRBACAuth: () => ({
    hasPermission: mockHasPermission,
    isLoading: mockIsLoading.current,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

// The widgets each fetch on mount and are irrelevant to the access decision.
vi.mock("@/components/dashboard/security/security-dashboard-widget", () => ({
  SecurityDashboardWidget: () => <div>security widget</div>,
}));
vi.mock("@/components/dashboard/security/access-control-monitor", () => ({
  AccessControlMonitor: () => <div>access monitor</div>,
}));
vi.mock("@/components/dashboard/security/tfa-status-widget", () => ({
  TwoFactorStatusWidget: () => <div>tfa widget</div>,
}));
vi.mock("@/components/dashboard/security/gdpr-compliance-widget", () => ({
  GDPRComplianceWidget: () => <div>gdpr widget</div>,
}));
vi.mock("@/components/dashboard/security/session-management-widget", () => ({
  SessionManagementWidget: () => <div>session widget</div>,
}));
vi.mock("@/components/dashboard/universal-header", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const { Route } = await import("@/routes/dashboard/security");
const SecurityDashboardPage = (
  Route as unknown as { component: () => JSX.Element }
).component;

describe("/dashboard/security access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading.current = false;
  });

  it("registers no beforeLoad guard", () => {
    // A throw here escapes to the dashboard error boundary, which is why the
    // previous denial was illegible. Authorization belongs in the component.
    expect(
      (Route as unknown as { beforeLoad?: unknown }).beforeLoad,
    ).toBeUndefined();
  });

  it("renders the dashboard for a holder of canViewSecurityLogs", () => {
    mockHasPermission.mockReturnValue(true);
    render(<SecurityDashboardPage />);

    expect(screen.getByText("Security Dashboard")).toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).toBeNull();
  });

  it("gates on the permission, not on any role string", () => {
    mockHasPermission.mockReturnValue(true);
    render(<SecurityDashboardPage />);

    // The old check read user.role and compared it to workspace role names.
    expect(mockHasPermission).toHaveBeenCalledWith("canViewSecurityLogs");
  });

  it("shows Access Restricted, not a crash, without the permission", () => {
    mockHasPermission.mockReturnValue(false);
    render(<SecurityDashboardPage />);

    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    expect(screen.queryByText("Security Dashboard")).toBeNull();
  });

  it("does not flash a denial while RBAC is still resolving", () => {
    // isLoading is `authUser === undefined`, so on a cold load the permission
    // is false before the user arrives; rendering the denial then would tell a
    // workspace manager they lack access for a frame.
    mockIsLoading.current = true;
    mockHasPermission.mockReturnValue(false);
    render(<SecurityDashboardPage />);

    expect(screen.queryByText(/Access Restricted/i)).toBeNull();
    expect(screen.queryByText("Security Dashboard")).toBeNull();
  });
});
