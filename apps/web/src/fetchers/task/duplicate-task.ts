import { fetchApi } from "@/lib/fetch";

export interface DuplicateTaskRequest {
  taskId: string;
}

export interface DuplicateTaskResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    number: number;
    description: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    projectId: string;
    userEmail: string | null;
    assignedTeamId: string | null;
    parentId: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    assigneeName?: string;
    assignedTeam?: {
      id: string;
      name: string;
    };
  };
  message: string;
}

async function duplicateTask(taskId: string): Promise<DuplicateTaskResponse> {
  const data = await fetchApi(`/task/duplicate/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return data;
}

export default duplicateTask;