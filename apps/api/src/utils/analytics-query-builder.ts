/**
 * Consolidated Analytics Query Builder
 * Eliminates duplication in analytics controllers
 */

import { getDatabase } from "../database/connection";
import { taskTable, projectTable, timeEntryTable, workspaceUserTable, workspaceTable } from '../database/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { getTimeRangeInfo, TimeRangeType } from './analytics-helpers';

export interface AnalyticsQueryOptions {
  timeRange: TimeRangeType;
  workspaceId?: string;
  projectId?: string;
  projectIds?: string[];
}

export interface TaskMetrics {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  highPriority: number;
}

export interface TimeMetrics {
  totalHours: number;
  avgCompletionTime: number;
  efficiency: number;
}

export interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  pendingMembers?: number;
  avgProductivity: number;
  collaboration: number;
}

export interface TrendData {
  date: string;
  label?: string;
  tasks?: number;
  created?: number;
  completed?: number;
  hours?: number;
  cumulative?: number;
  value?: number;
}

export class AnalyticsQueryBuilder {
  private options: AnalyticsQueryOptions;
  private timeInfo: ReturnType<typeof getTimeRangeInfo>;

  constructor(options: AnalyticsQueryOptions) {
    this.options = options;
    this.timeInfo = getTimeRangeInfo(options.timeRange);
  }

  /**
   * Get all tasks based on query options
   */
  async getTasks() {
    const db = await getDatabase();
    let query = db
      .select({
        id: taskTable.id,
        status: taskTable.status,
        priority: taskTable.priority,
        dueDate: taskTable.dueDate,
        createdAt: taskTable.createdAt,
        projectId: taskTable.projectId
      })
      .from(taskTable);

    if (this.options.projectId) {
      query = query.where(eq(taskTable.projectId, this.options.projectId));
    } else if (this.options.projectIds) {
      query = query.where(inArray(taskTable.projectId, this.options.projectIds));
    } else if (this.options.workspaceId) {
      query = query
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(eq(projectTable.workspaceId, this.options.workspaceId));
    }

    return await query;
  }

  /**
   * Calculate task metrics from tasks
   */
  calculateTaskMetrics(tasks: any[]): TaskMetrics {
    const now = this.timeInfo.endDate;
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'doing').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length,
      highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length
    };
  }

  /**
   * Get time entries based on query options
   */
  async getTimeEntries() {
    const db = await getDatabase();
    let query = db
      .select({
        duration: timeEntryTable.duration,
        createdAt: timeEntryTable.createdAt
      })
      .from(timeEntryTable)
      .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
      .where(gte(timeEntryTable.createdAt, this.timeInfo.startDate));

    if (this.options.projectId) {
      query = query.where(
        and(
          eq(taskTable.projectId, this.options.projectId),
          gte(timeEntryTable.createdAt, this.timeInfo.startDate)
        )
      );
    } else if (this.options.workspaceId) {
      query = query
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(
          and(
            eq(projectTable.workspaceId, this.options.workspaceId),
            gte(timeEntryTable.createdAt, this.timeInfo.startDate)
          )
        );
    }

    return await query;
  }

  /**
   * Calculate time metrics from time entries and task metrics
   */
  calculateTimeMetrics(timeEntries: any[], taskMetrics: TaskMetrics): TimeMetrics {
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const avgCompletionTime = taskMetrics.completed > 0 ? totalHours / taskMetrics.completed : 0;
    const efficiency = taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0;

    return {
      totalHours,
      avgCompletionTime,
      efficiency
    };
  }

  /**
   * Get team metrics for workspace
   */
  async getTeamMetrics(workspaceId: string): Promise<TeamMetrics> {
    const db = await getDatabase();
    const teamMembers = await db
      .select({
        userEmail: workspaceUserTable.userEmail,
        role: workspaceUserTable.role
      })
      .from(workspaceUserTable)
      .where(eq(workspaceUserTable.workspaceId, workspaceId));

    const totalMembers = teamMembers.length;
    const activeMembers = totalMembers; // Assume all workspace members are active for analytics
    const pendingMembers = 0; // Not available without status column

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      avgProductivity: Math.min(100, activeMembers * 15),
      collaboration: Math.min(100, activeMembers * 15)
    };
  }

  /**
   * Generate trend data for the time range
   */
  generateTrendData(tasks: any[], timeEntries?: any[]): TrendData[] {
    const trend: TrendData[] = [];
    const { daysBack, endDate: now } = this.timeInfo;

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const tasksCreated = tasks.filter(t => 
        t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === dateStr
      ).length;
      
      const tasksCompleted = tasks.filter(t => 
        t.status === 'completed' && t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === dateStr
      ).length;

      const cumulative = tasks.filter(t => 
        t.createdAt && new Date(t.createdAt) <= date
      ).length;

      const trendData: TrendData = {
        date: dateStr,
        label,
        tasks: tasksCreated,
        created: tasksCreated,
        completed: tasksCompleted,
        cumulative,
        value: tasksCompleted
      };

      // Add time data if available
      if (timeEntries) {
        const dayTimeEntries = timeEntries.filter(t => 
          t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === dateStr
        );
        trendData.hours = dayTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
      }

      trend.push(trendData);
    }

    return trend;
  }

  /**
   * Calculate project health score
   */
  calculateProjectHealth(taskMetrics: TaskMetrics, timeMetrics: TimeMetrics): {
    score: number;
    riskFactors: string[];
  } {
    const completionRate = taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0;
    const onTimeRate = taskMetrics.total > 0 ? ((taskMetrics.total - taskMetrics.overdue) / taskMetrics.total) * 100 : 100;
    
    const score = Math.round((completionRate * 0.4) + (onTimeRate * 0.3) + (timeMetrics.efficiency * 0.3));
    
    const riskFactors: string[] = [
      ...(taskMetrics.overdue > 0 ? [`${taskMetrics.overdue} overdue tasks`] : []),
      ...(completionRate < 50 ? ['Low completion rate'] : []),
      ...(timeMetrics.efficiency < 30 ? ['Low efficiency'] : [])
    ];

    return { score, riskFactors };
  }
}

