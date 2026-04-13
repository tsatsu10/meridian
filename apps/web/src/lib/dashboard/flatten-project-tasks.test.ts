import { describe, expect, it } from "vitest";
import { flattenTasksForProject, flattenTasksFromProjects } from "./flatten-project-tasks";

describe("flattenTasksForProject", () => {
  it("merges column tasks and root tasks without double-counting by id", () => {
    const project = {
      tasks: [{ id: "a", status: "done" }],
      columns: [{ tasks: [{ id: "a", status: "done" }, { id: "b", status: "pending" }] }],
    };
    const flat = flattenTasksForProject(project);
    expect(flat).toHaveLength(2);
    expect(flat.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("includes tasks without id from both sources", () => {
    const project = {
      tasks: [{ status: "pending" }],
      columns: [{ tasks: [{ status: "done" }] }],
    };
    expect(flattenTasksForProject(project)).toHaveLength(2);
  });
});

describe("flattenTasksFromProjects", () => {
  it("aggregates across projects", () => {
    const projects = [
      { tasks: [{ id: "1" }] },
      { columns: [{ tasks: [{ id: "2" }] }] },
    ];
    expect(flattenTasksFromProjects(projects)).toHaveLength(2);
  });
});
