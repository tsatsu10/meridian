/**
 * Consolidated Database Query Builders
 * Common query patterns used across multiple controllers
 */

import { eq, and, desc, sql, count, sum, avg, gte, lte, like, or, inArray } from 'drizzle-orm';
import { getDatabase } from "../database/connection";
import { 
  taskTable, 
  projectTable, 
  workspaceUserTable, 
  userTable, 
  timeEntryTable,
  activityTable,
  attachmentTable,
  notificationTable
} from '../database/schema';
import { ProjectHealthData } from './project-health-helpers';

/**
 * Standard task metrics query for a project
 */
export async function getTaskMetrics(projectId: string) {
  const db = getDatabase();
  const [result] = await db
    .select({
      totalTasks: count(),
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      inProgressTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'in-progress' THEN 1 END)`,
      overdueTasks: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN 1 END)`,
      highPriorityTasks: sql<number>`COUNT(CASE WHEN ${taskTable.priority} = 'high' OR ${taskTable.priority} = 'urgent' THEN 1 END)`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId));
  
  return result || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
  };
}

/**
 * Standard task metrics query for workspace (all projects)
 */
export async function getWorkspaceTaskMetrics(workspaceId: string, dateFilter?: Date) {
  const db = getDatabase();
  const conditions = [eq(projectTable.workspaceId, workspaceId)];
  if (dateFilter) {
    conditions.push(gte(taskTable.createdAt, dateFilter));
  }

  const [result] = await db
    .select({
      totalTasks: count(),
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      inProgressTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'in-progress' THEN 1 END)`,
      overdueTasks: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN 1 END)`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...conditions));
  
  return result || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
  };
}

/**
 * Get project health data for multiple projects
 */
export async function getProjectHealthData(workspaceId: string): Promise<ProjectHealthData[]> {
  const db = getDatabase();
  const projects = await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
      createdAt: projectTable.createdAt,
      totalTasks: sql<number>`COUNT(${taskTable.id})`,
      completedTasks: sql<number>`COUNT(CASE WHEN ${taskTable.status} = 'done' THEN 1 END)`,
      overdueTasks: sql<number>`COUNT(CASE WHEN ${taskTable.dueDate} < CURRENT_TIMESTAMP AND ${taskTable.status} != 'done' THEN 1 END)`,
      teamSize: sql<number>`COUNT(DISTINCT ${taskTable.userEmail})`,
    })
    .from(projectTable)
    .leftJoin(taskTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(projectTable.workspaceId, workspaceId))
    .groupBy(projectTable.id, projectTable.name, projectTable.slug, projectTable.createdAt);

  return projects.map(project => ({
    id: project.id,
    name: project.name,
    slug: project.slug || '',
    totalTasks: project.totalTasks,
    completedTasks: project.completedTasks,
    overdueTasks: project.overdueTasks,
    teamSize: project.teamSize,
    createdAt: project.createdAt,
    dueDate: null, // Projects don't have due dates in current schema
  }));
}

/**
 * Get team metrics for workspace
 */
export async function getTeamMetrics(workspaceId: string) {
  const db = getDatabase();
  const [result] = await db
    .select({
      totalMembers: count(),
      activeMembers: sql<number>`COUNT(CASE WHEN ${workspaceUserTable.status} = 'active' THEN 1 END)`,
    })
    .from(workspaceUserTable)
    .innerJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
    .where(eq(workspaceUserTable.workspaceId, workspaceId));
  
  return result || {
    totalMembers: 0,
    activeMembers: 0,
  };
}

/**
 * Get time metrics for project or workspace
 */
export async function getTimeMetrics(workspaceId?: string, projectId?: string, dateFilter?: Date) {
  const db = getDatabase();
  let query = db.select({
    totalHours: sql<number>`COALESCE(SUM(${timeEntryTable.duration}), 0) / 3600`,
    avgTimePerTask: sql<number>`AVG(${timeEntryTable.duration}) / 3600`,
    totalEntries: count(),
  }).from(timeEntryTable);

  const conditions = [];
  
  if (projectId) {
    query = query.innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id));
    conditions.push(eq(taskTable.projectId, projectId));
  } else if (workspaceId) {
    query = query
      .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id));
    conditions.push(eq(projectTable.workspaceId, workspaceId));
  }
  
  if (dateFilter) {
    conditions.push(gte(timeEntryTable.createdAt, dateFilter));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const [result] = await query;
  
  return result || {
    totalHours: 0,
    avgTimePerTask: 0,
    totalEntries: 0,
  };
}

