import { describe, expect, it, vi } from "vitest";

const subscribeToEvent = vi.fn();

vi.mock("../../events", () => ({
  subscribeToEvent,
  publishEvent: vi.fn(),
}));

describe("workspace-user event subscriptions", () => {
  it("subscribes to user.signed_up but not workspace.created", async () => {
    // Regression: create-workspace.ts already inserts the owner's
    // workspace_members row (+ role assignment + role history) directly
    // and synchronously before publishing "workspace.created". A
    // subscriber here calling createRootWorkspaceUser for the same
    // workspace+user pair always violated the unique index on
    // (workspace_id, user_id) — confirmed live via a failed insert on
    // every single workspace creation. The subscription was removed;
    // createRootWorkspaceUser itself is kept for the explicit POST /root
    // admin route.
    await import("../index");

    const subscribedEvents = subscribeToEvent.mock.calls.map((call) => call[0]);
    expect(subscribedEvents).toContain("user.signed_up");
    expect(subscribedEvents).not.toContain("workspace.created");
  });
});
