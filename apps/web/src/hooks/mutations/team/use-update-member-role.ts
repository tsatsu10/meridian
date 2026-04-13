import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface UpdateMemberRoleData {
  teamId: string;
  userId: string;
  role: string;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for updating a member's role in a team
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userId, role, workspaceId }: UpdateMemberRoleData) => {
      const response = await fetchApi(`/team/${teamId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["team-metrics", variables.workspaceId] });
      toast.success("Member role updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update member role");
    },
  });
}

