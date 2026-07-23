/**
 * Regression: creating the FIRST workspace must make it visible immediately,
 * without a page reload.
 *
 * Exercises the real WorkspaceProvider + real zustand stores + real react-query
 * cache. Only the network fetchers are mocked, standing in for the server.
 */

import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- server state stand-in -------------------------------------------------
type ServerWorkspace = { id: string; name: string };
let serverWorkspaces: ServerWorkspace[] = [];

/** Stand-in for network latency, so effects commit between request and response. */
const latency = () => new Promise((r) => setTimeout(r, 25));

const getWorkspacesMock = vi.fn(async () => {
  await latency();
  return [...serverWorkspaces];
});
const createWorkspaceMock = vi.fn(async ({ name }: { name: string }) => {
  await latency();
  const created = { id: `ws-${serverWorkspaces.length + 1}`, name };
  serverWorkspaces.push(created);
  return created;
});

vi.mock("@/fetchers/workspace/get-workspaces", () => ({
  default: () => getWorkspacesMock(),
}));
vi.mock("@/fetchers/workspace/create-workspace", () => ({
  default: (args: { name: string }) => createWorkspaceMock(args),
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const stableAuth = { user: { email: "new-user@meridian.app" } };
vi.mock("@/components/providers/auth-provider/hooks/use-auth", () => ({
  default: () => stableAuth,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import WorkspaceProvider from "@/components/providers/workspace-provider";
import EmptyWorkspaceState from "@/components/workspace/empty-state";
import useGetWorkspaces from "@/hooks/queries/workspace/use-get-workspaces";
import useWorkspaceStore from "@/store/workspace";
import { useUserPreferencesStore } from "@/store/user-preferences";

/** Mirrors the real dashboard route's workspace-state gating. */
function DashboardProbe() {
  const { workspace } = useWorkspaceStore();
  const { data: workspaces } = useGetWorkspaces();
  const activeWorkspaceId = useUserPreferencesStore((s) => s.activeWorkspaceId);

  return (
    <div>
      <div data-testid="selected">{workspace?.name ?? "NONE"}</div>
      <div data-testid="active-id">{activeWorkspaceId ?? "NULL"}</div>
      <div data-testid="list-count">{workspaces?.length ?? -1}</div>
      {workspaces?.length === 0 && !workspace && <EmptyWorkspaceState />}
    </div>
  );
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // StrictMode mirrors main.tsx, which double-invokes effects in development.
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>
          <DashboardProbe />
        </WorkspaceProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe("first workspace creation visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverWorkspaces = [];
    localStorage.clear();
    useWorkspaceStore.setState({ workspace: undefined });
    useUserPreferencesStore.setState({ activeWorkspaceId: null });
  });

  it("shows the newly created first workspace without a reload", async () => {
    const user = userEvent.setup();
    renderApp();

    // Start from the empty state.
    await waitFor(() => {
      expect(screen.getByTestId("list-count")).toHaveTextContent("0");
    });
    expect(screen.getByTestId("selected")).toHaveTextContent("NONE");

    await user.click(screen.getByRole("button", { name: /create workspace/i }));
    await user.type(
      await screen.findByLabelText(/workspace name/i),
      "Acme Corp",
    );
    await user.click(
      screen.getByRole("button", { name: /^create workspace$/i }),
    );

    await waitFor(() => {
      expect(createWorkspaceMock).toHaveBeenCalled();
    });

    // The workspace must become the selected one with no page reload.
    await waitFor(() => {
      expect(screen.getByTestId("selected")).toHaveTextContent("Acme Corp");
    });
    expect(screen.getByTestId("active-id")).toHaveTextContent("ws-1");
  });
});
