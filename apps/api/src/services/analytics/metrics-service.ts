/**
 * Metrics Service
 * Real-time analytics and performance metrics
 * Phase 2.3 - Live Metrics & Real-Time Analytics
 */

import { getDatabase } from '../../database/connection';
import { tasks, projects, users } from '../../database/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { CacheService } from '../cache/cache-service';
import { logger } from '../logging/logger';

const cacheService = new CacheService();

interface TaskMetrics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  completed: number;
  inProgress: number;
  blocked: number;
  completionRate: number;
}

interface ProjectMetrics {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  health: 'excellent' | 'good' | 'at-risk' | 'critical';
  averageProgress: number;
  totalTasks: number;
  completedTasks: number;
}

interface CollaborationMetrics {
  activeUsers: number;
  onlineUsers: number;
  totalComments: number;
  commentsToday: number;
  totalKudos: number;
  kudosToday: number;
  recentActivity: any[];
}

interface PerformanceMetrics {
  averageTaskCompletionTime: number; // hours
  averageResponseTime: number; // hours
  velocityTrend: 'up' | 'down' | 'stable';
  burndownRate: number;
  throughput: number; // tasks per week
}

export class MetricsService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Get comprehensive task metrics
   */
  async getTaskMetrics(workspaceId: string, projectId?: string): Promise<TaskMetrics> {
    try {
      const cacheKey = `task-metrics:${workspaceId}${projectId ? `:${projectId}` : ''}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const conditions = [eq(tasks.workspaceId, workspaceId)];
      if (projectId) {
        conditions.push(eq(tasks.projectId, projectId));
      }

      // Get all tasks
      const taskList = await this.getDb()
        .select()
        .from(tasks)
        .where(and(...conditions));

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calculate metrics
      const metrics: TaskMetrics = {
        total: taskList.length,
        byStatus: {},
        byPriority: {},
        overdue: 0,
        dueToday: 0,
        dueTomorrow: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
        completionRate: 0,
      };

      taskList.forEach((t) => {
        // Status distribution
        const status = t.status || 'pending';
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;

        // Priority distribution
        const priority = t.priority || 'medium';
        metrics.byPriority[priority] = (metrics.byPriority[priority] || 0) + 1;

        // Status counters
        if (status === 'completed' || status === 'done') metrics.completed++;
        if (status === 'in_progress' || status === 'in-progress') metrics.inProgress++;
        if (status === 'blocked') metrics.blocked++;

        // Due date tracking
        if (t.dueDate) {
          const dueDate = new Date(t.dueDate);
          if (dueDate < now && status !== 'completed') {
            metrics.overdue++;
          } else if (dueDate >= today && dueDate < tomorrow) {
            metrics.dueToday++;
          } else if (dueDate >= tomorrow && dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
            metrics.dueTomorrow++;
          }
        }
      });

      // Completion rate
      metrics.completionRate = metrics.total > 0
        ? Math.round((metrics.completed / metrics.total) * 100)
        : 0;

      // Cache for 2 minutes
      await cacheService.set(cacheKey, metrics, 120);

      return metrics;
    } catch (error: any) {
      logger.error('Failed to get task metrics', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Get project-level metrics
   */
  async getProjectMetrics(workspaceId: string): Promise<ProjectMetrics> {
    try {
      const cacheKey = `project-metrics:${workspaceId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Get all projects
      const projectList = await this.getDb()
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId));

      // Get task counts for each project
      const taskCounts = await this.getDb()
        .select({
          projectId: tasks.projectId,
          total: sql<number>`count(*)`,
          completed: sql<number>`sum(case when ${tasks.status} in ('completed', 'done') then 1 else 0 end)`,
        })
        .from(tasks)
        .where(eq(tasks.workspaceId, workspaceId))
        .groupBy(tasks.projectId);

      const taskCountMap = new Map(
        taskCounts.map((tc) => [tc.projectId, { total: tc.total, completed: tc.completed }])
      );

      // Calculate metrics
      let totalTasks = 0;
      let completedTasks = 0;
      let totalProgress = 0;
      let healthyProjects = 0;

      const metrics: ProjectMetrics = {
        total: projectList.length,
        active: 0,
        completed: 0,
        onHold: 0,
        health: 'good',
        averageProgress: 0,
        totalTasks: 0,
        completedTasks: 0,
      };

      projectList.forEach((p) => {
        const status = p.status || 'active';
        if (status === 'active') metrics.active++;
        if (status === 'completed') metrics.completed++;
        if (status === 'on_hold' || status === 'on-hold') metrics.onHold++;

        const counts = taskCountMap.get(p.id) || { total: 0, completed: 0 };
        totalTasks += counts.total;
        completedTasks += counts.completed;

        const progress = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;
        totalProgress += progress;

        // Health calculation (simple heuristic)
        if (progress >= 75 || status === 'completed') healthyProjects++;
      });

      metrics.totalTasks = totalTasks;
      metrics.completedTasks = completedTasks;
      metrics.averageProgress = projectList.length > 0
        ? Math.round(totalProgress / projectList.length)
        : 0;

      // Overall health
      const healthRatio = projectList.length > 0 ? healthyProjects / projectList.length : 1;
      if (healthRatio >= 0.9) metrics.health = 'excellent';
      else if (healthRatio >= 0.7) metrics.health = 'good';
      else if (healthRatio >= 0.5) metrics.health = 'at-risk';
      else metrics.health = 'critical';

      // Cache for 5 minutes
      await cacheService.set(cacheKey, metrics, 300);

      return metrics;
    } catch (error: any) {
      logger.error('Failed to get project metrics', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Get collaboration metrics
   */
  async getCollaborationMetrics(workspaceId: string): Promise<CollaborationMetrics> {
    try {
      const cacheKey = `collaboration-metrics:${workspaceId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get active users (users with activity in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // This is a simplified version - would need actual activity tracking
      const metrics: CollaborationMetrics = {
        activeUsers: 0,
        onlineUsers: 0,
        totalComments: 0,
        commentsToday: 0,
        totalKudos: 0,
        kudosToday: 0,
        recentActivity: [],
      };

      // In production, would query actual comment/kudos tables
      // For now, return placeholder metrics

      // Cache for 1 minute
      await cacheService.set(cacheKey, metrics, 60);

      return metrics;
    } catch (error: any) {
      logger.error('Failed to get collaboration metrics', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(workspaceId: string, projectId?: string): Promise<PerformanceMetrics> {
    try {
      const cacheKey = `performance-metrics:${workspaceId}${projectId ? `:${projectId}` : ''}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const conditions = [eq(task.workspaceId, workspaceId)];
      if (projectId) {
        conditions.push(eq(task.projectId, projectId));
      }

      // Get completed tasks from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const completedTasks = await this.getDb()
        .select()
        .from(task)
        .where(and(
          ...conditions,
          sql`${task.status} in ('completed', 'done')`,
          gte(task.updatedAt, thirtyDaysAgo)
        ));

      // Calculate average completion time (created to completed)
      let totalCompletionTime = 0;
      let taskCount = 0;

      completedTasks.forEach((t) => {
        if (t.createdAt && t.updatedAt) {
          const completionTime = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
          totalCompletionTime += completionTime;
          taskCount++;
        }
      });

      const averageCompletionTimeMs = taskCount > 0 ? totalCompletionTime / taskCount : 0;
      const averageCompletionTimeHours = averageCompletionTimeMs / (1000 * 60 * 60);

      // Calculate throughput (tasks per week)
      const throughput = (completedTasks.length / 30) * 7;

      // Velocity trend (compare last 15 days to previous 15 days)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const recentTasks = completedTasks.filter((t) => 
        new Date(t.updatedAt) >= fifteenDaysAgo
      );
      const olderTasks = completedTasks.filter((t) => 
        new Date(t.updatedAt) < fifteenDaysAgo
      );

      let velocityTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentTasks.length > olderTasks.length * 1.1) velocityTrend = 'up';
      else if (recentTasks.length < olderTasks.length * 0.9) velocityTrend = 'down';

      const metrics: PerformanceMetrics = {
        averageTaskCompletionTime: Math.round(averageCompletionTimeHours),
        averageResponseTime: 0, // Would need comment/response data
        velocityTrend,
        burndownRate: throughput,
        throughput: Math.round(throughput * 10) / 10,
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, metrics, 600);

      return metrics;
    } catch (error: any) {
      logger.error('Failed to get performance metrics', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Get real-time dashboard data (combines all metrics)
   */
  async getDashboardMetrics(workspaceId: string, projectId?: string): Promise<any> {
    try {
      const [taskMetrics, projectMetrics, collabMetrics, perfMetrics] = await Promise.all([
        this.getTaskMetrics(workspaceId, projectId),
        this.getProjectMetrics(workspaceId),
        this.getCollaborationMetrics(workspaceId),
        this.getPerformanceMetrics(workspaceId, projectId),
      ]);

      return {
        tasks: taskMetrics,
        projects: projectMetrics,
        collaboration: collabMetrics,
        performance: perfMetrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to get dashboard metrics', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Invalidate metrics cache (call after task updates)
   */
  async invalidateCache(workspaceId: string, projectId?: string): Promise<void> {
    try {
      const keys = [
        `task-metrics:${workspaceId}`,
        `project-metrics:${workspaceId}`,
        `collaboration-metrics:${workspaceId}`,
        `performance-metrics:${workspaceId}`,
      ];

      if (projectId) {
        keys.push(
          `task-metrics:${workspaceId}:${projectId}`,
          `performance-metrics:${workspaceId}:${projectId}`
        );
      }

      await Promise.all(keys.map((key) => cacheService.delete(key)));

      logger.info('Metrics cache invalidated', { workspaceId, projectId });
    } catch (error: any) {
      logger.warn('Failed to invalidate metrics cache', { error: error.message });
    }
  }
}

export default MetricsService;



