/**
 * RBACProvider fetched the caller's real role from the backend, then
 * unconditionally overwrote it: "🚀 FORCE WORKSPACE MANAGER FOR TESTING" /
 * "🚀 PERMISSION OVERRIDE: Grant all permissions" hardcoded every logged-in
 * user's UI role to workspace-manager with every permission set to true,
 * regardless of what the backend actually returned. This didn't grant real
 * backend access (the server enforces RBAC independently), but it meant the
 * entire UI misrepresented every user's actual entitlements.
 *
 * This proves a plain "member" backend role now surfaces as "member" in the
 * UI, with a workspace-manager-only permission (canManageWorkspace) false —
 * not silently promoted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RBACProvider } from "../provider";
import { useRBACAuth } from "../context";

const mockAuthUser = {
  id: "member-user-1",
  email: "member@example.com",
  name: "Member User",
};

vi.mock("@/components/providers/auth-provider/hooks/use-auth", () => ({
  default: () => ({ user: mockAuthUser, setUser: vi.fn() }),
}));

function RoleProbe() {
  const { user } = useRBACAuth();
  return (
    <div>
      <span data-testid="role">{user?.role ?? "loading"}</span>
      <span data-testid="can-manage-workspace">
        {String(user?.permissions?.canManageWorkspace ?? "loading")}
      </span>
    </div>
  );
}

describe("RBACProvider surfaces the real backend role", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          assignments: [{ isActive: true, role: "member" }],
        }),
      }),
    );
  });

  it("does not force every user to workspace-manager with all permissions", async () => {
    render(
      <RBACProvider>
        <RoleProbe />
      </RBACProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("role").textContent).toBe("member");
    });

    expect(screen.getByTestId("can-manage-workspace").textContent).toBe(
      "false",
    );
  });
});
