import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface RemoveMemberData {
  teamId: string;
  userId: string;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for removing a member from a team
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userId, workspaceId }: RemoveMemberData) => {
      const response = await fetchApi(`/team/${teamId}/members/${userId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["team-metrics", variables.workspaceId] });
      toast.success("Member removed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to remove member");
    },
  });
}

