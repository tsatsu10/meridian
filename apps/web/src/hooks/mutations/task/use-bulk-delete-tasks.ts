import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";
import { client } from "@meridian/libs";

function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      // Since we don't have a bulk delete API endpoint, we'll batch individual deletes
      const deletePromises = taskIds.map(async (taskId) => {
        const response = await client.task[":id"].$delete({ 
          param: { id: taskId } 
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to delete task ${taskId}: ${error}`);
        }

        return response.json();
      });

      return Promise.all(deletePromises);
    },
    onSuccess: (_, taskIds) => {
      // Remove tasks from cache
      taskIds.forEach(taskId => {
        queryClient.removeQueries({
          queryKey: ["task", taskId],
        });
      });
      
      // Invalidate all-tasks queries
      if (workspace?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ["all-tasks", workspace.id] 
        });
      }
      
      // Invalidate project tasks (we don't know which projects, so invalidate all)
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      
      // Invalidate notifications
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      // Invalidate workspace dashboard data
      if (workspace?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ["workspace", workspace.id] 
        });
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
    onError: (error) => {
      console.error("Bulk delete failed:", error);
    },
  });
}

export default useBulkDeleteTasks; 