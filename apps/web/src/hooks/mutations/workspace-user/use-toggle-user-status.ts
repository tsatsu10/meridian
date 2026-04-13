import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface ToggleUserStatusData {
  workspaceId: string;
  userEmail: string;
}

// @epic-3.4-teams: Hook for toggling workspace user status
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, userEmail }: ToggleUserStatusData) => {
      const response = await fetchApi(`/workspace-user/${workspaceId}/${userEmail}/toggle-status`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.workspaceId] });
      toast.success("User status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update user status");
    },
  });
}

