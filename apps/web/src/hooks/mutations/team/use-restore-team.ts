import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface RestoreTeamData {
  teamId: string;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for restoring an archived team
export function useRestoreTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, workspaceId }: RestoreTeamData) => {
      const response = await fetchApi(`/team/${teamId}/restore`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      toast.success("Team restored successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to restore team");
    },
  });
}

