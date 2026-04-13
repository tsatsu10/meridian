import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface TeamMemberMetrics {
  userId: string;
  teamId: string;
  workload: number;
  performance: number;
  tasksCompleted: number;
  currentTasks: number;
}

// @epic-3.4-teams: Hook for fetching team member metrics
export function useTeamMetrics(workspaceId: string) {
  return useQuery({
    queryKey: ["team-metrics", workspaceId],
    queryFn: async () => {
      const response = await fetchApi(`/team/${workspaceId}/metrics`);
      const metrics = (response?.metrics || []) as TeamMemberMetrics[];
      return metrics;
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds - metrics can be slightly stale
  });
}

