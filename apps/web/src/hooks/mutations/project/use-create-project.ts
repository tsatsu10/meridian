import createProject from "@/fetchers/project/create-project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateWorkspaceProjectSurface } from "@/lib/dashboard/invalidate-workspace-project-surface";

function useCreateProject({
  name,
  slug,
  workspaceId,
  icon,
}: { name: string; slug: string; workspaceId: string; icon: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createProject({ name, slug, workspaceId, icon }),
    onSuccess: () => {
      invalidateWorkspaceProjectSurface(queryClient, workspaceId);
    },
  });
}

export default useCreateProject;
