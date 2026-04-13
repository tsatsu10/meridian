import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface Integration {
  id: string;
  name: string;
  provider: string;
  workspaceId: string;
  config: any;
  status: string;
  lastSync: Date | null;
  syncStatus: string | null;
  errorMessage: string | null;
  metadata: any;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

// @epic-3.4-teams: Hook for fetching team integrations
export function useGetTeamIntegrations(teamId: string | undefined) {
  return useQuery<{ integrations: Integration[] }>({
    queryKey: ["team-integrations", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const response = await fetchApi(`/team/${teamId}/integrations`);
      return response;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

