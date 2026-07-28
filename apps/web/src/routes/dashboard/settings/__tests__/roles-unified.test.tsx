/**
 * Roles & Permissions page — clone workspace guard.
 *
 * POST /roles/:id/clone requires workspaceId: z.string().min(1). If
 * `workspace` is undefined when this page renders (the same condition
 * Create Role was fixed for in role-modal.tsx), clicking Clone used to POST
 * { name, workspaceId: "" } and let the server 400 with a raw error toast
 * instead of the clear pre-flight message the other write paths give. This
 * proves handleCloneRole refuses to fire the mutation without a workspace
 * id, surfaces the same clear message, and that the Clone control itself is
 * disabled in that state; and, as a discriminating positive control, that
 * cloning still works once a workspace is selected.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { UnifiedRolesPage } from "../roles-unified";

let mockWorkspace: { id: string; name: string; slug: string } | undefined = {
  id: "workspace-123",
  name: "Test Workspace",
  slug: "test-workspace",
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/components/dashboard/universal-error-boundary", () => ({
  withErrorBoundary: (Component: React.ComponentType) => Component,
}));

vi.mock("@/store/workspace", () => ({
  default: () => ({ workspace: mockWorkspace }),
}));

vi.mock("@/components/rbac/role-modal", () => ({
  RoleModal: () => null,
}));

// Minimal stand-in for RoleCard: exposes exactly what this page's own logic
// (handleCloneRole / cloneDisabled) needs to be exercised, without pulling
// in RoleCard's own Radix dropdown-menu rendering. The button deliberately
// does NOT use the native `disabled` attribute (which would make userEvent
// refuse to click it, the same way a real disabled DropdownMenuItem blocks
// selection) — it exposes `cloneDisabled` as a data attribute instead, so
// the test can both (a) assert the page forwarded the flag correctly and
// (b) still click through to prove handleCloneRole's OWN guard refuses the
// clone, independent of the control being visually disabled. RoleCard's
// real disabled-menu-item rendering is Radix's own primitive behavior and
// is not re-verified here.
vi.mock("@/components/rbac/role-card", () => ({
  RoleCard: ({
    role,
    onClone,
    cloneDisabled,
  }: {
    role: { id: string; name: string };
    onClone?: (role: { id: string; name: string }) => void;
    cloneDisabled?: boolean;
  }) => (
    <div>
      <span>{role.name}</span>
      <button
        type="button"
        data-clone-disabled={cloneDisabled ? "true" : "false"}
        onClick={() => onClone?.(role)}
      >
        Clone {role.name}
      </button>
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ROLES_RESPONSE = {
  roles: [
    {
      id: "role-1",
      name: "Custom Role",
      description: null,
      type: "custom",
      color: "#3B82F6",
      usersCount: 0,
      lastUsedAt: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
};

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

describe("Roles & Permissions page clone workspace guard", () => {
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
      if (method === "GET" && url.includes("/roles")) {
        return { ok: true, json: async () => ROLES_RESPONSE };
      }
      if (method === "POST" && url.includes("/clone")) {
        return { ok: true, json: async () => ({ role: { id: "role-2" } }) };
      }
      throw new Error(`Unexpected fetch in test: ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("marks Clone disabled and does not POST when no workspace is selected", async () => {
    const user = userEvent.setup();
    mockWorkspace = undefined;
    const { toast } = await import("sonner");

    render(<UnifiedRolesPage />, { wrapper: TestWrapper });

    const cloneButton = await screen.findByRole("button", {
      name: /clone custom role/i,
    });
    // Proves the page forwarded cloneDisabled correctly (RoleCard's own
    // Radix disabled-menu-item rendering is a separate, unverified-here
    // primitive concern — see the mock's comment above).
    expect(cloneButton).toHaveAttribute("data-clone-disabled", "true");

    // Click anyway: this exercises handleCloneRole's OWN guard, the actual
    // behavior under test, independent of the control's visual disabled
    // state (same reasoning as role-modal.test.tsx's raw form-submit case).
    await user.click(cloneButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Select a workspace before cloning a role",
      );
    });
    expect(window.prompt).not.toHaveBeenCalled();
    const cloneCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/clone"),
    );
    expect(cloneCalls).toHaveLength(0);
  });

  it("clones successfully once a workspace is selected", async () => {
    const user = userEvent.setup();
    // mockWorkspace already set to workspace-123 in beforeEach.

    render(<UnifiedRolesPage />, { wrapper: TestWrapper });

    const cloneButton = await screen.findByRole("button", {
      name: /clone custom role/i,
    });
    expect(cloneButton).toHaveAttribute("data-clone-disabled", "false");

    await user.click(cloneButton);

    await waitFor(() => {
      const cloneCall = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("/clone"),
      );
      expect(cloneCall).toBeDefined();
      const body = JSON.parse((cloneCall?.[1] as RequestInit).body as string);
      expect(body.workspaceId).toBe("workspace-123");
      expect(body.name).toBe("Custom Role (Copy)");
    });
  });
});
