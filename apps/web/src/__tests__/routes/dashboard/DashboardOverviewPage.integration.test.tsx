/**
 * Dashboard overview route — integration-style tests with heavy dependencies mocked.
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, to, ...rest }: { children?: React.ReactNode; to?: string; [key: string]: unknown }) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard" }),
  useRouter: () => ({ __store: {} }),
}));

const { mockDashboardRefetch, rbacAuthMock } = vi.hoisted(() => ({
  mockDashboardRefetch: vi.fn().mockResolvedValue(undefined),
  rbacAuthMock: () => ({
    hasPermission: vi.fn(() => true),
    isLoading: false,
    user: { id: "test-user", email: "test@example.com" },
  }),
}));

vi.mock("@/hooks/queries/dashboard/use-dashboard-data", () => ({
  useDashboardData: () => ({
    data: {
      stats: {
        totalTasks: 25,
        completedTasks: 18,
        overdueTasks: 3,
        dueTodayTasks: 0,
        activeProjects: 2,
        teamMembers: 5,
        productivity: 50,
      },
      projects: [
        {
          id: "1",
          name: "Project Alpha",
          status: "active",
          tasks: [
            { id: "t1", status: "done" },
            { id: "t2", status: "in_progress" },
            { id: "t3", status: "done" },
          ],
        },
        {
          id: "2",
          name: "Project Beta",
          status: "active",
          tasks: [{ id: "t4", status: "done" }],
        },
      ],
      activities: [],
      deadlines: [],
      teamMembers: [],
    },
    isLoading: false,
    error: null,
    refetch: mockDashboardRefetch,
  }),
}));

import { DashboardOverviewPage } from "@/routes/dashboard/index";

vi.mock("@/lib/permissions", () => ({
  useOptionalRBACAuth: rbacAuthMock,
  useRBACAuth: rbacAuthMock,
}));

vi.mock("@/hooks/use-dashboards", () => ({
  useDashboards: () => ({
    activeDashboard: null,
    dashboards: [],
    selectedDashboardId: null,
    isLoading: false,
    error: null,
    createDashboard: vi.fn(),
    updateDashboard: vi.fn(),
    deleteDashboard: vi.fn(),
    setDefaultDashboard: vi.fn(),
    duplicateDashboard: vi.fn(),
    selectDashboard: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    templates: [],
  }),
}));

vi.mock("@/store/workspace", () => ({
  default: () => ({
    workspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
    },
  }),
}));

vi.mock("@/lib/security", () => ({
  rateLimiter: {
    isAllowed: () => true,
    getTimeUntilNextAttempt: () => 0,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/queries/risk/use-risk-detection", () => ({
  useRiskMonitor: () => ({
    data: {
      overallRiskScore: 45,
      riskLevel: "medium",
      alerts: [
        {
          id: "r1",
          title: "Performance Warning",
          description: "System performance degraded",
          severity: "medium",
          affectedTasks: ["t1", "t2"],
        },
      ],
      summary: { totalRisks: 1 },
      trends: { riskTrend: "stable", newRisks: 1, resolvedRisks: 0 },
    },
    isLoading: false,
    isError: false,
    hasHighRisk: false,
    highPriorityRisks: [],
    criticalRisks: [],
    hasCriticalRisk: false,
  }),
}));

vi.mock("@/hooks/mutations/task/use-auto-status-update", () => ({
  getNotificationsFromStore: () => [
    {
      id: "n1",
      type: "auto-status-update",
      title: "Task Updated",
      message: "Your task status was updated",
      priority: "medium",
      timestamp: "2025-01-15T10:00:00.000Z",
      isRead: false,
      data: { taskId: "t1", newStatus: "done", reason: "test" },
    },
    {
      id: "n2",
      type: "auto-status-update",
      title: "New Assignment",
      message: "You have a new task assignment",
      priority: "high",
      timestamp: "2025-01-15T09:30:00.000Z",
      isRead: true,
      data: { taskId: "t2", newStatus: "in_progress", reason: "test" },
    },
  ],
}));

vi.mock("@/components/performance/lazy-dashboard-layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="lazy-dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/components/dashboard/universal-header", () => ({
  default: ({
    title,
    customActions,
  }: {
    title?: string;
    customActions?: React.ReactNode;
  }) => (
    <header data-testid="universal-header">
      {title ? <h1>{title}</h1> : null}
      {customActions}
    </header>
  ),
}));

vi.mock("@/components/dashboard/animated-stats-card", () => ({
  default: ({ title, value }: { title: string; value: number | string }) => (
    <div data-testid={`stat-card-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <span>{title}</span>
      <span data-testid={`stat-value-${title.replace(/\s+/g, "-").toLowerCase()}`}>{value}</span>
    </div>
  ),
}));

vi.mock("@/components/magicui/blur-fade", () => ({
  BlurFade: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/shared/modals/create-project-modal", () => ({
  default: () => null,
}));

vi.mock("@/components/mobile/quick-capture-fab", () => ({
  QuickCaptureFAB: () => null,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("DashboardOverviewPage Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inside the lazy layout with dashboard title", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DashboardOverviewPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("lazy-dashboard-layout")).toBeInTheDocument();
    });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders stat cards with mocked dashboard data", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DashboardOverviewPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("stat-value-total-tasks")).toHaveTextContent("25");
    });
    expect(screen.getByTestId("stat-value-active-projects")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-value-team-members")).toHaveTextContent("5");
  });

  it("lists projects from dashboard data", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DashboardOverviewPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("renders Recent Activity with feed items from the notification store", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DashboardOverviewPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });
    expect(screen.getByText("Task Updated")).toBeInTheDocument();
    expect(screen.getByText("New Assignment")).toBeInTheDocument();
  });

  it("exposes header refresh control", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DashboardOverviewPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
    });
  });

  it("mounts without throwing", () => {
    const Wrapper = createWrapper();
    expect(() => {
      render(
        <Wrapper>
          <DashboardOverviewPage />
        </Wrapper>
      );
    }).not.toThrow();
  });

  it("invokes refetch when refresh is clicked", async () => {
    mockDashboardRefetch.mockClear();

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DashboardOverviewPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(mockDashboardRefetch).toHaveBeenCalled();
    });
  });
});