/**
 * Get activities with pagination
 */
export async function getActivitiesPaginated(
  taskId?: string,
  projectId?: string,
  limit: number = 50,
  offset: number = 0
) {
  const db = getDatabase();
  let query = db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt), desc(activityTable.id))
    .limit(limit)
    .offset(offset);

  const conditions = [];
  
  if (taskId) {
    conditions.push(eq(activityTable.taskId, taskId));
  }
  
  // If we need project-level activities, we'd need to join with tasks
  if (projectId && !taskId) {
    query = query.innerJoin(taskTable, eq(activityTable.taskId, taskTable.id));
    conditions.push(eq(taskTable.projectId, projectId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get attachments with filters
 */
export async function getAttachmentsFiltered(options: {
  taskId?: string;
  commentId?: string;
  userEmail?: string;
  channelId?: string;
  limit?: number;
}) {
  const { taskId, commentId, userEmail, channelId, limit = 50 } = options;
  
  const db = getDatabase();
  let query = db
    .select()
    .from(attachmentTable)
    .orderBy(desc(attachmentTable.createdAt));

  const conditions = [];
  
  if (taskId) {
    conditions.push(eq(attachmentTable.taskId, taskId));
  }
  
  if (commentId) {
    conditions.push(eq(attachmentTable.commentId, commentId));
  }
  
  if (userEmail) {
    conditions.push(eq(attachmentTable.userEmail, userEmail));
  }
  
  if (channelId) {
    conditions.push(eq(attachmentTable.channelId, channelId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return await query.limit(limit);
}

/**
 * Get notifications with pagination
 */
export async function getNotificationsPaginated(
  userEmail: string,
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
) {
  const conditions = [eq(notificationTable.userEmail, userEmail)];
  
  if (unreadOnly) {
    conditions.push(eq(notificationTable.isRead, false));
  }

  const db = getDatabase();
  return await db
    .select()
    .from(notificationTable)
    .where(and(...conditions))
    .orderBy(desc(notificationTable.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get task counts by status for projects
 */
export async function getTaskCountsByStatus(projectIds: string[]) {
  if (projectIds.length === 0) return {};
  
  const db = getDatabase();
  const results = await db
    .select({
      projectId: taskTable.projectId,
      status: taskTable.status,
      count: count(),
    })
    .from(taskTable)
    .where(inArray(taskTable.projectId, projectIds))
    .groupBy(taskTable.projectId, taskTable.status);

  // Convert to nested object structure
  const statusCounts: Record<string, Record<string, number>> = {};
  
  results.forEach(result => {
    if (!statusCounts[result.projectId]) {
      statusCounts[result.projectId] = {};
    }
    statusCounts[result.projectId][result.status] = result.count;
  });
  
  return statusCounts;
}

/**
 * Get time series data for analytics
 */
export async function getTimeSeriesData(
  workspaceId: string,
  days: number = 30,
  batchSize: number = 7
) {
  const db = getDatabase();
  const now = new Date();
  const timeSeriesData: any[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayStartTimestamp = new Date(dateStr).getTime();
    const dayEndTimestamp = dayStartTimestamp + 24 * 60 * 60 * 1000;
    
    const [dayResult] = await db
      .select({
        tasksCreated: sql<number>`COUNT(CASE WHEN ${taskTable.createdAt} >= ${dayStartTimestamp} AND ${taskTable.createdAt} < ${dayEndTimestamp} THEN 1 END)`,
        tasksCompleted: sql<number>`COUNT(CASE WHEN ${taskTable.createdAt} >= ${dayStartTimestamp} AND ${taskTable.createdAt} < ${dayEndTimestamp} AND ${taskTable.status} = 'done' THEN 1 END)`,
        activeUsers: sql<number>`COUNT(DISTINCT CASE WHEN ${taskTable.createdAt} >= ${dayStartTimestamp} AND ${taskTable.createdAt} < ${dayEndTimestamp} THEN ${taskTable.userEmail} END)`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(eq(projectTable.workspaceId, workspaceId));

    timeSeriesData.push({
      date: dateStr,
      tasksCreated: dayResult?.tasksCreated || 0,
      tasksCompleted: dayResult?.tasksCompleted || 0,
      activeUsers: dayResult?.activeUsers || 0,
    });
  }
  
  return timeSeriesData;
}

