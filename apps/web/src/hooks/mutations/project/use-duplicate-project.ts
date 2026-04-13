import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { invalidateWorkspaceProjectSurface } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";
import { logger } from "@/lib/logger";

export function useDuplicateProject() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }
      return fetchApi(`/project/${projectId}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
    },
    onSuccess: () => {
      if (workspace?.id) {
        invalidateWorkspaceProjectSurface(queryClient, workspace.id);
      }
    },
    onError: (err) => {
      logger.error("Duplicate project failed", { err });
    },
  });
}
