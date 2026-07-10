import { client } from "@meridian/libs";

async function exportTasks(projectId: string) {
  const response = await (client as any).task.export[":projectId"].$get({
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
