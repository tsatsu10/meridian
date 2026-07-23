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
  color?: string;
  position?: number;
  isDefault?: boolean;
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

export type ProjectMemberSummary = {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string;
};

/** GET /project (list) rows — full project row plus joined tasks/members. */
export type ProjectDashboardRow = Omit<Project, "workspace"> & {
  workspace: { id: string | null; name: string | null } | null;
  ownerName?: string;
  columns: ProjectColumn[];
  tasks: Task[];
  members: ProjectMemberSummary[];
  teamSize: number;
  plannedTasks: Task[];
  archivedTasks: Task[];
};
