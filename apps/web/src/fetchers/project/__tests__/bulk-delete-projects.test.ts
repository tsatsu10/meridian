import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import bulkDeleteProjects from "../bulk-delete-projects";

describe("bulkDeleteProjects", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to /api/projects/bulk/delete with projectIds and workspaceId", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, count: 2, items: [] }),
    });

    await bulkDeleteProjects({
      projectIds: ["p1", "p2"],
      workspaceId: "ws1",
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe("http://localhost:3005/api/projects/bulk/delete");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body as string)).toEqual({
      projectIds: ["p1", "p2"],
      workspaceId: "ws1",
      reason: undefined,
    });
  });

  it("throws when the backend rejects the batch (e.g. workspace mismatch)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        count: 0,
        items: [
          {
            id: "p1",
            status: "failed",
            error: "Project not found or does not belong to workspace",
          },
        ],
      }),
    });

    await expect(
      bulkDeleteProjects({ projectIds: ["p1"], workspaceId: "ws1" }),
    ).rejects.toThrow("Project not found or does not belong to workspace");
  });

  it("throws the server's error message on a non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Insufficient permissions" } }),
    });

    await expect(
      bulkDeleteProjects({ projectIds: ["p1"], workspaceId: "ws1" }),
    ).rejects.toThrow("Insufficient permissions");
  });
});
