import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface ArchiveTeamData {
  teamId: string;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for archiving a team (soft delete)
export function useArchiveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, workspaceId }: ArchiveTeamData) => {
      const response = await fetchApi(`/team/${teamId}/archive`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      toast.success("Team archived successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to archive team");
    },
  });
}

