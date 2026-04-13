import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface Automation {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: any;
  actions: string;
  enabled: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

// @epic-3.4-teams: Hook for fetching team automations
export function useGetTeamAutomations(teamId: string | undefined) {
  return useQuery<{ automations: Automation[] }>({
    queryKey: ["team-automations", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const response = await fetchApi(`/team/${teamId}/automations`);
      return response;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

