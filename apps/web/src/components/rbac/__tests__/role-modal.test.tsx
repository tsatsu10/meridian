/**
 * RoleModal workspace guard.
 *
 * role-modal.tsx used to read workspaceId from a disconnected stub store
 * (@/stores/workspace-store — a "Temporary stub" whose workspace was always
 * null, since deleted) instead of the real @/store/workspace. That meant
 * Create Role always sent workspaceId: "" to POST /roles, which now rejects
 * it (workspaceId: z.string().min(1)) — the modal's headline flow always
 * 400'd. This proves the modal now refuses to attempt a create when no
 * workspace is selected, rather than sending that empty-string request, and
 * that it still creates normally once a workspace is selected.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { RoleModal } from "../role-modal";

// Mutable so individual tests can simulate "no workspace selected"; reset in
// beforeEach.
let mockWorkspace: { id: string; name: string; slug: string } | undefined = {
  id: "workspace-123",
  name: "Test Workspace",
  slug: "test-workspace",
};

vi.mock("@/store/workspace", () => ({
  default: () => ({ workspace: mockWorkspace }),
}));

vi.mock("@/lib/permissions", () => ({
  useRBACAuth: () => ({
    user: {
      permissions: {
        canViewTasks: true,
        canManageRoles: true,
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

async function openPermissionsTabAndSelectOne(
  user: ReturnType<typeof userEvent.setup>,
) {
  // The Tabs implementation here (components/ui/tabs.tsx) is a plain
  // context-driven <button>, not Radix's tab-role primitive.
  await user.click(screen.getByRole("button", { name: /^permissions$/i }));
  const permissionLabel = await screen.findByText("canViewTasks");
  await user.click(permissionLabel);
}

describe("RoleModal workspace guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspace = {
      id: "workspace-123",
      name: "Test Workspace",
      slug: "test-workspace",
    };

    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.includes("/roles/permissions/all")) {
        return {
          ok: true,
          json: async () => ({
            permissions: ["canViewTasks", "canManageRoles"],
          }),
        };
      }
      if (url.includes("/roles")) {
        return {
          ok: true,
          json: async () => ({ role: { id: "new-role-1" } }),
        };
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("disables Create Role and does not POST when no workspace is selected", async () => {
    const user = userEvent.setup();
    mockWorkspace = undefined;
    const { toast } = await import("sonner");

    render(<RoleModal open={true} onClose={vi.fn()} />, {
      wrapper: TestWrapper,
    });

    await user.type(await screen.findByLabelText(/role name/i), "Test Role");
    await openPermissionsTabAndSelectOne(user);

    const submitButton = screen.getByRole("button", { name: /create role/i });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText(/select a workspace before creating a role/i),
    ).toBeInTheDocument();

    // Defense in depth: even a raw form submit (bypassing the disabled
    // button, e.g. pressing Enter in a text field) must not attempt a
    // create — this exercises handleSubmit's own guard, not just the
    // disabled attribute.
    const form = submitButton.closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Select a workspace before creating a role",
      );
    });

    const postCalls = fetchMock.mock.calls.filter(([, init]) => {
      const i = init as RequestInit | undefined;
      return i?.method === "POST";
    });
    expect(postCalls).toHaveLength(0);
  });

  it("enables Create Role and POSTs with the real workspaceId once one is selected", async () => {
    const user = userEvent.setup();
    // mockWorkspace already set to workspace-123 in beforeEach.

    render(<RoleModal open={true} onClose={vi.fn()} />, {
      wrapper: TestWrapper,
    });

    await user.type(await screen.findByLabelText(/role name/i), "Test Role");
    await openPermissionsTabAndSelectOne(user);

    const submitButton = screen.getByRole("button", { name: /create role/i });
    expect(submitButton).not.toBeDisabled();
    expect(
      screen.queryByText(/select a workspace before creating a role/i),
    ).not.toBeInTheDocument();

    await user.click(submitButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => {
        const i = init as RequestInit | undefined;
        return i?.method === "POST";
      });
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall?.[1] as RequestInit).body as string);
      expect(body.workspaceId).toBe("workspace-123");
    });
  });
});
