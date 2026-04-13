import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import useWorkspaceStore from "@/store/workspace";

interface AnalyticsFilters {
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all";
  projectIds?: string[];
}

interface ProjectHealth {
  id: string;
  name: string;
  slug: string;
  completion: number;
  health: "good" | "warning" | "critical";
  tasksCompleted: number;
  totalTasks: number;
  teamSize: number;
  overdueTasks: number;
}

interface ResourceUtilization {
  userEmail: string;
  userName: string;
  taskCount: number;
  completedTasks: number;
  totalHours: number;
  productivity: number;
}

interface PerformanceBenchmarks {
  avgProjectCompletion: number;
  avgTaskCycleTime: number;
  teamVelocity: number;
  qualityScore: number;
  onTimeDelivery: number;
}

interface AnalyticsResponse {
  projectMetrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    projectsAtRisk: number;
  };
  taskMetrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
  };
  teamMetrics: {
    totalMembers: number;
    activeMembers: number;
    avgProductivity: number;
    teamEfficiency: number;
  };
  timeMetrics: {
    totalHours: number;
    billableHours: number;
    avgTimePerTask: number;
    timeUtilization: number;
  };
  projectHealth: ProjectHealth[];
  resourceUtilization: ResourceUtilization[];
  performanceBenchmarks: PerformanceBenchmarks;
  summary: {
    timeRange: string;
    generatedAt: string;
    totalProjects: number;
    totalTasks: number;
    totalMembers: number;
    overallHealth: number;
  };
}

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const { workspace } = useWorkspaceStore();

  const queryParams = new URLSearchParams();
  
  if (filters.timeRange) queryParams.append("timeRange", filters.timeRange);
  if (filters.projectIds?.length) queryParams.append("projectIds", filters.projectIds.join(","));

  return useQuery<AnalyticsResponse>({
    queryKey: ["analytics", workspace?.id, filters],
    queryFn: async () => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }

      const url = `/dashboard/analytics/${workspace.id}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      return fetchApi(url);
    },
    enabled: !!workspace?.id,
    staleTime: 300000, // 5 minutes - analytics data doesn't change frequently
    refetchOnWindowFocus: false,
  });
}

export default useAnalytics; 