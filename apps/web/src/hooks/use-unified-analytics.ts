// @epic-3.1-analytics: Unified analytics hook combining chat and general analytics
// @persona-jennifer: Executive needs unified view of all analytics
// @persona-david: Team lead needs combined chat and project analytics

import { useQuery } from "@tanstack/react-query";
import { useChatAnalytics } from "./useChatAnalytics";
import { useEnhancedAnalytics } from "./queries/analytics/use-enhanced-analytics";
import useWorkspaceStore from "@/store/workspace";
import { useMemo } from "react";
import { logger } from "../lib/logger";

interface UnifiedAnalyticsOptions {
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

interface UnifiedMetrics {
  // Project Management Metrics
  projects: {
    total: number;
    active: number;
    completed: number;
    atRisk: number;
    healthScore: number;
  };
  
  // Task Metrics
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    velocity: number;
  };
  
  // Team & Communication Metrics
  team: {
    totalMembers: number;
    activeMembers: number;
    productivity: number;
    collaboration: number;
    communicationHealth: number;
  };
  
  // Time & Resource Metrics
  time: {
    totalHours: number;
    utilization: number;
    avgTimePerTask: number;
    communicationTime: number;
  };
  
  // Communication-Specific Metrics
  communication: {
    totalMessages: number;
    activeChannels: number;
    averageResponseTime: number;
    engagementScore: number;
    messageGrowth: number;
  };
  
  // Cross-functional Insights
  insights: {
    productivityCorrelation: number; // Correlation between chat activity and task completion
    communicationEffectiveness: number; // How communication impacts project outcomes
    teamDynamics: number; // Team interaction quality score
    alertsCount: number;
    recommendationsCount: number;
  };
}

interface UnifiedTimeSeriesData {
  date: string;
  timestamp: number;
  
  // Project metrics
  tasksCreated: number;
  tasksCompleted: number;
  hoursLogged: number;
  
  // Communication metrics
  messagesCount: number;
  activeUsers: number;
  averageResponseTime: number;
  
  // Combined metrics
  productivity: number;
  teamHealth: number;
  collaborationIndex: number;
}

interface UnifiedAnalyticsResponse {
  // Core unified metrics
  metrics: UnifiedMetrics;
  
  // Time series data combining both sources
  timeSeriesData: UnifiedTimeSeriesData[];
  
  // Project health (from general analytics)
  projectHealth: any[];
  
  // Resource utilization (enhanced with communication data)
  resourceUtilization: any[];
  
  // Communication analytics
  communicationAnalytics: {
    channelActivity: any[];
    userEngagement: any[];
    messageMetrics: any;
  };
  
  // Cross-functional insights
  crossFunctionalInsights: {
    correlations: {
      chatVsProductivity: number;
      meetingsVsDelivery: number;
      teamSizeVsVelocity: number;
    };
    patterns: {
      peakProductivityHours: number[];
      communicationPatterns: string[];
      teamInteractionQuality: number;
    };
    recommendations: Array<{
      type: "productivity" | "communication" | "workflow" | "team";
      priority: "high" | "medium" | "low";
      title: string;
      description: string;
      impact: string;
      action: string;
    }>;
    alerts: Array<{
      type: "warning" | "critical" | "info";
      source: "projects" | "communication" | "team" | "system";
      message: string;
      actionRequired: boolean;
      timestamp: string;
    }>;
  };
  
  // Metadata
  summary: {
    timeRange: string;
    dataQuality: {
      projects: number;
      communication: number;
      overall: number;
    };
    lastUpdated: string;
    refreshNeeded: boolean;
  };
}

