/**
 * Role details page (roles-unified.$roleId.tsx).
 *
 * Every action on this page used to fail:
 *
 *  - Clone POSTed `{ newName }` with no workspaceId. POST /roles/:id/clone
 *    validates `{ name?, workspaceId: z.string().min(1) }`, so the request
 *    400'd on the missing field and, had it not, would have dropped the name
 *    the user typed (the server field is `name`, not `newName`). Identical to
 *    the bug already fixed on the list page — see roles-unified.test.tsx.
 *  - Three sections called routes that do not exist on the server:
 *    POST /roles/assign/bulk, GET /roles/assignments?roleId= (which matched
 *    `GET /:id` with id "assignments"), DELETE /roles/assignments/:id, and
 *    GET /roles/:id/history. All 404'd silently behind react-query error
 *    states, so the page looked functional and did nothing. They were removed
 *    rather than faked; the file header names the endpoints and components
 *    needed to restore each.
 *
 * The last test is the one that pins the removal: the page must issue NO
 * request to any of those paths. It is written as an allow-list over every
 * URL fetched, so re-adding any dead section — or inventing a new dead
 * endpoint — fails it rather than slipping through.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { RoleDetailsPage } from "../roles-unified.$roleId";

let mockWorkspace: { id: string; name: string; slug: string } | undefined = {
  id: "workspace-123",
  name: "Test Workspace",
  slug: "test-workspace",
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useParams: () => ({ roleId: "role-1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/store/workspace", () => ({
  default: () => ({ workspace: mockWorkspace }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const ROLE_RESPONSE = {
  role: {
    id: "role-1",
    name: "Custom Role",
    description: "A custom role",
    type: "custom",
    color: "#3B82F6",
    permissions: ["canViewTasks", "canCreateTasks"],
    usersCount: 0,
    lastUsedAt: null,
    isActive: true,
    createdAt: new Date("2026-01-01").toISOString(),
  },
};

// GET /roles/:id/usage returns the usage object at the TOP LEVEL — the page
// used to unwrap a `.usage` property that has never existed, so this stat was
// always undefined.
const USAGE_RESPONSE = { usersCount: 7, lastUsedAt: null, assignments: [] };

const fetchMock = vi.fn();

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("Role details page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspace = {
      id: "workspace-123",
      name: "Test Workspace",
      slug: "test-workspace",
    };
    window.prompt = vi.fn().mockReturnValue("Custom Role (Copy)");

    fetchMock.mockImplementation(async (input: unknown, init?: unknown) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (method === "POST" && url.includes("/clone")) {
        return { ok: true, json: async () => ({ role: { id: "role-2" } }) };
      }
      if (method === "GET" && url.includes("/usage")) {
        return { ok: true, json: async () => USAGE_RESPONSE };
      }
      if (method === "GET" && url.includes("/roles/role-1")) {
        return { ok: true, json: async () => ROLE_RESPONSE };
      }
      // Anything else is a route this page should no longer be calling.
      return { ok: false, status: 404, json: async () => ({ error: "404" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("clones with the workspace id and the name the user typed", async () => {
    const user = userEvent.setup();

    render(<RoleDetailsPage />, { wrapper: TestWrapper });

    const cloneButton = await screen.findByRole("button", { name: /clone/i });
    expect(cloneButton).toBeEnabled();

    await user.click(cloneButton);

    await waitFor(() => {
      const cloneCall = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("/clone"),
      );
      expect(cloneCall).toBeDefined();
      const body = JSON.parse((cloneCall?.[1] as RequestInit).body as string);
      // Both halves of the old bug: the required workspaceId is present, and
      // the field is `name` carrying the prompt value (not `newName`).
      expect(body).toEqual({
        name: "Custom Role (Copy)",
        workspaceId: "workspace-123",
      });
    });
  });

  it("disables Clone and issues no clone request when no workspace is selected", async () => {
    const user = userEvent.setup();
    mockWorkspace = undefined;

    render(<RoleDetailsPage />, { wrapper: TestWrapper });

    const cloneButton = await screen.findByRole("button", { name: /clone/i });
    expect(cloneButton).toBeDisabled();

    await user.click(cloneButton);

    expect(window.prompt).not.toHaveBeenCalled();
    const cloneCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/clone"),
    );
    expect(cloneCalls).toHaveLength(0);
  });

  it("shows the derived assigned-user count from the usage endpoint", async () => {
    render(<RoleDetailsPage />, { wrapper: TestWrapper });

    // 7 comes from GET /usage; the role row's own usersCount is 0. Proves the
    // page reads the derived stat and unwraps the response correctly.
    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  it("calls no endpoint that does not exist on the server", async () => {
    render(<RoleDetailsPage />, { wrapper: TestWrapper });

    await screen.findByRole("button", { name: /clone/i });
    // Let any lingering effect-driven queries settle before asserting.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const urls = fetchMock.mock.calls.map(([u]) => String(u));

    // The removed sections, by path.
    for (const dead of [
      "/roles/assign/bulk",
      "/roles/assignments",
      "/history",
    ]) {
      expect(urls.some((u) => u.includes(dead))).toBe(false);
    }

    // Allow-list: only the two real reads (plus a clone POST, not fired here).
    for (const url of urls) {
      expect(
        url.endsWith("/roles/role-1") || url.endsWith("/roles/role-1/usage"),
      ).toBe(true);
    }
  });

  it("no longer renders the assigned-users or history sections", async () => {
    render(<RoleDetailsPage />, { wrapper: TestWrapper });

    await screen.findByRole("button", { name: /clone/i });

    expect(
      screen.queryByRole("button", { name: /assign users/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /history/i })).toBeNull();
    // The one section that IS backed by a real endpoint stays.
    expect(screen.getByText(/^Permissions \(2\)$/)).toBeInTheDocument();
  });
});
