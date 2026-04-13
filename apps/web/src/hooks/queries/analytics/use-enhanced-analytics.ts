import { useQuery } from "@tanstack/react-query";
import useWorkspaceStore from "@/store/workspace";
import { API_BASE_URL, API_URL } from '@/constants/urls';

// @epic-3.1-analytics: Enhanced analytics hook with advanced filtering and comparative analytics
// @role-workspace-manager: Executive-level insights with cross-project visibility
// @role-department-head: Department-wide analytics and performance tracking

interface EnhancedAnalyticsOptions {
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all" | "custom";
  projectIds?: string[];
  userEmails?: string[];
  departments?: string[];
  priorities?: string[];
  statuses?: string[];
  includeArchived?: boolean;
  granularity?: "daily" | "weekly" | "monthly";
  compareWith?: "previous_period" | "previous_year" | "baseline";
  customStartDate?: string;
  customEndDate?: string;
  includeForecasting?: boolean;
  includeBenchmarks?: boolean;
  enabled?: boolean;
}

interface ComparativeData {
  current: any;
  comparison: any;
  change: {
    absolute: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  };
}

interface AdvancedProjectHealth {
  id: string;
  name: string;
  slug: string;
  completion: number;
  health: "excellent" | "good" | "warning" | "critical" | "at_risk";
  healthScore: number;
  tasksCompleted: number;
  totalTasks: number;
  teamSize: number;
  daysRemaining: number | null;
  overdueTasks: number;
  avgTimePerTask: number;
  velocity: number;
  burndownTrend: "ahead" | "on_track" | "behind" | "critical";
  riskFactors: string[];
  predictedCompletion: string | null;
  budgetUtilization?: number;
  stakeholderSatisfaction?: number;
}

interface EnhancedResourceUtilization {
  userEmail: string;
  userName: string;
  department?: string;
  role: string;
  projectCount: number;
  taskCount: number;
  completedTasks: number;
  totalHours: number;
  utilization: number;
  productivity: number;
  efficiency: number;
  workloadBalance: "underutilized" | "optimal" | "overloaded" | "critical";
  skillUtilization: number;
  collaborationScore: number;
  recentPerformance: ComparativeData;
}

interface AdvancedPerformanceBenchmarks {
  avgProjectCompletion: ComparativeData;
  avgTaskCycleTime: ComparativeData;
  teamVelocity: ComparativeData;
  qualityScore: ComparativeData;
  onTimeDelivery: ComparativeData;
  customerSatisfaction?: ComparativeData;
  defectRate?: ComparativeData;
  reworkRate?: ComparativeData;
  innovationIndex?: number;
  teamMorale?: number;
}

interface TimeSeriesDataPoint {
  date: string;
  timestamp: number;
  tasksCreated: number;
  tasksCompleted: number;
  hoursLogged: number;
  activeUsers: number;
  productivity: number;
  burnRate: number;
  velocity: number;
  qualityMetrics?: {
    defects: number;
    rework: number;
    customerFeedback: number;
  };
}

interface ForecastingData {
  projectCompletionDate: string;
  confidenceInterval: {
    low: string;
    high: string;
  };
  resourceRequirements: {
    estimated: number;
    recommended: number;
  };
  riskAssessment: {
    probability: number;
    impact: "low" | "medium" | "high" | "critical";
    mitigationStrategies: string[];
  };
}

interface EnhancedAnalyticsResponse {
  projectMetrics: {
    totalProjects: ComparativeData;
    activeProjects: ComparativeData;
    completedProjects: ComparativeData;
    projectsAtRisk: ComparativeData;
    avgHealthScore: ComparativeData;
  };
  
  taskMetrics: {
    totalTasks: ComparativeData;
    completedTasks: ComparativeData;
    inProgressTasks: ComparativeData;
    overdueTasks: ComparativeData;
    avgCycleTime: ComparativeData;
    throughput: ComparativeData;
  };
  
  teamMetrics: {
    totalMembers: ComparativeData;
    activeMembers: ComparativeData;
    avgProductivity: ComparativeData;
    teamEfficiency: ComparativeData;
    collaborationIndex: ComparativeData;
    retentionRate?: ComparativeData;
  };
  
  timeMetrics: {
    totalHours: ComparativeData;
    billableHours: ComparativeData;
    avgTimePerTask: ComparativeData;
    timeUtilization: ComparativeData;
    overtime?: ComparativeData;
  };

  projectHealth: AdvancedProjectHealth[];
  resourceUtilization: EnhancedResourceUtilization[];
  performanceBenchmarks: AdvancedPerformanceBenchmarks;
  timeSeriesData: TimeSeriesDataPoint[];
  
  departmentBreakdown?: any[];
  skillGapAnalysis?: any[];
  capacityPlanning?: any[];
  riskAssessment?: any[];
  
  forecasting?: ForecastingData;
  industryBenchmarks?: any;
  
  summary: {
    timeRange: string;
    comparisonPeriod?: string;
    generatedAt: string;
    dataQuality: number;
    recommendations: string[];
    alerts: Array<{
      type: "warning" | "critical" | "info";
      message: string;
      actionRequired: boolean;
    }>;
  };
}

