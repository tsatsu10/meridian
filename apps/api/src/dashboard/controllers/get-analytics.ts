import { and, eq, sql, count, avg, sum, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTable,
  taskTable,
  workspaceUserTable,
  userTable,
  activityTable,
  timeEntryTable,
} from "../../database/schema";

interface AnalyticsOptions {
  workspaceId: string;
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
  daysRemaining: number | null;
  overdueTasks: number;
  avgTimePerTask: number;
  velocity: number; // tasks completed per week
}

interface ResourceUtilization {
  userEmail: string;
  userName: string;
  projectCount: number;
  taskCount: number;
  completedTasks: number;
  totalHours: number;
  utilization: number; // percentage of available time used
  productivity: number; // tasks completed per hour
}

interface PerformanceBenchmarks {
  avgProjectCompletion: number;
  avgTaskCycleTime: number; // hours from creation to completion
  teamVelocity: number; // tasks completed per week
  qualityScore: number; // based on task completion efficiency
  onTimeDelivery: number; // percentage of tasks completed on or before due date
}

interface TimeSeriesData {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
  hoursLogged: number;
  activeUsers: number;
}

async function getAnalytics({ workspaceId, timeRange = "30d", projectIds }: AnalyticsOptions) {
  const db = getDatabase();
  // Calculate date range filter
  const now = new Date();
  let dateFilter: Date;
  
  switch (timeRange) {
    case "7d":
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      dateFilter = new Date(0); // All time
  }

  // Base conditions for filtering
  const baseConditions = [eq(projectTable.workspaceId, workspaceId)];
  if (projectIds && projectIds.length > 0) {
    baseConditions.push(sql`${projectTable.id} IN (${projectIds.map(id => `'${id}'`).join(",")})`);
  }

  // 1. Executive Metrics
  const [projectMetrics] = await db
    .select({
      totalProjects: count(),
      // Note: Project status field doesn't exist in schema, so we'll calculate based on task completion
      activeProjects: sql<number>`COUNT(DISTINCT ${projectTable.id})`,
      completedProjects: sql<number>`0`, // Will calculate separately
      projectsAtRisk: sql<number>`0`, // Will calculate separately
    })
    .from(projectTable)
    .where(and(...baseConditions));

  const [taskMetrics] = await db
    .select({
      totalTasks: count(),
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      inProgressTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'in-progress' THEN 1 END)`,
      overdueTasks: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN 1 END)`,
      avgCompletionTime: sql<number>`AVG(CASE WHEN ${taskTable.status} = 'done' THEN ${taskTable.createdAt} END)`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...baseConditions, sql`${taskTable.createdAt} >= ${dateFilter.getTime()}`));

  const [teamMetrics] = await db
    .select({
      totalMembers: count(),
      // Note: lastActiveAt doesn't exist, so we'll count all members as active
      activeMembers: count(),
    })
    .from(workspaceUserTable)
    .innerJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
    .where(eq(workspaceUserTable.workspaceId, workspaceId));

  // 2. Time Metrics
  const [timeMetrics] = await db
    .select({
      totalHours: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`, // Convert seconds to hours
      billableHours: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`, // No billable field, so treat all as billable
      avgTimePerTask: sql<number>`AVG(${timeEntryTable.duration}) / 3600`,
    })
    .from(timeEntryTable)
    .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...baseConditions, sql`${timeEntryTable.createdAt} >= ${dateFilter.getTime()}`));

  // 3. Project Health Analysis
  const projectHealthData = await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
      createdAt: projectTable.createdAt,
      totalTasks: sql<number>`COUNT(DISTINCT ${taskTable.id})`,
      completedTasks: sql<number>`COUNT(DISTINCT CASE WHEN ${taskTable.status} = 'done' THEN ${taskTable.id} END)`,
      overdueTasks: sql<number>`COUNT(DISTINCT CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN ${taskTable.id} END)`,
      teamSize: sql<number>`COUNT(DISTINCT ${taskTable.userEmail})`,
      avgTimePerTask: sql<number>`AVG(CASE WHEN ${timeEntryTable.duration} > 0 THEN ${timeEntryTable.duration} END) / 3600`,
    })
    .from(projectTable)
    .leftJoin(taskTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(timeEntryTable, eq(timeEntryTable.taskId, taskTable.id))
    .where(and(...baseConditions))
    .groupBy(projectTable.id, projectTable.name, projectTable.slug, projectTable.createdAt);

  // Calculate project health scores
  const projectHealth: ProjectHealth[] = projectHealthData.map(project => {
    const completion = project.totalTasks > 0 ? (project.completedTasks / project.totalTasks) * 100 : 0;
    const overdueRatio = project.totalTasks > 0 ? project.overdueTasks / project.totalTasks : 0;
    
    let health: "good" | "warning" | "critical" = "good";
    if (overdueRatio > 0.3 || completion < 30) {
      health = "critical";
    } else if (overdueRatio > 0.1 || completion < 70) {
      health = "warning";
    }

    // Since dueDate doesn't exist on projects, we'll set to null
    const daysRemaining = null;

    // Calculate velocity (tasks completed per week)
    const projectAge = Math.max(1, (Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const velocity = project.completedTasks / projectAge;

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      completion: Math.round(completion),
      health,
      tasksCompleted: project.completedTasks,
      totalTasks: project.totalTasks,
      teamSize: project.teamSize,
      daysRemaining,
      overdueTasks: project.overdueTasks,
      avgTimePerTask: Math.round(project.avgTimePerTask || 0),
      velocity: Math.round(velocity * 100) / 100,
    };
  });

  // Update project metrics based on calculated health
  const completedProjects = projectHealth.filter(p => p.completion === 100).length;
  const projectsAtRisk = projectHealth.filter(p => p.health === 'critical').length;

  // 4. Resource Utilization
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
      sql`${taskTable.createdAt} >= ${dateFilter.getTime()} OR ${taskTable.createdAt} IS NULL`
    ))
    .groupBy(userTable.email, userTable.name);

  const resourceUtilization: ResourceUtilization[] = resourceData.map(user => {
    const productivity = user.totalHours > 0 ? user.completedTasks / user.totalHours : 0;
    const utilization = Math.min(100, (user.totalHours / (40 * 4)) * 100); // Assuming 40 hours per week, 4 weeks
    
    return {
      userEmail: user.userEmail,
      userName: user.userName,
      projectCount: user.projectCount,
      taskCount: user.taskCount,
      completedTasks: user.completedTasks,
      totalHours: Math.round(user.totalHours),
      utilization: Math.round(utilization),
      productivity: Math.round(productivity * 100) / 100,
    };
  });

  // 5. Performance Benchmarks
  const avgProjectCompletion = projectHealth.length > 0 
    ? Math.round(projectHealth.reduce((sum, p) => sum + p.completion, 0) / projectHealth.length)
    : 0;

  const avgTaskCycleTime = taskMetrics?.avgCompletionTime 
    ? Math.round(taskMetrics.avgCompletionTime / (1000 * 60 * 60)) // Convert to hours
    : 0;

  const teamVelocity = projectHealth.length > 0
    ? Math.round((projectHealth.reduce((sum, p) => sum + p.velocity, 0) / projectHealth.length) * 100) / 100
    : 0;

  // Calculate quality score based on task completion efficiency
  const qualityScore = (taskMetrics?.totalTasks || 0) > 0 
    ? Math.round(((taskMetrics?.completedTasks || 0) / (taskMetrics?.totalTasks || 1)) * 100)
    : 100;

  // Calculate on-time delivery
  const deliveryResult = await db
    .select({
      totalWithDueDate: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} IS NOT NULL AND ${taskTable.status} = 'done' THEN 1 END)`,
      onTime: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} IS NOT NULL AND ${taskTable.status} = 'done' AND ${taskTable.createdAt} <= ${taskTable.dueDate} THEN 1 END)`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...baseConditions, sql`${taskTable.createdAt} >= ${dateFilter.getTime()}`));

  const deliveryData = deliveryResult[0] || { totalWithDueDate: 0, onTime: 0 };
  
  const onTimeDelivery = deliveryData.totalWithDueDate > 0
    ? Math.round((deliveryData.onTime / deliveryData.totalWithDueDate) * 100)
    : 100;

  const performanceBenchmarks: PerformanceBenchmarks = {
    avgProjectCompletion,
    avgTaskCycleTime,
    teamVelocity,
    qualityScore,
    onTimeDelivery,
  };

  // 6. Time Series Data for Charts (last 30 days)
  const timeSeriesData: TimeSeriesData[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayStartTimestamp = new Date(dateStr).getTime();
    const dayEndTimestamp = dayStartTimestamp + 24 * 60 * 60 * 1000;
    
    const dayResult = await db
      .select({
        tasksCreated: sql<number>`COUNT(CASE WHEN ${taskTable.createdAt} >= ${dayStartTimestamp} AND ${taskTable.createdAt} < ${dayEndTimestamp} THEN 1 END)`,
        tasksCompleted: sql<number>`COUNT(CASE WHEN ${taskTable.createdAt} >= ${dayStartTimestamp} AND ${taskTable.createdAt} < ${dayEndTimestamp} AND ${taskTable.status} = 'done' THEN 1 END)`,
        hoursLogged: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntryTable.createdAt} >= ${dayStartTimestamp} AND ${timeEntryTable.createdAt} < ${dayEndTimestamp} THEN ${timeEntryTable.duration} END), 0) / 3600`,
        activeUsers: sql<number>`COUNT(DISTINCT CASE WHEN ${taskTable.createdAt} >= ${dayStartTimestamp} AND ${taskTable.createdAt} < ${dayEndTimestamp} THEN ${taskTable.userEmail} END)`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .leftJoin(timeEntryTable, eq(timeEntryTable.taskId, taskTable.id))
      .where(and(...baseConditions));

    const dayData = dayResult[0] || { tasksCreated: 0, tasksCompleted: 0, hoursLogged: 0, activeUsers: 0 };

    timeSeriesData.push({
      date: dateStr,
      tasksCreated: dayData.tasksCreated,
      tasksCompleted: dayData.tasksCompleted,
      hoursLogged: Math.round(dayData.hoursLogged * 10) / 10,
      activeUsers: dayData.activeUsers,
    });
  }

  // Calculate productivity percentage with safe fallbacks
  const productivity = (taskMetrics?.totalTasks || 0) > 0 
    ? Math.round(((taskMetrics?.completedTasks || 0) / (taskMetrics?.totalTasks || 1)) * 100)
    : 0;

  const timeUtilization = (timeMetrics?.totalHours || 0) > 0 && (teamMetrics?.totalMembers || 0) > 0
    ? Math.round(((timeMetrics?.totalHours || 0) / ((teamMetrics?.totalMembers || 1) * 40 * 4)) * 100) // 40 hours/week, 4 weeks
    : 0;

  return {
    // Executive Dashboard Metrics
    projectMetrics: {
      totalProjects: projectMetrics?.totalProjects || 0,
      activeProjects: projectMetrics?.activeProjects || 0,
      completedProjects,
      projectsAtRisk,
    },
    taskMetrics: {
      totalTasks: taskMetrics?.totalTasks || 0,
      completedTasks: taskMetrics?.completedTasks || 0,
      inProgressTasks: taskMetrics?.inProgressTasks || 0,
      overdueTasks: taskMetrics?.overdueTasks || 0,
    },
    teamMetrics: {
      totalMembers: teamMetrics?.totalMembers || 0,
      activeMembers: teamMetrics?.activeMembers || 0,
      avgProductivity: productivity,
      teamEfficiency: qualityScore,
    },
    timeMetrics: {
      totalHours: Math.round(timeMetrics?.totalHours || 0),
      billableHours: Math.round(timeMetrics?.billableHours || 0),
      avgTimePerTask: Math.round((timeMetrics?.avgTimePerTask || 0) * 10) / 10,
      timeUtilization,
    },
    
    // Portfolio Overview
    projectHealth,
    
    // Resource Utilization
    resourceUtilization,
    
    // Performance Benchmarks
    performanceBenchmarks,
    
    // Time Series Data for Charts
    timeSeriesData,
    
    // Summary
    summary: {
      timeRange,
      generatedAt: new Date().toISOString(),
      totalProjects: projectMetrics?.totalProjects || 0,
      totalTasks: taskMetrics?.totalTasks || 0,
      totalMembers: teamMetrics?.totalMembers || 0,
      overallHealth: projectHealth.length > 0 
        ? Math.round(projectHealth.filter(p => p.health === 'good').length / projectHealth.length * 100)
        : 100,
    },
  };
}

export default getAnalytics; 
