import { looseClient } from "@/lib/rpc-client";

async function exportTasks(projectId: string) {
  const response = await looseClient.task.export[":projectId"].$get({
    param: { projectId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default exportTasks;
