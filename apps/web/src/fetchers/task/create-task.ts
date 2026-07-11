import { looseClient } from "@/lib/rpc-client";

// The generated AppType is missing task[":projectId"], so type the request locally
export type CreateTaskRequest = {
  title: string;
  description: string;
  projectId: string;
  userEmail?: string | null;
  status: string;
  dueDate: string;
  priority: string;
  parentId?: string;
};

async function createTask(
  title: string,
  description: string,
  projectId: string,
  userEmail: string,
  status: string,
  dueDate: Date,
  priority: string,
  parentId?: string,
) {
  const response = await looseClient.task[":projectId"].$post({
    json: {
      title,
      description,
      userEmail,
      status,
      dueDate: dueDate.toISOString(),
      priority,
      parentId,
    },
    param: { projectId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default createTask;
