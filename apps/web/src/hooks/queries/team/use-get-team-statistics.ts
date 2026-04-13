import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

interface TeamStatistics {
  memberCount: number;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    completionRate: number;
  };
  recentActivityCount: number;
  createdAt: Date;
}

// @epic-3.4-teams: Hook for fetching team statistics
export function useGetTeamStatistics(teamId: string | undefined) {
  return useQuery<{ statistics: TeamStatistics }>({
    queryKey: ["team-statistics", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const response = await fetchApi(`/team/${teamId}/statistics`);
      return response;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

