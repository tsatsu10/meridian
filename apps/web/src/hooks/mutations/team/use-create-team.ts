import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface CreateTeamData {
  name: string;
  description?: string;
  workspaceId: string;
  projectId?: string;
  memberIds?: string[];
}

// @epic-3.4-teams: Hook for creating a new team
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeamData) => {
      const response = await fetchApi("/team", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["team-metrics", variables.workspaceId] });
      toast.success("Team created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create team");
    },
  });
}
