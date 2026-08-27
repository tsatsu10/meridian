import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";

interface AddTeamMemberData {
  teamId: string;
  userId: string;
  workspaceId: string;
  role?: string;
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role = "member",
    }: AddTeamMemberData) => {
      return fetchApi(`/team/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["teams", variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["team-metrics", variables.workspaceId],
      });
      toast.success("Member added to team");
    },
    onError: (error) => {
      toast.error(userMessage(error, "add the team member"));
    },
  });
}
