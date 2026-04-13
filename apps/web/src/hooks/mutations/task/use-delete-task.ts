import deleteTask from "@/fetchers/task/delete-task";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";

function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      if (workspace?.id) {
        queryClient.invalidateQueries({ queryKey: ["all-tasks", workspace.id] });
        queryClient.invalidateQueries({ queryKey: ["all-tasks-stats", workspace.id] });
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
  });
}

export default useDeleteTask;