export function useUnifiedAnalytics(options: UnifiedAnalyticsOptions = {}) {
  const { workspace } = useWorkspaceStore();
  const {
    timeRange = "30d",
    enabled = true,
    ...enhancedOptions
  } = options;

  // Get general analytics data
  const { 
    data: generalAnalytics, 
    isLoading: generalLoading, 
    error: generalError 
  } = useEnhancedAnalytics({
    timeRange,
    enabled: enabled && !!workspace?.id,
    ...enhancedOptions,
  });

  // Get chat analytics data
  const {
    analyticsData: chatAnalytics,
    isLoading: chatLoading,
    error: chatError,
    hasData: hasChatData,
  } = useChatAnalytics({
    enableRealTime: true,
    updateInterval: 30000,
  });

  // Combine and transform the data
  const unifiedData = useMemo((): UnifiedAnalyticsResponse | null => {
    if (!generalAnalytics && !chatAnalytics) return null;

    logger.info("🔄 Combining analytics data:", {
      generalKeys: generalAnalytics ? Object.keys(generalAnalytics) : [],
      chatKeys: chatAnalytics ? Object.keys(chatAnalytics) : [],
    });

    // Create unified metrics
    const metrics: UnifiedMetrics = {
      projects: {
        total: generalAnalytics?.projectMetrics?.totalProjects?.current || 0,
        active: generalAnalytics?.projectMetrics?.activeProjects?.current || 0,
        completed: generalAnalytics?.projectMetrics?.completedProjects?.current || 0,
        atRisk: generalAnalytics?.projectMetrics?.projectsAtRisk?.current || 0,
        healthScore: generalAnalytics?.projectMetrics?.avgHealthScore?.current || 0,
      },
      
      tasks: {
        total: generalAnalytics?.taskMetrics?.totalTasks?.current || 0,
        completed: generalAnalytics?.taskMetrics?.completedTasks?.current || 0,
        inProgress: generalAnalytics?.taskMetrics?.inProgressTasks?.current || 0,
        overdue: generalAnalytics?.taskMetrics?.overdueTasks?.current || 0,
        velocity: generalAnalytics?.taskMetrics?.throughput?.current || 0,
      },
      
      team: {
        totalMembers: generalAnalytics?.teamMetrics?.totalMembers?.current || 0,
        activeMembers: Math.max(
          generalAnalytics?.teamMetrics?.activeMembers?.current || 0,
          chatAnalytics?.overview?.activeUsers || 0
        ),
        productivity: generalAnalytics?.teamMetrics?.avgProductivity?.current || 0,
        collaboration: generalAnalytics?.teamMetrics?.collaborationIndex?.current || 0,
        communicationHealth: chatAnalytics?.overview?.averageEngagement || 0,
      },
      
      time: {
        totalHours: generalAnalytics?.timeMetrics?.totalHours?.current || 0,
        utilization: generalAnalytics?.timeMetrics?.timeUtilization?.current || 0,
        avgTimePerTask: generalAnalytics?.timeMetrics?.avgTimePerTask?.current || 0,
        communicationTime: calculateCommunicationTime(chatAnalytics),
      },
      
      communication: {
        totalMessages: chatAnalytics?.overview?.totalMessages || 0,
        activeChannels: chatAnalytics?.overview?.totalChannels || 0,
        averageResponseTime: chatAnalytics?.realTimeMetrics?.averageResponseTime || 0,
        engagementScore: chatAnalytics?.overview?.averageEngagement || 0,
        messageGrowth: chatAnalytics?.overview?.messageGrowth || 0,
      },
      
      insights: {
        productivityCorrelation: calculateProductivityCorrelation(generalAnalytics, chatAnalytics),
        communicationEffectiveness: calculateCommunicationEffectiveness(generalAnalytics, chatAnalytics),
        teamDynamics: calculateTeamDynamics(chatAnalytics),
        alertsCount: (generalAnalytics?.summary?.alerts?.length || 0) + calculateChatAlerts(chatAnalytics),
        recommendationsCount: generalAnalytics?.summary?.recommendations?.length || 0,
      },
    };

    // Create unified time series data
    const timeSeriesData = createUnifiedTimeSeries(generalAnalytics, chatAnalytics);

    // Generate cross-functional insights
    const crossFunctionalInsights = generateCrossFunctionalInsights(
      generalAnalytics,
      chatAnalytics,
      metrics
    );

    return {
      metrics,
      timeSeriesData,
      projectHealth: generalAnalytics?.projectHealth || [],
      resourceUtilization: enhanceResourceUtilization(
        generalAnalytics?.resourceUtilization || [],
        chatAnalytics
      ),
      communicationAnalytics: {
        channelActivity: chatAnalytics?.channelAnalytics?.channels || [],
        userEngagement: chatAnalytics?.userEngagement?.users || [],
        messageMetrics: chatAnalytics?.messageMetrics || {},
      },
      crossFunctionalInsights,
      summary: {
        timeRange: `${timeRange} period`,
        dataQuality: {
          projects: calculateDataQuality(generalAnalytics),
          communication: calculateDataQuality(chatAnalytics),
          overall: calculateOverallDataQuality(generalAnalytics, chatAnalytics),
        },
        lastUpdated: new Date().toISOString(),
        refreshNeeded: checkIfRefreshNeeded(generalAnalytics, chatAnalytics),
      },
    };
  }, [generalAnalytics, chatAnalytics, timeRange]);

  const isLoading = generalLoading || chatLoading;
  const error = generalError || chatError;

  return {
    data: unifiedData,
    isLoading,
    error: error instanceof Error ? error.message : error,
    hasData: !!unifiedData,
    
    // Individual data sources for drilling down
    generalAnalytics,
    chatAnalytics,
    
    // Refresh functions
    refetch: () => {
      // This would trigger refetch of both data sources
      logger.info("🔄 Refetching unified analytics data");
    },
    
    // Data quality indicators
    dataQuality: unifiedData?.summary?.dataQuality || { projects: 0, communication: 0, overall: 0 },
    
    // Real-time indicators
    isRealTime: hasChatData,
    lastUpdated: unifiedData?.summary?.lastUpdated,
  };
}

