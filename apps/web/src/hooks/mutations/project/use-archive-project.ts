import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/constants/urls";
import { toast } from "sonner";
import { invalidateWorkspaceProjectSurface } from "@/lib/dashboard/invalidate-workspace-project-surface";

interface ArchiveProjectParams {
  projectId: string;
  workspaceId: string;
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, workspaceId }: ArchiveProjectParams) => {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/archive?workspaceId=${workspaceId}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to archive project");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      invalidateWorkspaceProjectSurface(queryClient, variables.workspaceId);
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });

      toast.success(data.message || "Project archived successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive project: ${error.message}`);
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, workspaceId }: ArchiveProjectParams) => {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/restore?workspaceId=${workspaceId}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore project");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      invalidateWorkspaceProjectSurface(queryClient, variables.workspaceId);
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });

      toast.success(data.message || "Project restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore project: ${error.message}`);
    },
  });
}
