import type { CreateTaskRequest } from "@/fetchers/task/create-task";
import type { Task } from "@/types/task";

/**
 * Builds the create-task payload for "Duplicate" on the All Tasks page. A
 * duplicate should start identical to its source — including a missing due
 * date or assignee — not silently pick up today's date or whoever clicked
 * Duplicate just because those fields happened to be empty.
 */
export function buildDuplicateTaskPayload(
  task: Task,
  projectId: string,
): CreateTaskRequest {
  return {
    title: `${task.title} (Copy)`,
    description: task.description || "",
    projectId,
    userEmail: task.assigneeEmail ?? "",
    status: "todo",
    dueDate: task.dueDate,
    priority: task.priority || "medium",
    parentId: task.parentId || undefined,
  };
}