// Helper functions

function calculateCommunicationTime(chatAnalytics: any): number {
  if (!chatAnalytics?.userEngagement?.users) return 0;
  
  const totalTime = chatAnalytics.userEngagement.users.reduce(
    (sum: number, user: any) => sum + (user.timeSpent || 0),
    0
  );
  
  return Math.round(totalTime / (1000 * 60 * 60)); // Convert to hours
}

function calculateProductivityCorrelation(generalAnalytics: any, chatAnalytics: any): number {
  // Simplified correlation calculation
  if (!generalAnalytics || !chatAnalytics) return 0;
  
  const taskVelocity = generalAnalytics.taskMetrics?.throughput?.current || 0;
  const messageActivity = chatAnalytics.overview?.totalMessages || 0;
  
  // Normalize and calculate correlation (simplified)
  const normalizedTasks = Math.min(taskVelocity / 100, 1);
  const normalizedMessages = Math.min(messageActivity / 10000, 1);
  
  return Math.round((normalizedTasks + normalizedMessages) * 50);
}

function calculateCommunicationEffectiveness(generalAnalytics: any, chatAnalytics: any): number {
  if (!generalAnalytics || !chatAnalytics) return 0;
  
  const projectHealth = generalAnalytics.projectMetrics?.avgHealthScore?.current || 0;
  const engagementScore = chatAnalytics.overview?.averageEngagement || 0;
  
  return Math.round((projectHealth + engagementScore) / 2);
}

function calculateTeamDynamics(chatAnalytics: any): number {
  if (!chatAnalytics) return 0;
  
  const engagement = chatAnalytics.overview?.averageEngagement || 0;
  const responseTime = chatAnalytics.realTimeMetrics?.averageResponseTime || 10000;
  
  // Lower response time = better dynamics
  const responseScore = Math.max(0, 100 - (responseTime / 100));
  
  return Math.round((engagement + responseScore) / 2);
}

function calculateChatAlerts(chatAnalytics: any): number {
  if (!chatAnalytics) return 0;
  
  let alerts = 0;
  
  // Check for communication health issues
  if (chatAnalytics.overview?.averageEngagement < 50) alerts++;
  if (chatAnalytics.realTimeMetrics?.errorRate > 2) alerts++;
  if (chatAnalytics.realTimeMetrics?.averageResponseTime > 5000) alerts++;
  
  return alerts;
}

