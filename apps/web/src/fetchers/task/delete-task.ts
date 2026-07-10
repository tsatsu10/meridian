import { client } from "@meridian/libs";

async function deleteTask(taskId: string) {
  // The generated AppType is missing task[":id"], hence the cast
  const response = await (client as any).task[":id"].$delete({ param: { id: taskId } });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default deleteTask;
