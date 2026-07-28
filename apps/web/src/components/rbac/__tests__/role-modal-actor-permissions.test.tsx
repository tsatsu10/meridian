/**
 * RoleModal actor-permission source of truth.
 *
 * role-modal.tsx used to disable a permission checkbox whenever
 * rbacUser.permissions[permission] wasn't true. rbacUser.permissions is
 * built from this frontend's own copy of the role matrix
 * (lib/permissions/definitions.ts), which is missing 20 of the backend's
 * 157 permission keys (canViewProjects among them) — those permissions
 * rendered permanently dimmed and ungrantable for every user, including
 * workspace-manager, purely because the frontend list never had them.
 *
 * The fix reads GET /api/rbac/roles (the backend's own matrix) instead of
 * rbacUser.permissions, and FAILS OPEN (leaves checkboxes enabled) if that
 * query errors or the actor's role has no entry in it — disabling is a UX
 * affordance, not the real security boundary, which lives server-side in
 * createRole/updateRole and is unaffected either way.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { RoleModal } from "../role-modal";

let mockRole: string | undefined = "workspace-manager";
let matrixShouldFail = false;

vi.mock("@/store/workspace", () => ({
  default: () => ({
    workspace: { id: "workspace-123", name: "Test", slug: "test" },
  }),
}));

vi.mock("@/lib/permissions", () => ({
  useRBACAuth: () => ({ user: mockRole ? { role: mockRole } : null }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stand-in for the backend's 157-key matrix: includes a permission
// (canViewProjects) that the OLD frontend matrix never had at all, plus one
// the actor explicitly does not hold (canManageRoles: false), to prove
// per-permission disabling still works for permissions the matrix DOES
// cover.
const MATRIX_RESPONSE = {
  "workspace-manager": {
    canViewTasks: true,
    canViewProjects: true,
    canManageRoles: false,
  },
};

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

async function openPermissionsTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^permissions$/i }));
}

async function findPermissionCheckbox(name: string): Promise<HTMLElement> {
  const label = (await screen.findByText(name)).closest("label");
  if (!label) throw new Error(`label for ${name} not found`);
  const checkbox = label.querySelector("input[type='checkbox']");
  if (!checkbox) throw new Error(`checkbox for ${name} not found`);
  return checkbox as HTMLElement;
}

describe("RoleModal actor-permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = "workspace-manager";
    matrixShouldFail = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        if (url.includes("/roles/permissions/all")) {
          return {
            ok: true,
            json: async () => ({
              permissions: [
                "canViewTasks",
                "canViewProjects",
                "canManageRoles",
              ],
            }),
          };
        }
        if (url.includes("/rbac/roles")) {
          if (matrixShouldFail) {
            return { ok: false, json: async () => ({ error: "boom" }) };
          }
          return { ok: true, json: async () => MATRIX_RESPONSE };
        }
        throw new Error(`Unexpected fetch in test: ${url}`);
      }),
    );
  });

  it("enables a permission missing from the old frontend matrix once the backend matrix grants it", async () => {
    const user = userEvent.setup();
    render(<RoleModal open={true} onClose={vi.fn()} />, {
      wrapper: TestWrapper,
    });
    await openPermissionsTab(user);

    const checkbox = await findPermissionCheckbox("canViewProjects");
    await waitFor(() => expect(checkbox).not.toBeDisabled());
  });

  it("disables a permission the actor's matrix entry marks false", async () => {
    const user = userEvent.setup();
    render(<RoleModal open={true} onClose={vi.fn()} />, {
      wrapper: TestWrapper,
    });
    await openPermissionsTab(user);

    const checkbox = await findPermissionCheckbox("canManageRoles");
    await waitFor(() => expect(checkbox).toBeDisabled());
  });

  it("fails open (leaves checkboxes enabled) when the matrix query errors", async () => {
    matrixShouldFail = true;
    const user = userEvent.setup();
    render(<RoleModal open={true} onClose={vi.fn()} />, {
      wrapper: TestWrapper,
    });
    await openPermissionsTab(user);

    // canManageRoles would be disabled if the matrix had loaded (previous
    // test) — with the query failed, it must stay enabled instead.
    const checkbox = await findPermissionCheckbox("canManageRoles");
    await waitFor(() => expect(checkbox).not.toBeDisabled());
  });

  it("fails open when the actor's role has no entry in the matrix (e.g. a custom role)", async () => {
    mockRole = "some-custom-role-id";
    const user = userEvent.setup();
    render(<RoleModal open={true} onClose={vi.fn()} />, {
      wrapper: TestWrapper,
    });
    await openPermissionsTab(user);

    const checkbox = await findPermissionCheckbox("canManageRoles");
    await waitFor(() => expect(checkbox).not.toBeDisabled());
  });
});
