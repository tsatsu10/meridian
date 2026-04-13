import { and, eq, sql, count, avg, sum, desc, gte, lte, between, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import logger from '../../utils/logger';
import {
  projectTable,
  taskTable,
  workspaceUserTable,
  userTable,
  activityTable,
  timeEntryTable,
  roleAssignmentTable,
} from "../../database/schema";

// @epic-3.1-analytics: Enhanced analytics with advanced filtering and comparative analytics
// @role-workspace-manager: Executive-level insights with cross-project visibility
// @role-department-head: Department-wide analytics and performance tracking
// @permission-canAccessAdvancedAnalytics

interface EnhancedAnalyticsOptions {
  workspaceId: string;
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
  healthScore: number; // 0-100 composite score
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

interface AdvancedAnalyticsResponse {
  // Core metrics with comparative data
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

  // Enhanced analysis
  projectHealth: AdvancedProjectHealth[];
  resourceUtilization: EnhancedResourceUtilization[];
  performanceBenchmarks: AdvancedPerformanceBenchmarks;
  
  // Time series with advanced granularity
  timeSeriesData: TimeSeriesDataPoint[];
  
  // Advanced features
  departmentBreakdown?: any[];
  skillGapAnalysis?: any[];
  capacityPlanning?: any[];
  riskAssessment?: any[];
  
  // Forecasting (if enabled)
  forecasting?: ForecastingData;
  
  // Benchmarking (if enabled)
  industryBenchmarks?: any;
  
  // Metadata
  summary: {
    timeRange: string;
    comparisonPeriod?: string;
    generatedAt: string;
    dataQuality: number; // 0-100 score
    recommendations: string[];
    alerts: Array<{
      type: "warning" | "critical" | "info";
      message: string;
      actionRequired: boolean;
    }>;
  };
}

async function getEnhancedAnalytics(options: EnhancedAnalyticsOptions): Promise<AdvancedAnalyticsResponse> {
  logger.debug("📊 getEnhancedAnalytics called with options:", options);
  
  const {
    workspaceId,
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
  } = options;

  logger.debug("📊 Parsed options:", {
    workspaceId,
    timeRange,
    includeArchived,
    includeForecasting,
    includeBenchmarks
  });

  try {
    // Calculate date ranges for current and comparison periods
    logger.debug("📊 Calculating date ranges...");
    const { currentPeriod, comparisonPeriod } = calculateDateRanges(
      timeRange,
      compareWith,
      customStartDate,
      customEndDate
    );
    logger.debug("📊 Date ranges calculated:", { currentPeriod, comparisonPeriod });

    // Build base conditions with advanced filtering
    logger.debug("📊 Building filter conditions...");
    const { conditions, workspaceId: baseWorkspaceId } = buildFilterConditions({
      workspaceId,
      projectIds,
      userEmails,
      departments,
      priorities,
      statuses,
      includeArchived,
    });
    logger.debug("📊 Filter conditions built:", conditions.length, "conditions");

    // Execute analytics queries in parallel for performance
    logger.debug("📊 Executing parallel queries...");
    const [
      currentMetrics,
      comparisonMetrics,
      projectHealthData,
      resourceData,
      timeSeriesData,
      departmentData,
    ] = await Promise.all([
      getMetricsForPeriod(conditions, baseWorkspaceId, currentPeriod),
      compareWith !== "baseline" ? getMetricsForPeriod(conditions, baseWorkspaceId, comparisonPeriod) : null,
      getAdvancedProjectHealth(conditions, currentPeriod),
      getEnhancedResourceUtilization(conditions, baseWorkspaceId, currentPeriod, comparisonPeriod),
      getTimeSeriesData(conditions, currentPeriod, granularity),
      getDepartmentBreakdown(conditions, currentPeriod),
    ]);
    logger.debug("📊 Parallel queries completed");

    // Calculate comparative data
    const projectMetrics = {
      totalProjects: calculateComparativeData(currentMetrics.projects.totalProjects, comparisonMetrics?.projects?.totalProjects),
      activeProjects: calculateComparativeData(currentMetrics.projects.activeProjects, comparisonMetrics?.projects?.activeProjects),
      completedProjects: calculateComparativeData(0, 0), // Will be calculated from projectHealth
      projectsAtRisk: calculateComparativeData(0, 0), // Will be calculated from projectHealth
      avgHealthScore: calculateComparativeData(currentMetrics.projects.avgHealthScore, comparisonMetrics?.projects?.avgHealthScore),
    };

    const taskMetrics = {
      totalTasks: calculateComparativeData(currentMetrics.tasks.totalTasks, comparisonMetrics?.tasks?.totalTasks),
      completedTasks: calculateComparativeData(currentMetrics.tasks.completedTasks, comparisonMetrics?.tasks?.completedTasks),
      inProgressTasks: calculateComparativeData(currentMetrics.tasks.inProgressTasks, comparisonMetrics?.tasks?.inProgressTasks),
      overdueTasks: calculateComparativeData(currentMetrics.tasks.overdueTasks, comparisonMetrics?.tasks?.overdueTasks),
      avgCycleTime: calculateComparativeData(currentMetrics.tasks.avgCycleTime, comparisonMetrics?.tasks?.avgCycleTime),
      throughput: calculateComparativeData(currentMetrics.tasks.throughput, comparisonMetrics?.tasks?.throughput),
    };

    const teamMetrics = {
      totalMembers: calculateComparativeData(currentMetrics.team.totalMembers, comparisonMetrics?.team?.totalMembers),
      activeMembers: calculateComparativeData(currentMetrics.team.activeMembers, comparisonMetrics?.team?.activeMembers),
      avgProductivity: calculateComparativeData(currentMetrics.team.avgProductivity, comparisonMetrics?.team?.avgProductivity),
      teamEfficiency: calculateComparativeData(currentMetrics.team.avgProductivity, comparisonMetrics?.team?.avgProductivity),
      collaborationIndex: calculateComparativeData(currentMetrics.team.collaborationIndex, comparisonMetrics?.team?.collaborationIndex),
    };

    const timeMetrics = {
      totalHours: calculateComparativeData(currentMetrics.time.totalHours, comparisonMetrics?.time?.totalHours),
      billableHours: calculateComparativeData(currentMetrics.time.billableHours, comparisonMetrics?.time?.billableHours),
      avgTimePerTask: calculateComparativeData(currentMetrics.time.avgTimePerTask, comparisonMetrics?.time?.avgTimePerTask),
      timeUtilization: calculateComparativeData(currentMetrics.time.timeUtilization, comparisonMetrics?.time?.timeUtilization),
    };

    // Calculate advanced performance benchmarks
    const performanceBenchmarks = calculateAdvancedBenchmarks(
      currentMetrics,
      comparisonMetrics,
      projectHealthData
    );

    // Update project metrics from calculated health
    projectMetrics.completedProjects = calculateComparativeData(
      projectHealthData.filter(p => p.completion === 100).length,
      null
    );
    projectMetrics.projectsAtRisk = calculateComparativeData(
      projectHealthData.filter(p => p.health === "critical" || p.health === "at_risk").length,
      null
    );

    // Generate forecasting data if requested
    const forecasting = includeForecasting 
      ? await generateForecastingData(projectHealthData, timeSeriesData)
      : undefined;

    // Generate recommendations and alerts
    const { recommendations, alerts } = generateInsights(
      projectHealthData,
      resourceData,
      performanceBenchmarks
    );

    // Calculate data quality score
    const dataQuality = calculateDataQualityScore(currentMetrics, timeSeriesData);

    return {
      projectMetrics,
      taskMetrics,
      teamMetrics,
      timeMetrics,
      projectHealth: projectHealthData,
      resourceUtilization: resourceData,
      performanceBenchmarks,
      timeSeriesData,
      departmentBreakdown: departmentData,
      forecasting,
      summary: {
        timeRange: `${currentPeriod.start} to ${currentPeriod.end}`,
        comparisonPeriod: comparisonPeriod ? `${comparisonPeriod.start} to ${comparisonPeriod.end}` : undefined,
        generatedAt: new Date().toISOString(),
        dataQuality,
        recommendations,
        alerts,
      },
    };
  } catch (error) {
    logger.error("❌ Error in getEnhancedAnalytics:", error);
    throw error;
  }
}

// Helper functions
function calculateDateRanges(
  timeRange: string,
  compareWith: string,
  customStartDate?: string,
  customEndDate?: string
) {
  const now = new Date();
  let currentStart: Date;
  let currentEnd = now;

  // Calculate current period
  if (timeRange === "custom" && customStartDate && customEndDate) {
    currentStart = new Date(customStartDate);
    currentEnd = new Date(customEndDate);
  } else {
    switch (timeRange) {
      case "7d":
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        currentStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        currentStart = new Date(0);
    }
  }

  // Calculate comparison period
  let comparisonStart: Date;
  let comparisonEnd: Date;

  if (compareWith === "previous_period") {
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    comparisonEnd = new Date(currentStart.getTime());
    comparisonStart = new Date(currentStart.getTime() - periodLength);
  } else if (compareWith === "previous_year") {
    comparisonStart = new Date(currentStart);
    comparisonStart.setFullYear(currentStart.getFullYear() - 1);
    comparisonEnd = new Date(currentEnd);
    comparisonEnd.setFullYear(currentEnd.getFullYear() - 1);
  } else {
    // baseline comparison
    comparisonStart = new Date(0);
    comparisonEnd = currentStart;
  }

  return {
    currentPeriod: {
      start: currentStart.toISOString(),
      end: currentEnd.toISOString(),
      startTs: currentStart.getTime(),
      endTs: currentEnd.getTime(),
    },
    comparisonPeriod: {
      start: comparisonStart.toISOString(),
      end: comparisonEnd.toISOString(),
      startTs: comparisonStart.getTime(),
      endTs: comparisonEnd.getTime(),
    },
  };
}

function buildFilterConditions(filters: any) {
  const conditions = [eq(projectTable.workspaceId, filters.workspaceId)];

  if (filters.projectIds?.length > 0) {
    conditions.push(inArray(projectTable.id, filters.projectIds));
  }

  if (filters.userEmails?.length > 0) {
    conditions.push(inArray(taskTable.userEmail, filters.userEmails));
  }

  if (filters.priorities?.length > 0) {
    conditions.push(inArray(taskTable.priority, filters.priorities));
  }

  if (filters.statuses?.length > 0) {
    conditions.push(inArray(taskTable.status, filters.statuses));
  }

  if (!filters.includeArchived) {
    // Note: This assumes there's a status field that can indicate archived
    // Adjust based on actual schema
  }

  return { conditions, workspaceId: filters.workspaceId };
}

async function getMetricsForPeriod(baseConditions: any[], workspaceId: string, period: any) {
  const db = getDatabase();
  
  // Project metrics
  const [projectMetrics] = await db
    .select({
      totalProjects: sql<number>`COUNT(DISTINCT ${projectTable.id})`,
      activeProjects: sql<number>`
        COUNT(
          DISTINCT CASE
            WHEN ${projectTable.isArchived} IS NOT TRUE
              AND (
                ${projectTable.status} IS NULL
                OR ${projectTable.status} NOT IN ('archived', 'completed')
              )
            THEN ${projectTable.id}
          END
        )
      `,
      avgHealthScore: sql<number>`AVG(CASE WHEN ${taskTable.status} = 'done' THEN 100 ELSE 50 END)`,
    })
    .from(projectTable)
    .leftJoin(taskTable, eq(taskTable.projectId, projectTable.id))
    .where(baseConditions.length === 1 ? baseConditions[0] : and(...baseConditions));

  // Task metrics - combine baseConditions with period filter
  const taskConditions = [
    ...baseConditions,
    gte(taskTable.createdAt, new Date(period.start)),
    lte(taskTable.createdAt, new Date(period.end)),
  ];
  const [taskMetrics] = await db
    .select({
      totalTasks: count(),
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      inProgressTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'in_progress' THEN 1 END)`,
      overdueTasks: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN 1 END)`,
      avgCycleTime: sql<number>`0`, // Removed AVG(timestamp) - PostgreSQL doesn't support it
      throughput: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(taskConditions.length === 1 ? taskConditions[0] : and(...taskConditions));

  // Team metrics
  const [teamMetrics] = await db
    .select({
      totalMembers: sql<number>`COUNT(DISTINCT ${workspaceUserTable.userEmail})`,
      activeMembers: sql<number>`COUNT(DISTINCT ${taskTable.userEmail})`,
      avgProductivity: sql<number>`AVG(CASE WHEN ${taskTable.status} = 'done' THEN 1 ELSE 0 END) * 100`,
      collaborationIndex: sql<number>`COUNT(DISTINCT ${taskTable.userEmail}) / NULLIF(COUNT(DISTINCT ${projectTable.id}), 0)`,
    })
    .from(workspaceUserTable)
    .leftJoin(taskTable, eq(taskTable.userEmail, workspaceUserTable.userEmail))
    .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(workspaceUserTable.workspaceId, workspaceId));

  // Time metrics - combine baseConditions with period filter
  const timeConditions = [
    ...baseConditions,
    gte(timeEntryTable.createdAt, new Date(period.start)),
    lte(timeEntryTable.createdAt, new Date(period.end)),
  ];
  const [timeMetrics] = await db
    .select({
      totalHours: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`,
      billableHours: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`,
      avgTimePerTask: sql<number>`AVG(${timeEntryTable.duration}) / 3600`,
      timeUtilization: sql<number>`(COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600) / NULLIF((COUNT(DISTINCT ${taskTable.userEmail}) * 40), 0)`,
    })
    .from(timeEntryTable)
    .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(timeConditions.length === 1 ? timeConditions[0] : and(...timeConditions));

  return {
    projects: projectMetrics || { totalProjects: 0, activeProjects: 0, avgHealthScore: 0 },
    tasks: taskMetrics || { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, avgCycleTime: 0, throughput: 0 },
    team: teamMetrics || { totalMembers: 0, activeMembers: 0, avgProductivity: 0, collaborationIndex: 0 },
    time: timeMetrics || { totalHours: 0, billableHours: 0, avgTimePerTask: 0, timeUtilization: 0 },
  };
}

async function getAdvancedProjectHealth(baseConditions: any[], period: any): Promise<AdvancedProjectHealth[]> {
  const db = getDatabase();
  
  const projectHealthData = await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
      createdAt: projectTable.createdAt,
      totalTasks: sql<number>`COUNT(${taskTable.id})`,
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      overdueTasks: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN 1 END)`,
      teamSize: sql<number>`COUNT(DISTINCT ${taskTable.userEmail})`,
      avgTimePerTask: sql<number>`AVG(CASE WHEN ${timeEntryTable.duration} > 0 THEN ${timeEntryTable.duration} END) / 3600`,
    })
    .from(projectTable)
    .leftJoin(taskTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(timeEntryTable, eq(timeEntryTable.taskId, taskTable.id))
    .where(baseConditions.length === 1 ? baseConditions[0] : and(...baseConditions))
    .groupBy(projectTable.id, projectTable.name, projectTable.slug, projectTable.createdAt);

  return projectHealthData.map(project => {
    const completion = project.totalTasks > 0 ? (project.completedTasks / project.totalTasks) * 100 : 0;
    const overdueRatio = project.totalTasks > 0 ? project.overdueTasks / project.totalTasks : 0;
    
    // Advanced health scoring
    let healthScore = 100;
    healthScore -= overdueRatio * 30; // Penalty for overdue tasks
    healthScore -= (100 - completion) * 0.5; // Penalty for incomplete work
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    let health: "excellent" | "good" | "warning" | "critical" | "at_risk";
    if (healthScore >= 90) health = "excellent";
    else if (healthScore >= 75) health = "good";
    else if (healthScore >= 60) health = "warning";
    else if (healthScore >= 40) health = "critical";
    else health = "at_risk";

    // Risk factor analysis
    const riskFactors = [];
    if (overdueRatio > 0.2) riskFactors.push("High overdue task ratio");
    if (completion < 30) riskFactors.push("Low completion rate");
    if (project.teamSize < 2) riskFactors.push("Understaffed project");

    // Burndown trend analysis
    let burndownTrend: "ahead" | "on_track" | "behind" | "critical";
    if (completion > 80 && overdueRatio < 0.1) burndownTrend = "ahead";
    else if (completion > 60 && overdueRatio < 0.2) burndownTrend = "on_track";
    else if (completion > 30 && overdueRatio < 0.3) burndownTrend = "behind";
    else burndownTrend = "critical";

    // Project age in weeks - safely convert to timestamp
    const projectCreatedTimestamp = project.createdAt && (project.createdAt as any).getTime 
      ? (project.createdAt as any).getTime() 
      : new Date(project.createdAt).getTime();
    const projectAge = Math.max(1, (period.endTs - projectCreatedTimestamp) / (1000 * 60 * 60 * 24 * 7));
    const velocity = project.completedTasks / projectAge;

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      completion: Math.round(completion),
      health,
      healthScore: Math.round(healthScore),
      tasksCompleted: project.completedTasks,
      totalTasks: project.totalTasks,
      teamSize: project.teamSize,
      daysRemaining: null, // Would need project due dates
      overdueTasks: project.overdueTasks,
      avgTimePerTask: Math.round(project.avgTimePerTask || 0),
      velocity: Math.round(velocity * 100) / 100,
      burndownTrend,
      riskFactors,
      predictedCompletion: null, // Would need forecasting model
    };
  });
}

async function getEnhancedResourceUtilization(
  baseConditions: any[],
  workspaceId: string,
  currentPeriod: any,
  comparisonPeriod: any
): Promise<EnhancedResourceUtilization[]> {
  const db = getDatabase();
  
  const resourceData = await db
    .select({
      userEmail: userTable.email,
      userName: userTable.name,
      projectCount: sql<number>`COUNT(DISTINCT ${projectTable.id})`,
      taskCount: sql<number>`COUNT(${taskTable.id})`,
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      totalHours: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`,
    })
    .from(userTable)
    .innerJoin(workspaceUserTable, eq(workspaceUserTable.userEmail, userTable.email))
    .leftJoin(taskTable, eq(taskTable.userEmail, userTable.email))
    .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(timeEntryTable, eq(timeEntryTable.taskId, taskTable.id))
    .where(and(
      eq(workspaceUserTable.workspaceId, workspaceId),
      gte(taskTable.createdAt, new Date(currentPeriod.start)),
      lte(taskTable.createdAt, new Date(currentPeriod.end))
    ))
    .groupBy(userTable.email, userTable.name);

  return resourceData.map(user => {
    const productivity = user.totalHours > 0 ? user.completedTasks / user.totalHours : 0;
    const utilization = Math.min(100, (user.totalHours / (40 * 4)) * 100);
    const efficiency = user.taskCount > 0 ? (user.completedTasks / user.taskCount) * 100 : 0;
    
    let workloadBalance: "underutilized" | "optimal" | "overloaded" | "critical";
    if (utilization < 60) workloadBalance = "underutilized";
    else if (utilization <= 85) workloadBalance = "optimal";
    else if (utilization <= 100) workloadBalance = "overloaded";
    else workloadBalance = "critical";

    return {
      userEmail: user.userEmail,
      userName: user.userName,
      role: "Member", // Would need role data from roleAssignmentTable
      projectCount: user.projectCount,
      taskCount: user.taskCount,
      completedTasks: user.completedTasks,
      totalHours: Math.round(user.totalHours),
      utilization: Math.round(utilization),
      productivity: Math.round(productivity * 100) / 100,
      efficiency: Math.round(efficiency),
      workloadBalance,
      skillUtilization: 85, // Would need skills assessment
      collaborationScore: user.projectCount * 10, // Simple collaboration metric
      recentPerformance: {
        current: { value: efficiency },
        comparison: { value: efficiency * 0.9 }, // Mock comparison
        change: {
          absolute: efficiency * 0.1,
          percentage: 10,
          trend: "up" as const,
        },
      },
    };
  });
}

