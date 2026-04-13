import deleteProject from "@/fetchers/project/delete-project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateWorkspaceProjectSurface } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";

function useDeleteProject() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      if (workspace?.id) {
        invalidateWorkspaceProjectSurface(queryClient, workspace.id);
      }
    },
  });
}

export default useDeleteProject;
