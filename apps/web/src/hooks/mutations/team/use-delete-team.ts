import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface DeleteTeamData {
  teamId: string;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for deleting a team
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId }: DeleteTeamData) => {
      const response = await fetchApi(`/team/${teamId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["team-metrics", variables.workspaceId] });
      toast.success("Team deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete team");
    },
  });
}
