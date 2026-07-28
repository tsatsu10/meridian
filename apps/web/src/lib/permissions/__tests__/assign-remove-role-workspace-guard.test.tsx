/**
 * assignRole / removeRole workspace guards.
 *
 * POST /rbac/assign requires workspaceId: z.string().min(1); DELETE
 * /rbac/remove/:userId requires a ?workspaceId= query param. Both are now
 * workspace-scoped server-side (assign always was; remove gained this
 * requirement after a cross-workspace privilege bug). There are currently
 * zero call sites for either function, so this proves the guard directly
 * against the context object rather than through any consuming UI: with no
 * workspaceId, neither function should call fetch at all — it should
 * refuse and surface a clear message instead of letting the server 400.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RBACProvider } from "../provider";
import { useRBACAuth } from "../context";

const mockAuthUser = {
  id: "user-1",
  email: "member@example.com",
  name: "Member User",
};

vi.mock("@/components/providers/auth-provider/hooks/use-auth", () => ({
  default: () => ({ user: mockAuthUser, setUser: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function Probe() {
  const { assignRole, removeRole } = useRBACAuth();
  return (
    <div>
      <button type="button" onClick={() => assignRole("user-2", "member")}>
        assign-no-ws
      </button>
      <button
        type="button"
        onClick={() => assignRole("user-2", "member", { workspaceId: "ws-1" })}
      >
        assign-with-ws
      </button>
      <button type="button" onClick={() => removeRole("user-2")}>
        remove-no-ws
      </button>
      <button
        type="button"
        onClick={() => removeRole("user-2", { workspaceId: "ws-1" })}
      >
        remove-with-ws
      </button>
    </div>
  );
}

describe("assignRole/removeRole workspace guard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.includes("/rbac/assignments/")) {
        // RBACProvider's own initial role load, on mount.
        return { ok: true, json: async () => ({ assignments: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  async function renderProbe() {
    render(
      <RBACProvider>
        <Probe />
      </RBACProvider>,
    );
    // Let the initial role-load effect settle before clearing the mock, so
    // its assignments fetch isn't mistaken for one triggered by a click.
    await waitFor(() => screen.getByText("assign-no-ws"));
    fetchMock.mockClear();
  }

  it("assignRole does not call the API when context.workspaceId is missing", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    await renderProbe();

    await user.click(screen.getByText("assign-no-ws"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot assign a role without a workspace: role assignment is workspace-scoped.",
      );
    });
    expect(
      fetchMock.mock.calls.some(([u]) => String(u).includes("/rbac/assign")),
    ).toBe(false);
  });

  it("assignRole calls the API when context.workspaceId is present", async () => {
    const user = userEvent.setup();
    await renderProbe();

    await user.click(screen.getByText("assign-with-ws"));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([u]) => String(u).includes("/rbac/assign")),
      ).toBe(true);
    });
  });

  it("removeRole does not call the API when context.workspaceId is missing", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    await renderProbe();

    await user.click(screen.getByText("remove-no-ws"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot remove a role without a workspace: role removal is workspace-scoped.",
      );
    });
    expect(
      fetchMock.mock.calls.some(([u]) => String(u).includes("/rbac/remove")),
    ).toBe(false);
  });

  it("removeRole calls the API with ?workspaceId= when context.workspaceId is present", async () => {
    const user = userEvent.setup();
    await renderProbe();

    await user.click(screen.getByText("remove-with-ws"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("/rbac/remove/"),
      );
      expect(call).toBeDefined();
      expect(String(call?.[0])).toContain("workspaceId=ws-1");
    });
  });
});
