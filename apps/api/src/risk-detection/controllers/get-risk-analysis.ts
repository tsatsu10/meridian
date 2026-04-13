import { getDatabase } from "../../database/connection";
import { taskTable, projectTable, userTable, workspaceTable, taskDependencies } from "../../database/schema";
import { riskAlerts } from "../../database/schema-features";
import { eq, and, lt, gte, sql, desc, count } from "drizzle-orm";
import logger from '../../utils/logger';

// @epic-2.4-risk-detection: Real-time risk analysis for project management
// @persona-sarah: PM needs early warning systems
// @persona-david: Team Lead needs proactive risk management
// @persona-jennifer: Executive needs project health insights

interface RiskAnalysisParams {
  workspaceId: string;
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all";
  projectIds?: string[];
  includeResolved?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
}

interface RiskAlert {
  id: string;
  type: 'overdue' | 'blocked' | 'resource_conflict' | 'deadline_risk' | 'dependency_chain' | 'quality_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  affectedTasks: string[];
  affectedProjects: string[];
  estimatedImpact: string;
  timeToResolve: string;
  createdAt: string;
  dueDate?: string;
  metrics?: {
    tasksAffected: number;
    daysOverdue?: number;
    blockedDuration?: number;
    riskScore: number;
  };
}

interface RiskAnalysisResult {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: RiskAlert[];
  summary: {
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
  trends: {
    riskTrend: 'improving' | 'stable' | 'worsening';
    newRisks: number;
    resolvedRisks: number;
  };
}

/**
 * Helper function to persist or update risk alerts in the database
 * Avoids creating duplicate alerts by checking for existing active alerts of the same type
 */
async function upsertRiskAlert(
  db: any,
  workspaceId: string,
  alertData: {
    type: RiskAlert['type'];
    severity: RiskAlert['severity'];
    title: string;
    description: string;
    projectId?: string;
    affectedTaskCount: number;
    riskScore: number;
    metadata: any;
  }
): Promise<number> {
  const now = new Date();

  // Check if an active alert of this type already exists for this workspace
  const existing = await db
    .select()
    .from(riskAlerts)
    .where(
      and(
        eq(riskAlerts.workspaceId, workspaceId),
        eq(riskAlerts.alertType, alertData.type),
        eq(riskAlerts.status, 'active'),
        alertData.projectId ? eq(riskAlerts.projectId, alertData.projectId) : sql`${riskAlerts.projectId} IS NULL`
      )
    )
    .limit(1);

  if (existing && existing.length > 0) {
    // Update existing alert with new metrics
    await db
      .update(riskAlerts)
      .set({
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        riskScore: alertData.riskScore,
        affectedTaskCount: alertData.affectedTaskCount,
        metadata: alertData.metadata,
        updatedAt: now,
      })
      .where(eq(riskAlerts.id, existing[0].id));

    return existing[0].id;
  } else {
    // Create new alert
    const [newAlert] = await db
      .insert(riskAlerts)
      .values({
        workspaceId,
        projectId: alertData.projectId || null,
        alertType: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        riskScore: alertData.riskScore,
        affectedTaskCount: alertData.affectedTaskCount,
        metadata: alertData.metadata,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return newAlert.id;
  }
}

export async function getRiskAnalysis(params: RiskAnalysisParams): Promise<RiskAnalysisResult> {
  const { workspaceId, timeRange = "30d", projectIds, includeResolved = false, severity } = params;

  // Initialize database connection
  const db = await getDatabase();

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0); // All time
  }

  // Get projects for the workspace first
  const projects = await db.select().from(projectTable).where(eq(projectTable.workspaceId, workspaceId));
  const projectIds_workspace = projects.map(p => p.id);
  
  logger.info(`📊 Found ${projects.length} projects in workspace ${workspaceId}`);
  
  // Get all tasks for workspace projects
  let tasks: any[] = [];
  
  if (projectIds_workspace.length > 0) {
    if (projectIds && projectIds.length > 0) {
      // Filter by specific project IDs within the workspace
      const validProjectIds = projectIds.filter(id => projectIds_workspace.includes(id));
      if (validProjectIds.length > 0) {
        tasks = await db.select().from(taskTable).where(eq(taskTable.projectId, validProjectIds[0]));
      }
    } else {
      // Get all tasks for all projects in the workspace using a subquery
      tasks = await db
        .select()
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(eq(projectTable.workspaceId, workspaceId));
      
      // Extract just the task data
      tasks = tasks.map(row => row.task);
    }
  }
  
  logger.info(`📋 Found ${tasks.length} tasks for risk analysis`);
  
  // Get users for the workspace
  const workspaceUsers = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId));
  
  const alerts: RiskAlert[] = [];
  
  // 1. Overdue Task Detection
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < now;
  });

  if (overdueTasks.length > 0) {
    const daysOverdue = Math.max(...overdueTasks.map(task => {
      const diffTime = now.getTime() - new Date(task.dueDate!).getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }));

    const alertSeverity = daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium';
    const riskScore = Math.min(100, daysOverdue * 10 + overdueTasks.length * 5);
    
    if (!severity || alertSeverity === severity) {
      // Persist alert to database
      const alertId = await upsertRiskAlert(db, workspaceId, {
        type: 'overdue',
        severity: alertSeverity,
        title: `${overdueTasks.length} Overdue Tasks Detected`,
        description: `${overdueTasks.length} tasks are past their due dates, with the oldest being ${daysOverdue} days overdue.`,
        affectedTaskCount: overdueTasks.length,
        riskScore,
        metadata: {
          affectedTasks: overdueTasks.map(t => t.id),
          affectedProjects: Array.from(new Set(overdueTasks.map(t => t.projectId))),
          daysOverdue,
          recommendation: "Immediately reassign resources or adjust project timeline. Review task priorities and consider scope reduction.",
          estimatedImpact: daysOverdue > 7 ? "Project timeline at risk, stakeholder confidence affected" : "Potential delays in dependent tasks",
          timeToResolve: daysOverdue > 7 ? "1-2 weeks" : "2-5 days",
        },
      });

      alerts.push({
        id: alertId.toString(),
        type: 'overdue',
        severity: alertSeverity,
        title: `${overdueTasks.length} Overdue Tasks Detected`,
        description: `${overdueTasks.length} tasks are past their due dates, with the oldest being ${daysOverdue} days overdue.`,
        recommendation: "Immediately reassign resources or adjust project timeline. Review task priorities and consider scope reduction.",
        affectedTasks: overdueTasks.map(t => t.id),
        affectedProjects: Array.from(new Set(overdueTasks.map(t => t.projectId))),
        estimatedImpact: daysOverdue > 7 ? "Project timeline at risk, stakeholder confidence affected" : "Potential delays in dependent tasks",
        timeToResolve: daysOverdue > 7 ? "1-2 weeks" : "2-5 days",
        createdAt: new Date().toISOString(),
        metrics: {
          tasksAffected: overdueTasks.length,
          daysOverdue,
          riskScore,
        },
      });
    }
  }

  // 2. Blocked Dependencies Detection
  const blockedTasks: any[] = [];
  
  try {
    // Get all tasks with dependencies
    const tasksWithDependencies = await db
      .select({
        taskId: taskTable.id,
        taskTitle: taskTable.title,
        taskStatus: taskTable.status,
        dependencyTaskId: taskDependencies.requiredTaskId,
        dependencyStatus: taskTable.status,
        dependencyTitle: taskTable.title,
      })
      .from(taskTable)
      .innerJoin(taskDependencies, eq(taskTable.id, taskDependencies.taskId))
      .leftJoin(taskTable, eq(taskDependencies.requiredTaskId, taskTable.id))
      .where(
        and(
          eq(taskTable.workspaceId, workspaceId),
          eq(taskTable.status, "in_progress") // Only check in-progress tasks
        )
      );

    // Find tasks blocked by incomplete dependencies
    for (const taskDep of tasksWithDependencies) {
      if (taskDep.dependencyStatus !== "completed" && taskDep.dependencyStatus !== "done") {
        blockedTasks.push({
          taskId: taskDep.taskId,
          taskTitle: taskDep.taskTitle,
          blockedBy: taskDep.dependencyTitle,
          dependencyStatus: taskDep.dependencyStatus,
        });
      }
    }
  } catch (error) {
    logger.error("Error checking blocked tasks:", error);
    // Continue without blocked task detection if there's an error
  }

  if (blockedTasks.length > 0) {
    const alertSeverity = blockedTasks.length > 5 ? 'high' : 'medium';
    const riskScore = blockedTasks.length * 15;
    
    if (!severity || alertSeverity === severity) {
      // Persist alert to database
      const alertId = await upsertRiskAlert(db, workspaceId, {
        type: 'blocked',
        severity: alertSeverity,
        title: `${blockedTasks.length} Tasks Blocked by Dependencies`,
        description: `${blockedTasks.length} tasks cannot proceed due to incomplete dependencies, creating potential bottlenecks.`,
        affectedTaskCount: blockedTasks.length,
        riskScore,
        metadata: {
          affectedTasks: blockedTasks.map(t => t.id),
          affectedProjects: Array.from(new Set(blockedTasks.map(t => t.projectId))),
          blockedDuration: 3, // Mock duration - replace with real calculation
          recommendation: "Review dependency chains and consider parallel execution where possible. Prioritize blocking tasks.",
          estimatedImpact: "Workflow bottlenecks, potential cascade delays",
          timeToResolve: "1-2 weeks",
        },
      });

      alerts.push({
        id: alertId.toString(),
        type: 'blocked',
        severity: alertSeverity,
        title: `${blockedTasks.length} Tasks Blocked by Dependencies`,
        description: `${blockedTasks.length} tasks cannot proceed due to incomplete dependencies, creating potential bottlenecks.`,
        recommendation: "Review dependency chains and consider parallel execution where possible. Prioritize blocking tasks.",
        affectedTasks: blockedTasks.map(t => t.id),
        affectedProjects: Array.from(new Set(blockedTasks.map(t => t.projectId))),
        estimatedImpact: "Workflow bottlenecks, potential cascade delays",
        timeToResolve: "1-2 weeks",
        createdAt: new Date().toISOString(),
        metrics: {
          tasksAffected: blockedTasks.length,
          blockedDuration: 3, // Mock duration
          riskScore,
        },
      });
    }
  }

  // 3. Resource Conflict Detection
  const tasksByAssignee = tasks.reduce((acc: any, task) => {
    if (task.userEmail && task.status !== 'done') {
      if (!acc[task.userEmail]) acc[task.userEmail] = [];
      acc[task.userEmail].push(task);
    }
    return acc;
  }, {});

  const overloadedAssignees = Object.entries(tasksByAssignee).filter(
    ([_, tasksArray]: [string, any]) => (tasksArray as any[]).length > 8
  );

  if (overloadedAssignees.length > 0) {
    const totalOverloadedTasks = overloadedAssignees.reduce(
      (sum, [_, tasks]) => sum + (tasks as any[]).length, 0
    );

    const alertSeverity = totalOverloadedTasks > 20 ? 'high' : 'medium';
    const riskScore = totalOverloadedTasks * 5;
    
    if (!severity || alertSeverity === severity) {
      // Persist alert to database
      const alertId = await upsertRiskAlert(db, workspaceId, {
        type: 'resource_conflict',
        severity: alertSeverity,
        title: `${overloadedAssignees.length} Team Members Overloaded`,
        description: `${overloadedAssignees.length} team members have more than 8 active tasks, risking burnout and quality issues.`,
        affectedTaskCount: totalOverloadedTasks,
        riskScore,
        metadata: {
          affectedTasks: overloadedAssignees.flatMap(([_, tasks]) => (tasks as any[]).map(t => t.id)),
          affectedProjects: Array.from(new Set(overloadedAssignees.flatMap(([_, tasks]) => (tasks as any[]).map(t => t.projectId)))),
          overloadedAssignees: overloadedAssignees.map(([email, tasks]) => ({
            email,
            taskCount: (tasks as any[]).length,
          })),
          recommendation: "Redistribute workload, consider hiring, or adjust project scope. Schedule one-on-ones with overloaded team members.",
          estimatedImpact: "Team burnout, quality degradation, potential turnover",
          timeToResolve: "2-4 weeks",
        },
      });

      alerts.push({
        id: alertId.toString(),
        type: 'resource_conflict',
        severity: alertSeverity,
        title: `${overloadedAssignees.length} Team Members Overloaded`,
        description: `${overloadedAssignees.length} team members have more than 8 active tasks, risking burnout and quality issues.`,
        recommendation: "Redistribute workload, consider hiring, or adjust project scope. Schedule one-on-ones with overloaded team members.",
        affectedTasks: overloadedAssignees.flatMap(([_, tasks]) => (tasks as any[]).map(t => t.id)),
        affectedProjects: Array.from(new Set(overloadedAssignees.flatMap(([_, tasks]) => (tasks as any[]).map(t => t.projectId)))),
        estimatedImpact: "Team burnout, quality degradation, potential turnover",
        timeToResolve: "2-4 weeks",
        createdAt: new Date().toISOString(),
        metrics: {
          tasksAffected: totalOverloadedTasks,
          riskScore,
        },
      });
    }
  }

  // 4. Project Deadline Risk
  for (const project of projects) {
    if (!project.endDate) continue;
    
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done');
    const remainingTasks = projectTasks.filter(t => t.status !== 'done');
    
    const daysToDeadline = Math.ceil(
      (new Date(project.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const completionRate = projectTasks.length > 0 ? completedTasks.length / projectTasks.length : 1;
    const estimatedDaysToComplete = remainingTasks.length * 2; // Rough estimate
    
    if (daysToDeadline > 0 && estimatedDaysToComplete > daysToDeadline) {
      const alertSeverity = daysToDeadline < 7 ? 'critical' : daysToDeadline < 14 ? 'high' : 'medium';
      const riskScore = Math.min(100, (estimatedDaysToComplete - daysToDeadline) * 10);
      
      if (!severity || alertSeverity === severity) {
        // Persist alert to database
        const alertId = await upsertRiskAlert(db, workspaceId, {
          type: 'deadline_risk',
          severity: alertSeverity,
          title: `Project "${project.name}" Deadline Risk`,
          description: `Project may miss deadline in ${daysToDeadline} days. ${remainingTasks.length} tasks remaining with estimated ${estimatedDaysToComplete} days needed.`,
          projectId: project.id,
          affectedTaskCount: remainingTasks.length,
          riskScore,
          metadata: {
            affectedTasks: remainingTasks.map(t => t.id),
            affectedProjects: [project.id],
            daysToDeadline,
            estimatedDaysToComplete,
            completionRate: Math.round(completionRate * 100),
            dueDate: project.endDate?.toISOString(),
            recommendation: "Reduce scope, add resources, or negotiate deadline extension. Focus on critical path tasks.",
            estimatedImpact: "Project delivery delay, stakeholder impact, potential penalties",
            timeToResolve: "Immediate action required",
          },
        });

        alerts.push({
          id: alertId.toString(),
          type: 'deadline_risk',
          severity: alertSeverity,
          title: `Project "${project.name}" Deadline Risk`,
          description: `Project may miss deadline in ${daysToDeadline} days. ${remainingTasks.length} tasks remaining with estimated ${estimatedDaysToComplete} days needed.`,
          recommendation: "Reduce scope, add resources, or negotiate deadline extension. Focus on critical path tasks.",
          affectedTasks: remainingTasks.map(t => t.id),
          affectedProjects: [project.id],
          estimatedImpact: "Project delivery delay, stakeholder impact, potential penalties",
          timeToResolve: "Immediate action required",
          createdAt: new Date().toISOString(),
          dueDate: project.endDate?.toISOString(),
          metrics: {
            tasksAffected: remainingTasks.length,
            riskScore,
          },
        });
      }
    }
  }

  // Calculate overall risk score
  const totalRiskScore = alerts.reduce((sum, alert) => sum + (alert.metrics?.riskScore || 0), 0);
  const avgRiskScore = alerts.length > 0 ? totalRiskScore / alerts.length : 0;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (avgRiskScore > 70 || alerts.some(a => a.severity === 'critical')) riskLevel = 'critical';
  else if (avgRiskScore > 50 || alerts.some(a => a.severity === 'high')) riskLevel = 'high';
  else if (avgRiskScore > 25 || alerts.some(a => a.severity === 'medium')) riskLevel = 'medium';

  // Generate summary
  const summary = {
    totalRisks: alerts.length,
    criticalRisks: alerts.filter(a => a.severity === 'critical').length,
    highRisks: alerts.filter(a => a.severity === 'high').length,
    mediumRisks: alerts.filter(a => a.severity === 'medium').length,
    lowRisks: alerts.filter(a => a.severity === 'low').length,
  };

  // Calculate risk trend by comparing recent vs older alerts
  let riskTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  let newRisks = 0;
  let resolvedRisks = 0;

  if (alerts.length > 0) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Count new risks (created in last 7 days)
    newRisks = alerts.filter(alert => 
      new Date(alert.createdAt) >= sevenDaysAgo
    ).length;

    // Count resolved risks (resolved in last 7 days)
    resolvedRisks = alerts.filter(alert => 
      alert.status === 'resolved' && 
      alert.resolvedAt && 
      new Date(alert.resolvedAt) >= sevenDaysAgo
    ).length;

    // Calculate trend based on risk score changes
    const recentAlerts = alerts.filter(alert => 
      new Date(alert.createdAt) >= sevenDaysAgo
    );
    const olderAlerts = alerts.filter(alert => 
      new Date(alert.createdAt) >= fourteenDaysAgo && 
      new Date(alert.createdAt) < sevenDaysAgo
    );

    if (recentAlerts.length > 0 && olderAlerts.length > 0) {
      const recentAvgRisk = recentAlerts.reduce((sum, alert) => sum + (alert.riskScore || 0), 0) / recentAlerts.length;
      const olderAvgRisk = olderAlerts.reduce((sum, alert) => sum + (alert.riskScore || 0), 0) / olderAlerts.length;
      
      const riskChange = recentAvgRisk - olderAvgRisk;
      if (riskChange > 10) riskTrend = 'worsening';
      else if (riskChange < -10) riskTrend = 'improving';
      else riskTrend = 'stable';
    }
  }

  return {
    workspaceId,
    overallRiskScore: Math.round(avgRiskScore),
    riskLevel,
    alerts,
    summary,
    trends: {
      riskTrend,
      newRisks,
      resolvedRisks,
    },
  };
} 

