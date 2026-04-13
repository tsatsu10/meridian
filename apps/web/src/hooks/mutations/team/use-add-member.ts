import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface AddMemberData {
  teamId: string;
  userId: string;
  role?: string;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for adding a member to a team
export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userId, role, workspaceId }: AddMemberData) => {
      const response = await fetchApi(`/team/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["team-metrics", variables.workspaceId] });
      toast.success("Member added successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to add member");
    },
  });
}

