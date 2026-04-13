import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";

type BulkStatus = "todo" | "in_progress" | "done";

export function useBulkUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async (params: {
      taskIds: string[];
      status: BulkStatus;
      userId: string;
    }) => {
      return fetchApi("/task/bulk/status", {
        method: "POST",
        body: JSON.stringify({
          taskIds: params.taskIds,
          status: params.status,
          userId: params.userId,
        }),
      });
    },
    onSuccess: () => {
      if (workspace?.id) {
        queryClient.invalidateQueries({ queryKey: ["all-tasks", workspace.id] });
        queryClient.invalidateQueries({ queryKey: ["all-tasks-stats", workspace.id] });
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
  });
}
