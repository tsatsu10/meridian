import type Task from "@/types/task";

// The generated AppType is missing project[":id"] and task.tasks[":projectId"],
// so these mirror the API responses (apps/api project/get-project.ts and
// task/get-tasks.ts) instead of using InferResponseType.

/** GET /project/:id response. */
export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspaceId: string;
  ownerId: string | null;
  workspace: Record<string, unknown> | null;
  icon: string | null;
  color: string | null;
  status: string | null;
  priority: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  settings: Record<string, unknown> | null;
  isArchived: boolean | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ProjectColumn = {
  id: string;
  name: string;
  tasks: Task[];
  dbId?: string;
};

/** GET /task/tasks/:projectId response. */
export type ProjectWithTasks = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  workspaceId: string;
  columns: ProjectColumn[];
  archivedTasks: Task[];
  plannedTasks: Task[];
};

/** Projects hub / list rows (API list payload + optional owner display name). */
export type ProjectDashboardRow = ProjectWithTasks & {
  ownerName?: string;
};