export function useEnhancedAnalytics(options: EnhancedAnalyticsOptions = {}) {
  const { workspace } = useWorkspaceStore();

  const {
    timeRange = "30d",
    projectIds,
    userEmails,
    departments,
    priorities,
    statuses,
    includeArchived = false,
    granularity = "daily",
    compareWith = "previous_period",
    customStartDate,
    customEndDate,
    includeForecasting = false,
    includeBenchmarks = false,
    enabled = true,
  } = options;

  return useQuery<EnhancedAnalyticsResponse, Error, EnhancedAnalyticsResponse>({
    queryKey: [
      "enhanced-analytics",
      workspace?.id,
      timeRange,
      projectIds,
      userEmails,
      departments,
      priorities,
      statuses,
      includeArchived,
      granularity,
      compareWith,
      customStartDate,
      customEndDate,
      includeForecasting,
      includeBenchmarks,
    ],
    queryFn: async () => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }

      const queryParams = new URLSearchParams();
      
      if (timeRange) queryParams.set("timeRange", timeRange);
      if (projectIds?.length) queryParams.set("projectIds", projectIds.join(","));
      if (userEmails?.length) queryParams.set("userEmails", userEmails.join(","));
      if (departments?.length) queryParams.set("departments", departments.join(","));
      if (priorities?.length) queryParams.set("priorities", priorities.join(","));
      if (statuses?.length) queryParams.set("statuses", statuses.join(","));
      if (includeArchived) queryParams.set("includeArchived", "true");
      if (granularity) queryParams.set("granularity", granularity);
      if (compareWith) queryParams.set("compareWith", compareWith);
      if (customStartDate) queryParams.set("customStartDate", customStartDate);
      if (customEndDate) queryParams.set("customEndDate", customEndDate);
      if (includeForecasting) queryParams.set("includeForecasting", "true");
      if (includeBenchmarks) queryParams.set("includeBenchmarks", "true");
      
      // Always request enhanced analytics
      queryParams.set("enhanced", "true");

      const url = `${API_BASE_URL}/dashboard/analytics/${workspace.id}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch enhanced analytics: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: enabled && !!workspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => {
      // Ensure all arrays exist to prevent runtime errors
      const defaultComparativeData = {
        current: 0,
        comparison: 0,
        change: {
          absolute: 0,
          percentage: 0,
          trend: "stable" as const
        }
      };

      return {
        projectMetrics: {
          totalProjects: data?.projectMetrics?.totalProjects || defaultComparativeData,
          activeProjects: data?.projectMetrics?.activeProjects || defaultComparativeData,
          completedProjects: data?.projectMetrics?.completedProjects || defaultComparativeData,
          projectsAtRisk: data?.projectMetrics?.projectsAtRisk || defaultComparativeData,
          avgHealthScore: data?.projectMetrics?.avgHealthScore || defaultComparativeData,
        },
        taskMetrics: {
          totalTasks: data?.taskMetrics?.totalTasks || defaultComparativeData,
          completedTasks: data?.taskMetrics?.completedTasks || defaultComparativeData,
          inProgressTasks: data?.taskMetrics?.inProgressTasks || defaultComparativeData,
          overdueTasks: data?.taskMetrics?.overdueTasks || defaultComparativeData,
          avgCycleTime: data?.taskMetrics?.avgCycleTime || defaultComparativeData,
          throughput: data?.taskMetrics?.throughput || defaultComparativeData,
        },
        teamMetrics: {
          totalMembers: data?.teamMetrics?.totalMembers || defaultComparativeData,
          activeMembers: data?.teamMetrics?.activeMembers || defaultComparativeData,
          avgProductivity: data?.teamMetrics?.avgProductivity || defaultComparativeData,
          teamEfficiency: data?.teamMetrics?.teamEfficiency || defaultComparativeData,
          collaborationIndex: data?.teamMetrics?.collaborationIndex || defaultComparativeData,
          retentionRate: data?.teamMetrics?.retentionRate || defaultComparativeData,
        },
        timeMetrics: {
          totalHours: data?.timeMetrics?.totalHours || defaultComparativeData,
          billableHours: data?.timeMetrics?.billableHours || defaultComparativeData,
          avgTimePerTask: data?.timeMetrics?.avgTimePerTask || defaultComparativeData,
          timeUtilization: data?.timeMetrics?.timeUtilization || defaultComparativeData,
          overtime: data?.timeMetrics?.overtime || defaultComparativeData,
        },
        projectHealth: Array.isArray(data?.projectHealth) ? data.projectHealth : [],
        resourceUtilization: Array.isArray(data?.resourceUtilization) ? data.resourceUtilization : [],
        timeSeriesData: Array.isArray(data?.timeSeriesData) ? data.timeSeriesData : [],
        performanceBenchmarks: data?.performanceBenchmarks || {},
        departmentBreakdown: Array.isArray(data?.departmentBreakdown) ? data.departmentBreakdown : [],
        skillGapAnalysis: Array.isArray(data?.skillGapAnalysis) ? data.skillGapAnalysis : [],
        capacityPlanning: Array.isArray(data?.capacityPlanning) ? data.capacityPlanning : [],
        riskAssessment: Array.isArray(data?.riskAssessment) ? data.riskAssessment : [],
        forecasting: data?.forecasting || null,
        industryBenchmarks: data?.industryBenchmarks || null,
        summary: {
          timeRange: data?.summary?.timeRange || "",
          comparisonPeriod: data?.summary?.comparisonPeriod || "",
          generatedAt: data?.summary?.generatedAt || new Date().toISOString(),
          dataQuality: data?.summary?.dataQuality || 0,
          recommendations: Array.isArray(data?.summary?.recommendations) ? data.summary.recommendations : [],
          alerts: Array.isArray(data?.summary?.alerts) ? data.summary.alerts : []
        }
      };
    }
  });
}

export type {
  EnhancedAnalyticsOptions,
  EnhancedAnalyticsResponse,
  ComparativeData,
  AdvancedProjectHealth,
  EnhancedResourceUtilization,
  AdvancedPerformanceBenchmarks,
  TimeSeriesDataPoint,
  ForecastingData,
}; 