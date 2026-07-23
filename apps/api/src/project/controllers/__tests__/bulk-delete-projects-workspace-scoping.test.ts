/**
 * Regression: bulkDeleteProjects took a bare projectIds array and deleted
 * exactly those rows with zero workspace verification — an authenticated
 * user of ANY workspace could delete projects belonging to a workspace they
 * have no membership in, given only the project id. The single-project
 * DELETE /:projectId route (delete-project.ts) always required and verified
 * a workspaceId; this bulk sibling never did. Nothing in the UI called this
 * endpoint before now, so the gap was dormant — wiring a real "Delete
 * Completed Projects" button to it is exactly what makes it reachable, so
 * the workspace check has to land first.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { bulkDeleteProjects } from "../bulk-operations";
import {
  createMockDb,
  mockProjects,
  resetMockDb,
} from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("bulkDeleteProjects workspace scoping", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("deletes nothing and reports failure when a project belongs to a different workspace", async () => {
    const foreignProject = {
      ...mockProjects.activeProject,
      id: "project-foreign",
      workspaceId: "someone-elses-workspace",
    };
    mockDb.query.projectTable.findMany.mockResolvedValue([foreignProject]);

    const result = await bulkDeleteProjects({
      projectIds: ["project-foreign"],
      workspaceId: "my-workspace",
    });

    expect(result.success).toBe(false);
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("deletes nothing when a requested project id doesn't exist at all", async () => {
    mockDb.query.projectTable.findMany.mockResolvedValue([]); // none found

    const result = await bulkDeleteProjects({
      projectIds: ["ghost-project"],
      workspaceId: "my-workspace",
    });

    expect(result.success).toBe(false);
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("refuses a mixed batch (some in-workspace, some not) rather than partially deleting", async () => {
    const ownProject = {
      ...mockProjects.activeProject,
      id: "project-mine",
      workspaceId: "my-workspace",
    };
    const foreignProject = {
      ...mockProjects.activeProject,
      id: "project-foreign",
      workspaceId: "someone-elses-workspace",
    };
    mockDb.query.projectTable.findMany.mockResolvedValue([
      ownProject,
      foreignProject,
    ]);

    const result = await bulkDeleteProjects({
      projectIds: ["project-mine", "project-foreign"],
      workspaceId: "my-workspace",
    });

    expect(result.success).toBe(false);
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("deletes when every project genuinely belongs to the given workspace", async () => {
    const ownProjects = [
      {
        ...mockProjects.activeProject,
        id: "project-a",
        workspaceId: "my-workspace",
      },
      {
        ...mockProjects.activeProject,
        id: "project-b",
        workspaceId: "my-workspace",
      },
    ];
    mockDb.query.projectTable.findMany.mockResolvedValue(ownProjects);
    mockDb.delete.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.returning.mockResolvedValue(ownProjects);

    const result = await bulkDeleteProjects({
      projectIds: ["project-a", "project-b"],
      workspaceId: "my-workspace",
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