function createUnifiedTimeSeries(generalAnalytics: any, chatAnalytics: any): UnifiedTimeSeriesData[] {
  const timeSeriesData: UnifiedTimeSeriesData[] = [];
  
  // Use general analytics time series as base
  const generalTimeSeries = generalAnalytics?.timeSeriesData || [];
  const chatTimeSeries = chatAnalytics?.messageMetrics?.daily || [];
  
  // Combine data points by date
  generalTimeSeries.forEach((point: any) => {
    const date = point.date;
    const chatPoint = chatTimeSeries.find((cp: any) => {
      // Convert timestamp to Date if it's a number
      const chatDate = typeof cp.timestamp === 'number'
        ? new Date(cp.timestamp).toISOString().split('T')[0]
        : new Date(cp.timestamp).toISOString().split('T')[0];
      return chatDate === date;
    });
    
    const productivity = point.tasksCompleted > 0 && point.tasksCreated > 0
      ? (point.tasksCompleted / point.tasksCreated) * 100
      : 0;
    
    const teamHealth = calculateDailyTeamHealth(point, chatPoint);
    const collaborationIndex = calculateDailyCollaboration(point, chatPoint);
    
    timeSeriesData.push({
      date,
      timestamp: point.timestamp,
      tasksCreated: point.tasksCreated || 0,
      tasksCompleted: point.tasksCompleted || 0,
      hoursLogged: point.hoursLogged || 0,
      messagesCount: chatPoint?.value || 0,
      activeUsers: point.activeUsers || 0,
      averageResponseTime: chatPoint?.metadata?.avgResponseTime || 0,
      productivity: Math.round(productivity),
      teamHealth: Math.round(teamHealth),
      collaborationIndex: Math.round(collaborationIndex),
    });
  });
  
  return timeSeriesData;
}

function calculateDailyTeamHealth(generalPoint: any, chatPoint: any): number {
  const taskHealth = generalPoint.tasksCompleted > 0 ? 80 : 40;
  const chatHealth = chatPoint?.value > 0 ? 70 : 30;
  
  return (taskHealth + chatHealth) / 2;
}

function calculateDailyCollaboration(generalPoint: any, chatPoint: any): number {
  const users = generalPoint.activeUsers || 1;
  const messages = chatPoint?.value || 0;
  
  // More messages per user = higher collaboration
  return Math.min(100, (messages / users) * 5);
}

function enhanceResourceUtilization(resources: any[], chatAnalytics: any) {
  if (!chatAnalytics?.userEngagement?.users) return resources;
  
  return resources.map(resource => {
    const chatUser = chatAnalytics.userEngagement.users.find(
      (u: any) => u.username.includes(resource.userName) || u.userId === resource.userEmail
    );
    
    return {
      ...resource,
      communicationScore: chatUser?.engagementScore || 0,
      averageResponseTime: chatUser?.averageResponseTime || 0,
      messagesCount: chatUser?.messagesCount || 0,
      collaborationEffectiveness: calculateUserCollaboration(resource, chatUser),
    };
  });
}

function calculateUserCollaboration(resource: any, chatUser: any): number {
  if (!chatUser) return resource.collaborationScore || 0;
  
  const projectCount = resource.projectCount || 1;
  const messageRatio = (chatUser.messagesCount || 0) / projectCount;
  
  return Math.min(100, messageRatio * 2);
}

function generateCrossFunctionalInsights(generalAnalytics: any, chatAnalytics: any, metrics: UnifiedMetrics) {
  const correlations = {
    chatVsProductivity: calculateProductivityCorrelation(generalAnalytics, chatAnalytics),
    meetingsVsDelivery: calculateMeetingsCorrelation(generalAnalytics, chatAnalytics),
    teamSizeVsVelocity: calculateTeamSizeCorrelation(generalAnalytics, chatAnalytics),
  };
  
  const patterns = {
    peakProductivityHours: calculatePeakHours(generalAnalytics, chatAnalytics),
    communicationPatterns: identifyCommunicationPatterns(chatAnalytics),
    teamInteractionQuality: calculateTeamDynamics(chatAnalytics),
  };
  
  const recommendations = generateRecommendations(metrics, correlations, patterns);
  const alerts = generateAlerts(metrics, generalAnalytics, chatAnalytics);
  
  return {
    correlations,
    patterns,
    recommendations,
    alerts,
  };
}

function calculateMeetingsCorrelation(generalAnalytics: any, chatAnalytics: any): number {
  // This would analyze video/audio message types vs task completion
  return 75; // Placeholder
}

function calculateTeamSizeCorrelation(generalAnalytics: any, chatAnalytics: any): number {
  const teamSize = generalAnalytics?.teamMetrics?.totalMembers?.current || 1;
  const velocity = generalAnalytics?.taskMetrics?.throughput?.current || 0;
  
  return Math.min(100, (velocity / teamSize) * 10);
}

function calculatePeakHours(generalAnalytics: any, chatAnalytics: any): number[] {
  // Combine task completion times with peak chat hours
  const chatPeakHours = chatAnalytics?.userEngagement?.users?.[0]?.peakHours || [9, 10, 11, 14, 15, 16];
  return chatPeakHours;
}

