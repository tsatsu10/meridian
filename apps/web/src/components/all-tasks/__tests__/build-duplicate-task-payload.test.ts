import { describe, it, expect } from "vitest";
import { buildDuplicateTaskPayload } from "../build-duplicate-task-payload";
import type { Task } from "@/types/task";

/**
 * Regression: the "Duplicate" action on the All Tasks page used to build
 * this payload inline with `task.dueDate ?? new Date().toISOString()` and
 * a hardcoded `userEmail: user?.email`. A task with no due date or no
 * assignee would come out of "duplicate" with today's date and assigned to
 * whoever clicked the button — silently picking up values the original
 * task never had. Confirmed live: duplicating a real no-due-date,
 * unassigned task produced a copy due today and assigned to the current
 * user, which then rendered as "Overdue".
 */
function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "No due date task",
    description: "some description",
    dueDate: null,
    priority: "medium",
    status: "todo",
    parentId: null,
    assigneeEmail: null,
    project: { id: "p1" },
    ...overrides,
  } as Task;
}

describe("buildDuplicateTaskPayload", () => {
  it("preserves a missing due date instead of defaulting to now", () => {
    const payload = buildDuplicateTaskPayload(baseTask(), "p1");
    expect(payload.dueDate).toBeNull();
  });

  it("preserves an unassigned task instead of assigning it to the duplicator", () => {
    const payload = buildDuplicateTaskPayload(baseTask(), "p1");
    expect(payload.userEmail).toBe("");
  });

  it("preserves the original due date and assignee when the source task has them", () => {
    const payload = buildDuplicateTaskPayload(
      baseTask({
        dueDate: "2026-08-01T00:00:00.000Z",
        assigneeEmail: "bob@example.com",
      }),
      "p1",
    );
    expect(payload.dueDate).toBe("2026-08-01T00:00:00.000Z");
    expect(payload.userEmail).toBe("bob@example.com");
  });

  it("titles the copy and resets status to todo", () => {
    const payload = buildDuplicateTaskPayload(
      baseTask({ status: "done" }),
      "p1",
    );
    expect(payload.title).toBe("No due date task (Copy)");
    expect(payload.status).toBe("todo");
  });
});
