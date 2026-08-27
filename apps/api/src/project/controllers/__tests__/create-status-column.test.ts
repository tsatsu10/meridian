import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockDb,
  mockProjects,
  resetMockDb,
} from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../../../utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const ensureDefaultColumns = vi.fn();
vi.mock("../../utils/default-columns", () => ({
  ensureDefaultColumns: (projectId: string) => ensureDefaultColumns(projectId),
}));

const mockDb = createMockDb();

describe("createStatusColumn", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.query.projectTable.findFirst.mockResolvedValue(
      mockProjects.activeProject,
    );
    mockDb.returning.mockResolvedValue([
      {
        id: "new-col",
        projectId: "project-1",
        name: "New Column",
        position: 1,
        isDefault: false,
      },
    ]);
  });

  // Regression: the three default columns used to be virtual (hardcoded at
  // positions 0/1/2 in get-tasks.ts, never rows in status_columns), so they
  // could not be shifted to make room. A new column asking for position 1
  // tied with "In Progress" and lost the stable sort, landing behind every
  // default instead of beside the column it was created from.
  it("normalises the project's columns before deciding where to insert", async () => {
    mockDb.__setSelectResults([], []);

    const { default: createStatusColumn } = await import(
      "../create-status-column"
    );

    await createStatusColumn({
      projectId: "project-1",
      name: "New Column",
      position: 1,
    });

    expect(ensureDefaultColumns).toHaveBeenCalledWith("project-1");
  });

  it("shifts every column at or after the requested position to make room", async () => {
    // Post-normalisation state: To Do(0), In Progress(1), Done(2).
    // Inserting at 1 must push In Progress and Done rightwards.
    mockDb.__setSelectResults([
      { id: "row-in-progress", name: "In Progress", position: 1 },
      { id: "row-done", name: "Done", position: 2 },
    ]);

    const { default: createStatusColumn } = await import(
      "../create-status-column"
    );

    await createStatusColumn({
      projectId: "project-1",
      name: "New Column",
      position: 1,
    });

    // Highest position first, so the updates never collide mid-flight.
    const newPositions = mockDb.set.mock.calls.map(
      (call) => (call[0] as { position: number }).position,
    );
    expect(newPositions).toEqual([3, 2]);

    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as {
      position: number;
      isDefault: boolean;
    };
    expect(inserted.position).toBe(1);
    expect(inserted.isDefault).toBe(false);
  });

  // Normalising a project renumbers its columns, so a position the client
  // derived from the board it was looking at can be stale by the time it
  // arrives. Anchoring on the column's id instead is immune to that.
  it("resolves insertAfterColumnId after normalisation rather than trusting a client position", async () => {
    mockDb.query.statusColumnTable.findFirst.mockResolvedValue({
      id: "row-adding",
      name: "adding",
      position: 2, // renumbered from 0 by ensureDefaultColumns
      isDefault: false,
    });
    mockDb.__setSelectResults([]);

    const { default: createStatusColumn } = await import(
      "../create-status-column"
    );

    await createStatusColumn({
      projectId: "project-1",
      name: "New Column",
      insertAfterColumnId: "row-adding",
    });

    expect(ensureDefaultColumns).toHaveBeenCalledWith("project-1");
    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as {
      position: number;
    };
    expect(inserted.position).toBe(3);
  });

  it("rejects an insertAfterColumnId that isn't in this project", async () => {
    mockDb.query.statusColumnTable.findFirst.mockResolvedValue(undefined);

    const { default: createStatusColumn } = await import(
      "../create-status-column"
    );

    await expect(
      createStatusColumn({
        projectId: "project-1",
        name: "New Column",
        insertAfterColumnId: "not-a-column",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("appends after the last column when no position is requested", async () => {
    mockDb.__setSelectResults([
      { position: 0 },
      { position: 1 },
      { position: 2 },
    ]);

    const { default: createStatusColumn } = await import(
      "../create-status-column"
    );

    await createStatusColumn({ projectId: "project-1", name: "New Column" });

    const inserted = mockDb.values.mock.calls.at(-1)?.[0] as {
      position: number;
    };
    expect(inserted.position).toBe(3);
  });
});