function identifyCommunicationPatterns(chatAnalytics: any): string[] {
  const patterns: string[] = [];
  
  if (!chatAnalytics) return patterns;
  
  const messageGrowth = chatAnalytics.overview?.messageGrowth || 0;
  const averageEngagement = chatAnalytics.overview?.averageEngagement || 0;
  
  if (messageGrowth > 10) patterns.push("High communication growth");
  if (averageEngagement > 80) patterns.push("Strong team engagement");
  if (averageEngagement < 50) patterns.push("Low engagement requiring attention");
  
  return patterns;
}

function generateRecommendations(metrics: UnifiedMetrics, correlations: any, patterns: any) {
  const recommendations: any[] = [];
  
  // Productivity recommendations
  if (metrics.team.productivity < 70) {
    recommendations.push({
      type: "productivity",
      priority: "high",
      title: "Improve Team Productivity",
      description: "Team productivity is below optimal levels",
      impact: "Could increase delivery velocity by 30%",
      action: "Analyze task complexity and provide additional support",
    });
  }
  
  // Communication recommendations
  if (metrics.communication.engagementScore < 60) {
    recommendations.push({
      type: "communication",
      priority: "medium",
      title: "Enhance Team Communication",
      description: "Communication engagement is lower than expected",
      impact: "Better communication can improve project outcomes",
      action: "Encourage more active participation in team channels",
    });
  }
  
  // Workflow recommendations
  if (correlations.chatVsProductivity < 50) {
    recommendations.push({
      type: "workflow",
      priority: "medium",
      title: "Align Communication with Work",
      description: "Communication patterns don't correlate well with productivity",
      impact: "Better coordination can improve efficiency",
      action: "Establish communication protocols for project updates",
    });
  }
  
  return recommendations;
}

function generateAlerts(metrics: UnifiedMetrics, generalAnalytics: any, chatAnalytics: any) {
  const alerts: any[] = [];
  
  // Copy existing alerts from general analytics
  if (generalAnalytics?.summary?.alerts) {
    alerts.push(...generalAnalytics.summary.alerts.map((alert: any) => ({
      ...alert,
      source: "projects",
      timestamp: new Date().toISOString(),
    })));
  }
  
  // Add communication-specific alerts
  if (metrics.communication.averageResponseTime > 5000) {
    alerts.push({
      type: "warning",
      source: "communication",
      message: "Average response time is high, affecting team collaboration",
      actionRequired: true,
      timestamp: new Date().toISOString(),
    });
  }
  
  if (metrics.team.communicationHealth < 50) {
    alerts.push({
      type: "critical",
      source: "team",
      message: "Team communication health is critically low",
      actionRequired: true,
      timestamp: new Date().toISOString(),
    });
  }
  
  return alerts;
}

function calculateDataQuality(analytics: any): number {
  if (!analytics) return 0;
  
  let score = 100;
  
  // Check for missing or incomplete data
  if (typeof analytics === 'object') {
    const keys = Object.keys(analytics);
    if (keys.length < 3) score -= 30;
    
    // Check for null/undefined values
    keys.forEach(key => {
      if (analytics[key] === null || analytics[key] === undefined) {
        score -= 10;
      }
    });
  }
  
  return Math.max(0, score);
}

function calculateOverallDataQuality(generalAnalytics: any, chatAnalytics: any): number {
  const projectQuality = calculateDataQuality(generalAnalytics);
  const chatQuality = calculateDataQuality(chatAnalytics);
  
  return Math.round((projectQuality + chatQuality) / 2);
}

function checkIfRefreshNeeded(generalAnalytics: any, chatAnalytics: any): boolean {
  // Check if data is stale (older than 10 minutes)
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  
  const generalStale = !generalAnalytics?.summary?.generatedAt || 
    new Date(generalAnalytics.summary.generatedAt).getTime() < tenMinutesAgo;
  
  const chatStale = !chatAnalytics?.realTimeMetrics?.lastUpdated ||
    new Date(chatAnalytics.realTimeMetrics.lastUpdated).getTime() < tenMinutesAgo;
  
  return generalStale || chatStale;
}

export type { UnifiedAnalyticsOptions, UnifiedAnalyticsResponse, UnifiedMetrics };