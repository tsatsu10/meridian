// @epic-3.4-teams: Team member addition mutation hook
// @persona-sarah: PM needs to add members to project teams
// @persona-david: Team lead needs to manage team membership

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from '@/lib/toast';

export interface AddTeamMemberRequest {
  teamId: string;
  userEmail: string;
  role?: "workspace-manager" | "department-head" | "project-manager" | 
         "team-lead" | "member" | "client" | "contractor" | 
         "stakeholder" | "workspace-viewer" | "project-viewer" | "guest";
}

export interface AddTeamMemberResponse {
  message: string;
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userEmail, role = "member" }: AddTeamMemberRequest): Promise<AddTeamMemberResponse> => {
      const response = await fetchApi(`/team/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userEmail, role }),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate teams list and specific team details to refetch with new member
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.teamId] });
      
      // Show success toast
      toast.success(`Member ${variables.userEmail} added to team successfully`);
    },
    onError: (error: Error) => {
      console.error("Failed to add team member:", error);
      toast.error(error.message || "Failed to add team member");
    },
  });
}