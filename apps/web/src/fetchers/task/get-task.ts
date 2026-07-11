import { looseClient } from "@/lib/rpc-client";

async function getTask(taskId: string) {
  // The generated AppType is missing task[":id"], hence the cast
  const response = await looseClient.task[":id"].$get({
    param: { id: taskId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default getTask;
