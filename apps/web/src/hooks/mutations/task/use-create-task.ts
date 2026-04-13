import createTask, {
  type CreateTaskRequest,
} from "@/fetchers/task/create-task";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";

function useCreateTask() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: ({
      title,
      description,
      userEmail,
      projectId,
      status,
      dueDate,
      priority,
      parentId,
      labels,
    }: CreateTaskRequest & { labels?: string[] }) =>
      createTask(
        title,
        description,
        projectId,
        userEmail ?? "",
        status,
        new Date(dueDate),
        priority,
        parentId,
      ),
    onSuccess: (data) => {
      // Invalidate all task-related queries to ensure calendar synchronization
      if (workspace?.id) {
        // Invalidate all-tasks queries (includes calendar views)
        queryClient.invalidateQueries({ 
          queryKey: ["all-tasks", workspace.id] 
        });
        queryClient.invalidateQueries({
          queryKey: ["all-tasks-stats", workspace.id],
        });
        
        // Invalidate project-specific task queries
        queryClient.invalidateQueries({ 
          queryKey: ["project-tasks"] 
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

export default useCreateTask;
