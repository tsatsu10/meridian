import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface ChangeUserRoleData {
  workspaceId: string;
  userEmail: string;
  role: string;
}

// @epic-3.4-teams: Hook for changing workspace user role
export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, userEmail, role }: ChangeUserRoleData) => {
      const response = await fetchApi(`/workspace-user/${workspaceId}/${userEmail}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      toast.success("User role changed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to change user role");
    },
  });
}

