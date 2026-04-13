import { client } from "@meridian/libs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateDependencyParams {
  taskId: string;
  requiredTaskId: string;
  type?: 'blocks' | 'blocked_by';
}

async function createDependency({ taskId, requiredTaskId, type = 'blocks' }: CreateDependencyParams) {
  const response = await client.task[":taskId"].dependencies.$post({
    param: { taskId },
    json: { requiredTaskId, type },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

function useCreateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDependency,
    onSuccess: (_, variables) => {
      // Invalidate dependencies for both tasks
      queryClient.invalidateQueries({
        queryKey: ["task-dependencies", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-dependencies", variables.requiredTaskId],
      });
      // Invalidate tasks list to refresh dependency indicators
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
}

export default useCreateDependency; 