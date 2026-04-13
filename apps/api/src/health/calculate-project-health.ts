import { getDatabase } from "../database/connection";
import { projectTable, taskTable } from "../database/schema";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

export interface ProjectHealthMetrics {
  score: number;
  status: "excellent" | "good" | "fair" | "critical";
  trend: "improving" | "stable" | "declining";
  factors: {
    completionRate: number;
    timelineHealth: number;
    taskHealth: number;
    resourceAllocation: number;
    riskLevel: number;
  };
  lastCalculated: string;
}

/**
 * Calculate comprehensive project health metrics
 * Uses multiple factors to determine overall project health
 */
export async function calculateProjectHealth(
  projectId: string
): Promise<ProjectHealthMetrics | null> {
  try {
    const db = getDatabase();
    // Fetch project details
    const project = await db
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .then((rows: any[]) => rows[0]);

    if (!project) {
      return null;
    }

    // Fetch all tasks for the project
    const tasks = await db
      .select()
      .from(taskTable)
      .where(eq(taskTable.projectId, projectId));

    if (!tasks || tasks.length === 0) {
      // Return baseline metrics for empty project
      return {
        score: 75,
        status: "good",
        trend: "stable",
        factors: {
          completionRate: 0,
          timelineHealth: 75,
          taskHealth: 75,
          resourceAllocation: 75,
          riskLevel: 25,
        },
        lastCalculated: new Date().toISOString(),
      };
    }

    // Calculate individual factors
    const completionRate = calculateCompletionRate(tasks);
    const timelineHealth = calculateTimelineHealth(project, tasks);
    const taskHealth = calculateTaskHealth(tasks);
    const resourceAllocation = calculateResourceAllocation(tasks);
    const riskLevel = calculateRiskLevel(tasks, project);

    // Calculate weighted score (0-100)
    const score = Math.round(
      completionRate * 0.25 +
        timelineHealth * 0.25 +
        taskHealth * 0.2 +
        resourceAllocation * 0.15 +
        (100 - riskLevel) * 0.15
    );

    // Determine status based on score
    const status = getHealthStatus(score);

    // Determine trend (default to stable - would need history for real trend)
    const trend = determineTrend(score);

    return {
      score,
      status,
      trend,
      factors: {
        completionRate,
        timelineHealth,
        taskHealth,
        resourceAllocation,
        riskLevel,
      },
      lastCalculated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error calculating project health:", error);
    return null;
  }
}

/**
 * Calculate completion rate (0-100)
 */
function calculateCompletionRate(tasks: any[]): number {
  if (tasks.length === 0) return 0;

  const completedCount = tasks.filter((t) => t.status === "done").length;
  return Math.round((completedCount / tasks.length) * 100);
}

/**
 * Calculate timeline health (0-100)
 */
function calculateTimelineHealth(project: any, tasks: any[]): number {
  let score = 100;

  // Check if project has a due date
  if (!project.dueDate) {
    return 75; // Neutral score if no due date set
  }

  const now = new Date();
  const dueDate = new Date(project.dueDate);
  const daysRemaining = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check for overdue tasks
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "done" || !t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });

  if (overdueTasks.length > 0) {
    score -= Math.min(40, overdueTasks.length * 10);
  }

  // Check project timeline
  if (daysRemaining < 0) {
    score -= Math.min(30, Math.abs(daysRemaining));
  } else if (daysRemaining < 7) {
    score -= 15;
  } else if (daysRemaining < 14) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate task health (0-100)
 */
function calculateTaskHealth(tasks: any[]): number {
  if (tasks.length === 0) return 75;

  let score = 100;

  // Quality factors
  const tasksWithoutDescription = tasks.filter((t) => !t.description).length;
  const tasksWithoutDueDate = tasks.filter((t) => !t.dueDate).length;
  const tasksWithoutAssignee = tasks.filter((t) => !t.assigneeId).length;

  // Deduct points for missing metadata
  if (tasksWithoutDescription > 0) {
    score -= Math.min(15, (tasksWithoutDescription / tasks.length) * 30);
  }

  if (tasksWithoutDueDate > 0) {
    score -= Math.min(20, (tasksWithoutDueDate / tasks.length) * 40);
  }

  if (tasksWithoutAssignee > 0) {
    score -= Math.min(15, (tasksWithoutAssignee / tasks.length) * 30);
  }

  // Prioritization quality
  const unpriorityzedTasks = tasks.filter((t) => t.priority === "medium").length;
  if (unpriorityzedTasks / tasks.length > 0.7) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate resource allocation health (0-100)
 */
function calculateResourceAllocation(tasks: any[]): number {
  if (tasks.length === 0) return 75;

  let score = 100;

  // Count unique assignees
  const assignedTasks = tasks.filter((t) => t.assigneeId);
  const uniqueAssignees = new Set(assignedTasks.map((t) => t.assigneeId)).size;

  // Check workload balance
  if (uniqueAssignees > 0) {
    const avgTasksPerAssignee = assignedTasks.length / uniqueAssignees;

    // Look for workload imbalance
    const taskCountByAssignee: { [key: string]: number } = {};
    assignedTasks.forEach((t) => {
      taskCountByAssignee[t.assigneeId] =
        (taskCountByAssignee[t.assigneeId] || 0) + 1;
    });

    const taskCounts = Object.values(taskCountByAssignee);
    const maxLoad = Math.max(...taskCounts);
    const minLoad = Math.min(...taskCounts);

    if (maxLoad > avgTasksPerAssignee * 2) {
      score -= 15; // Significant imbalance
    } else if (maxLoad > avgTasksPerAssignee * 1.5) {
      score -= 10; // Minor imbalance
    }

    // Unassigned tasks impact
    const unassignedRatio = (tasks.length - assignedTasks.length) / tasks.length;
    if (unassignedRatio > 0.3) {
      score -= Math.min(20, unassignedRatio * 30);
    }
  } else {
    // No tasks assigned
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate risk level (0-100, lower is better)
 */
function calculateRiskLevel(tasks: any[], project: any): number {
  let riskScore = 0;

  // High priority unstarted tasks = high risk
  const highPriorityTodo = tasks.filter(
    (t) => t.priority === "high" && t.status === "todo"
  );
  riskScore += highPriorityTodo.length * 10;

  // Blocked/incomplete critical path = high risk
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const blockingRisk = tasks.filter(
    (t) => t.status === "todo" && inProgressTasks.length < 2
  );
  riskScore += Math.min(15, blockingRisk.length * 3);

  // Resource constraints = medium risk
  const assignedCount = tasks.filter((t) => t.assigneeId).length;
  if (assignedCount < tasks.length * 0.5) {
    riskScore += 10;
  }

  // Timeline pressure = medium risk
  if (project.dueDate) {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (new Date(project.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remainingTasks = tasks.filter((t) => t.status !== "done").length;

    if (daysRemaining > 0 && remainingTasks > 0) {
      const tasksPerDay = remainingTasks / daysRemaining;
      if (tasksPerDay > 3) {
        riskScore += 15;
      } else if (tasksPerDay > 2) {
        riskScore += 10;
      } else if (tasksPerDay > 1) {
        riskScore += 5;
      }
    }
  }

  return Math.min(100, riskScore);
}

/**
 * Map score to health status
 */
function getHealthStatus(
  score: number
): "excellent" | "good" | "fair" | "critical" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "critical";
}

/**
 * Determine trend direction
 */
function determineTrend(score: number): "improving" | "stable" | "declining" {
  // In a real implementation, this would compare with previous health scores
  // For now, return stable
  return "stable";
}

