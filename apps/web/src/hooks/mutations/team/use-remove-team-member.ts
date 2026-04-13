// @epic-3.4-teams: Team member removal mutation hook
// @persona-sarah: PM needs to remove members from teams
// @persona-david: Team lead needs to manage team membership

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from '@/lib/toast';

export interface RemoveTeamMemberResponse {
  message: string;
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, memberEmail }: { teamId: string; memberEmail: string }): Promise<RemoveTeamMemberResponse> => {
      const response = await fetchApi(`/team/${teamId}/members/${memberEmail}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate teams list and specific team details to refetch without removed member
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.teamId] });
      
      // Show success toast
      toast.success(`Member ${variables.memberEmail} removed from team successfully`);
    },
    onError: (error: Error) => {
      console.error("Failed to remove team member:", error);
      toast.error(error.message || "Failed to remove team member");
    },
  });
}