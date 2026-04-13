// @epic-3.4-teams: Team member update mutation hook
// @persona-sarah: PM needs to change member roles
// @persona-david: Team lead needs to manage member status

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from '@/lib/toast';

export interface UpdateTeamMemberRequest {
  teamId: string;
  memberEmail: string;
  role?: "workspace-manager" | "department-head" | "project-manager" | 
         "team-lead" | "member" | "client" | "contractor" | 
         "stakeholder" | "workspace-viewer" | "project-viewer" | "guest";
  status?: "active" | "pending" | "inactive";
}

export interface UpdateTeamMemberResponse {
  message: string;
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, memberEmail, ...updateData }: UpdateTeamMemberRequest): Promise<UpdateTeamMemberResponse> => {
      const response = await fetchApi(`/team/${teamId}/members/${memberEmail}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate teams list and specific team details to refetch with updated member
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.teamId] });
      
      // Show success toast
      const action = variables.role ? "role updated" : "status updated";
      toast.success(`Member ${variables.memberEmail} ${action} successfully`);
    },
    onError: (error: Error) => {
      console.error("Failed to update team member:", error);
      toast.error(error.message || "Failed to update team member");
    },
  });
}