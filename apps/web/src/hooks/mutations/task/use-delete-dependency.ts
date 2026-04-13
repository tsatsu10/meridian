import { client } from "@meridian/libs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function deleteDependency(dependencyId: string) {
  const response = await client.task.dependencies[":dependencyId"].$delete({
    param: { dependencyId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

function useDeleteDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDependency,
    onSuccess: () => {
      // Invalidate all task dependencies and tasks
      queryClient.invalidateQueries({
        queryKey: ["task-dependencies"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
}

export default useDeleteDependency; 