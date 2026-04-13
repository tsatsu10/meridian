import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface UpdateTeamData {
  teamId: string;
  name?: string;
  description?: string;
  projectId?: string | null;
  settings?: any;
  workspaceId: string;
}

// @epic-3.4-teams: Hook for updating team details
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, workspaceId, ...data }: UpdateTeamData) => {
      const response = await fetchApi(`/team/${teamId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      toast.success("Team updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update team");
    },
  });
}