async function getTimeSeriesData(
  baseConditions: any[],
  period: any,
  granularity: string
): Promise<TimeSeriesDataPoint[]> {
  const db = getDatabase();
  const timeSeriesData: TimeSeriesDataPoint[] = [];
  
  // Determine step size based on granularity
  let stepMs: number;
  let steps: number;
  
  switch (granularity) {
    case "daily":
      stepMs = 24 * 60 * 60 * 1000;
      steps = Math.ceil((period.endTs - period.startTs) / stepMs);
      break;
    case "weekly":
      stepMs = 7 * 24 * 60 * 60 * 1000;
      steps = Math.ceil((period.endTs - period.startTs) / stepMs);
      break;
    case "monthly":
      stepMs = 30 * 24 * 60 * 60 * 1000;
      steps = Math.ceil((period.endTs - period.startTs) / stepMs);
      break;
    default:
      stepMs = 24 * 60 * 60 * 1000;
      steps = 30;
  }

  // Limit iterations to prevent performance issues
  const maxSteps = Math.min(steps, 100);
  
  for (let i = 0; i < maxSteps; i++) {
    const stepStartMs = period.startTs + (i * stepMs);
    const stepEndMs = Math.min(stepStartMs + stepMs, period.endTs); // Don't exceed period end
    const stepStartDate = new Date(stepStartMs);
    const stepEndDate = new Date(stepEndMs);
    
    // Format date for display - use ISO format for consistency
    const date = stepStartDate.toISOString().split('T')[0];

    // Build step-specific conditions
    // Use timestamp comparison for better database compatibility
    const stepConditions = [
      ...baseConditions,
      sql`${taskTable.createdAt} >= ${stepStartDate.toISOString()}`,
      sql`${taskTable.createdAt} < ${stepEndDate.toISOString()}`
    ];

    try {
      const stepResult = await db
        .select({
          tasksCreated: count(),
          tasksCompleted: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
          hoursLogged: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`,
          activeUsers: sql<number>`COUNT(DISTINCT ${taskTable.userEmail})`,
        })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .leftJoin(timeEntryTable, eq(timeEntryTable.taskId, taskTable.id))
        .where(stepConditions.length === 1 ? stepConditions[0] : and(...stepConditions));

      const stepData = stepResult[0] || { tasksCreated: 0, tasksCompleted: 0, hoursLogged: 0, activeUsers: 0 };
      
      // Calculate derived metrics
      const productivity = stepData.tasksCreated > 0 ? (stepData.tasksCompleted / stepData.tasksCreated) * 100 : 0;
      const burnRate = stepData.activeUsers > 0 ? stepData.hoursLogged / stepData.activeUsers : 0;
      const velocity = stepData.tasksCompleted;

      timeSeriesData.push({
        date,
        timestamp: stepStartMs,
        tasksCreated: stepData.tasksCreated,
        tasksCompleted: stepData.tasksCompleted,
        hoursLogged: Math.round(stepData.hoursLogged * 100) / 100,
        activeUsers: stepData.activeUsers,
        productivity: Math.round(productivity * 10) / 10,
        burnRate: Math.round(burnRate * 100) / 100,
        velocity,
      });
    } catch (error) {
      logger.error(`Error fetching time series data for step ${i}:`, error);
      // Continue with empty data for this step
      timeSeriesData.push({
        date,
        timestamp: stepStartMs,
        tasksCreated: 0,
        tasksCompleted: 0,
        hoursLogged: 0,
        activeUsers: 0,
        productivity: 0,
        burnRate: 0,
        velocity: 0,
      });
    }
  }

  logger.debug(`📊 Generated ${timeSeriesData.length} time series data points`);
  return timeSeriesData;
}

async function getDepartmentBreakdown(baseConditions: any[], period: any) {
  // This would require department information in the schema
  // For now, return empty array
  return [];
}

function calculateComparativeData(current: any, comparison: any | null): ComparativeData {
  // Handle null/undefined comparison
  if (comparison === null || comparison === undefined) {
    const currentValue = typeof current === 'object' && current !== null ? 
      (Object.values(current)[0] as number) || 0 : 
      Number(current) || 0;
    
    return {
      current: currentValue,
      comparison: null,
      change: { absolute: 0, percentage: 0, trend: "stable" },
    };
  }

  // Extract numeric values from objects or use as-is
  const currentValue = typeof current === 'object' && current !== null ? 
    (Object.values(current)[0] as number) || 0 : 
    Number(current) || 0;
  
  const comparisonValue = typeof comparison === 'object' && comparison !== null ? 
    (Object.values(comparison)[0] as number) || 0 : 
    Number(comparison) || 0;
  
  // Calculate changes
  const absolute = currentValue - comparisonValue;
  const percentage = comparisonValue !== 0 ? (absolute / comparisonValue) * 100 : 
                     currentValue > 0 ? 100 : 0;
  
  // Determine trend with small change threshold (< 2% is stable)
  let trend: "up" | "down" | "stable";
  if (Math.abs(percentage) < 2) {
    trend = "stable";
  } else {
    trend = absolute > 0 ? "up" : "down";
  }

  return {
    current: currentValue,
    comparison: comparisonValue,
    change: { 
      absolute: Math.round(absolute * 100) / 100, 
      percentage: Math.round(percentage * 10) / 10, 
      trend 
    },
  };
}

function calculateAdvancedBenchmarks(
  currentMetrics: any,
  comparisonMetrics: any,
  projectHealth: AdvancedProjectHealth[]
): AdvancedPerformanceBenchmarks {
  const avgProjectCompletion = projectHealth.length > 0
    ? projectHealth.reduce((sum, p) => sum + p.completion, 0) / projectHealth.length
    : 0;

  const avgTaskCycleTime = currentMetrics.tasks.avgCycleTime || 0;
  const teamVelocity = projectHealth.length > 0
    ? projectHealth.reduce((sum, p) => sum + p.velocity, 0) / projectHealth.length
    : 0;
  const qualityScore = currentMetrics.tasks.completedTasks && currentMetrics.tasks.totalTasks
    ? (currentMetrics.tasks.completedTasks / currentMetrics.tasks.totalTasks) * 100
    : 0;
  const onTimeDelivery = 95; // Would calculate from actual delivery data

  const compAvgProjectCompletion = comparisonMetrics ? 
    (comparisonMetrics.tasks.completedTasks / Math.max(comparisonMetrics.tasks.totalTasks, 1)) * 100 : null;

  return {
    avgProjectCompletion: calculateComparativeData(avgProjectCompletion, compAvgProjectCompletion),
    avgTaskCycleTime: calculateComparativeData(avgTaskCycleTime, comparisonMetrics?.tasks?.avgCycleTime),
    teamVelocity: calculateComparativeData(teamVelocity, null),
    qualityScore: calculateComparativeData(qualityScore, comparisonMetrics ? 
      (comparisonMetrics.tasks.completedTasks / Math.max(comparisonMetrics.tasks.totalTasks, 1)) * 100 : null),
    onTimeDelivery: calculateComparativeData(onTimeDelivery, null),
  };
}

async function generateForecastingData(
  projectHealth: AdvancedProjectHealth[],
  timeSeriesData: TimeSeriesDataPoint[]
): Promise<ForecastingData> {
  // Simple forecasting based on current velocity
  const avgVelocity = projectHealth.reduce((sum, p) => sum + p.velocity, 0) / projectHealth.length;
  const totalRemaining = projectHealth.reduce((sum, p) => sum + (p.totalTasks - p.tasksCompleted), 0);
  
  const estimatedWeeks = totalRemaining / Math.max(avgVelocity, 1);
  const estimatedCompletion = new Date(Date.now() + estimatedWeeks * 7 * 24 * 60 * 60 * 1000);

  return {
    projectCompletionDate: estimatedCompletion.toISOString(),
    confidenceInterval: {
      low: new Date(estimatedCompletion.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      high: new Date(estimatedCompletion.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    resourceRequirements: {
      estimated: Math.ceil(totalRemaining / 10), // Simple estimate
      recommended: Math.ceil(totalRemaining / 8),
    },
    riskAssessment: {
      probability: 0.3,
      impact: "medium",
      mitigationStrategies: [
        "Increase team velocity",
        "Reduce scope where possible",
        "Add additional resources",
      ],
    },
  };
}

function generateInsights(
  projectHealth: AdvancedProjectHealth[],
  resourceData: EnhancedResourceUtilization[],
  benchmarks: AdvancedPerformanceBenchmarks
) {
  const recommendations: string[] = [];
  const alerts: Array<{ type: "warning" | "critical" | "info"; message: string; actionRequired: boolean }> = [];

  // Analyze project health
  const criticalProjects = projectHealth.filter(p => p.health === "critical" || p.health === "at_risk");
  if (criticalProjects.length > 0) {
    alerts.push({
      type: "critical",
      message: `${criticalProjects.length} projects require immediate attention`,
      actionRequired: true,
    });
    recommendations.push("Review critical projects and allocate additional resources");
  }

  // Analyze resource utilization
  const overloadedResources = resourceData.filter(r => r.workloadBalance === "overloaded" || r.workloadBalance === "critical");
  if (overloadedResources.length > 0) {
    alerts.push({
      type: "warning",
      message: `${overloadedResources.length} team members are overloaded`,
      actionRequired: true,
    });
    recommendations.push("Rebalance workload across team members");
  }

  const underutilizedResources = resourceData.filter(r => r.workloadBalance === "underutilized");
  if (underutilizedResources.length > 0) {
    recommendations.push("Consider reassigning tasks to underutilized team members");
  }

  // Analyze performance trends
  if (benchmarks.teamVelocity.change.trend === "down") {
    alerts.push({
      type: "warning",
      message: "Team velocity is decreasing compared to previous period",
      actionRequired: false,
    });
    recommendations.push("Investigate causes of velocity decline and implement improvements");
  }

  return { recommendations, alerts };
}

function calculateDataQualityScore(metrics: any, timeSeriesData: TimeSeriesDataPoint[]): number {
  let score = 100;
  
  // Reduce score for missing data
  if (!metrics.tasks.totalTasks) score -= 20;
  if (!metrics.time.totalHours) score -= 15;
  if (timeSeriesData.length < 7) score -= 25;
  
  // Reduce score for data inconsistencies
  const recentData = timeSeriesData.slice(-7);
  const hasRecentActivity = recentData.some(d => d.tasksCreated > 0 || d.hoursLogged > 0);
  if (!hasRecentActivity) score -= 30;

  return Math.max(0, Math.min(100, score));
}

export default getEnhancedAnalytics;
export type { EnhancedAnalyticsOptions, AdvancedAnalyticsResponse }; 
