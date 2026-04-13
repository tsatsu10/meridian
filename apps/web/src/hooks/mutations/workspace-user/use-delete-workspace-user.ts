import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface DeleteWorkspaceUserData {
  workspaceId: string;
  userEmail: string;
}

// @epic-3.4-teams: Hook for deleting workspace user
export function useDeleteWorkspaceUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, userEmail }: DeleteWorkspaceUserData) => {
      const response = await fetchApi(`/workspace-user/${workspaceId}?userEmail=${encodeURIComponent(userEmail)}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      toast.success("User removed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to remove user");
    },
  });
}
