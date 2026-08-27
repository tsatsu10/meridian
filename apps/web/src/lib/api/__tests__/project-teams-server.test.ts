import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamsAPI } from "../project-teams-server";

// Regression: this client read a Bearer token from localStorage/
// sessionStorage that the real sign-in flow never populates (the app
// authenticates via an HttpOnly session cookie) and never set
// credentials: "include" to send that cookie either — so every call was
// cross-origin and unauthenticated, and GET /api/projects/:projectId/teams
// 401'd in the browser.
describe("TeamsAPI auth", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the session cookie instead of a Bearer token", async () => {
    await TeamsAPI.getProjectTeams("project-1");

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(options.credentials).toBe("include");
    expect(options.headers?.Authorization).toBeUndefined();
  });
});
