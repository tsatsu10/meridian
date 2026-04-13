import { client } from "@meridian/libs";
import { useQuery } from "@tanstack/react-query";

async function getTaskDependencies(taskId: string) {
  const response = await client.task[":taskId"].dependencies.$get({
    param: { taskId },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch task dependencies");
  }

  return response.json();
}

function useGetTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ["task-dependencies", taskId],
    queryFn: () => getTaskDependencies(taskId),
    enabled: !!taskId,
  });
}

export default useGetTaskDependencies; 