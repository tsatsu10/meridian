import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteStatusColumn, { type DeleteStatusColumnRequest } from "@/fetchers/project/delete-status-column";

function useDeleteStatusColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteStatusColumnRequest) => deleteStatusColumn(data),
    onSuccess: (data, variables) => {
      // Invalidate tasks query to refetch with updated columns
      queryClient.invalidateQueries({ 
        queryKey: ["tasks", variables.projectId] 
      });
      
      // Invalidate all tasks query if it exists
      queryClient.invalidateQueries({ 
        queryKey: ["all-tasks"] 
      });
    },
  });
}

export default useDeleteStatusColumn; 