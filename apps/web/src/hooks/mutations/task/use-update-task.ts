import updateTask from "@/fetchers/task/update-task";
import type Task from "@/types/task";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";

function useUpdateTask() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (task: Task) => updateTask(task.id, task),
    onSuccess: (_, variables) => {
      // Invalidate specific task
      queryClient.invalidateQueries({
        queryKey: ["task", variables.id],
      });
      
      // Invalidate project tasks
      queryClient.refetchQueries({
        queryKey: ["tasks", variables.projectId],
      });
      
      // Invalidate notifications
      queryClient.refetchQueries({
        queryKey: ["notifications"],
      });

      // Invalidate all calendar-related queries for real-time synchronization
      if (workspace?.id) {
        // Invalidate all-tasks queries (includes calendar views)
        queryClient.invalidateQueries({ 
          queryKey: ["all-tasks", workspace.id] 
        });
        queryClient.invalidateQueries({
          queryKey: ["all-tasks-stats", workspace.id],
        });
        
        // Invalidate project data that might contain task counts
        queryClient.invalidateQueries({ 
          queryKey: ["project"] 
        });
        
        // Invalidate workspace dashboard data
        queryClient.invalidateQueries({ 
          queryKey: ["workspace", workspace.id] 
        });

        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);

        // Invalidate any team calendar data
        queryClient.invalidateQueries({ 
          queryKey: ["team-calendar"] 
        });
      }
    },
  });
}

export default useUpdateTask;
