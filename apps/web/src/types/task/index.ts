import type { client } from "@meridian/libs";
import type { InferResponseType } from "hono/client";

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  position: number | null;
  number: number | null;
  userEmail: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  createdAt: string;
  // Additional frontend-specific fields
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  assignedTeamId?: string | null;
  assignedTeam?: {
    id: string;
    name: string;
  } | null;
  // Stats fields
  subtasks?: Task[];
  timeTracked?: string;
  comments?: { id: string }[];
}

export type SubtaskProgress = {
  completed: number;
  total: number;
  percentage: number;
};

export type TaskDependency = {
  id: string;
  dependentTaskId: string;
  requiredTaskId: string;
  type: 'blocks' | 'blocked_by';
  createdAt: string;
  // Related task info for display
  dependentTask?: Task;
  requiredTask?: Task;
};

export type TaskWithDependencies = Task & {
  dependencies?: TaskDependency[]; // Tasks this task blocks
  blockedBy?: TaskDependency[];    // Tasks that block this task
};

export type TaskWithSubtasks = Task & {
  subtasks?: TaskWithSubtasks[];
  subtaskProgress?: SubtaskProgress;
  dependencies?: TaskDependency[];
  blockedBy?: TaskDependency[];
};

export default Task;
