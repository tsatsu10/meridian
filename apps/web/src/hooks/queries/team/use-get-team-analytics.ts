import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface TaskTrend {
  date: string;
  completed: number;
  created: number;
}

export interface MemberProductivity {
  memberId: string;
  memberName: string;
  tasksCompleted: number;
  tasksInProgress: number;
  totalTasks: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface PriorityDistribution {
  priority: string;
  count: number;
}

export interface TeamAnalytics {
  timeRange: string;
  taskTrend: TaskTrend[];
  memberProductivity: MemberProductivity[];
  statusDistribution: StatusDistribution[];
  priorityDistribution: PriorityDistribution[];
}

// @epic-3.4-teams: Hook for fetching team analytics dashboard data
export function useGetTeamAnalytics(
  teamId: string | undefined,
  timeRange: "7d" | "30d" | "90d" | "all" = "7d"
) {
  return useQuery<{ analytics: TeamAnalytics }>({
    queryKey: ["team-analytics", teamId, timeRange],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const response = await fetchApi(`/team/${teamId}/analytics?range=${timeRange}`);
      return response;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

