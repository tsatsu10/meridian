import duplicateTask, {
  type DuplicateTaskRequest,
} from "@/fetchers/task/duplicate-task";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "@/lib/toast";

function useDuplicateTask() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: ({ taskId }: DuplicateTaskRequest) =>
      duplicateTask(taskId),
    onSuccess: (data) => {
      // Show success message with the duplicated task title
      toast.success(`Task duplicated successfully: "${data.data.title}"`);

      // Invalidate all task-related queries to ensure data consistency
      if (workspace?.id) {
        // Invalidate all-tasks queries (includes calendar views)
        queryClient.invalidateQueries({
          queryKey: ["all-tasks", workspace.id]
        });

        // Invalidate project-specific task queries
        queryClient.invalidateQueries({
          queryKey: ["project-tasks"]
        });

        // Invalidate specific project data that might contain task counts
        queryClient.invalidateQueries({
          queryKey: ["project", data.data.projectId]
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

        // Invalidate task dependencies in case the original had any
        queryClient.invalidateQueries({
          queryKey: ["task-dependencies"]
        });
      }
    },
    onError: (error) => {
      // Show error message
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to duplicate task";
      toast.error(errorMessage);
    },
  });
}

export default useDuplicateTask;