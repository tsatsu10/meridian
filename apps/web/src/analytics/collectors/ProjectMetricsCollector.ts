/**
 * @epic-6.1-advanced-analytics - Project Metrics Collector
 * @persona-all - Track project performance for analytics insights
 */

import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface ProjectMetrics {
  projectId: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalTimeSpent: number;
  averageTaskDuration: number;
  teamSize: number;
  progressPercentage: number;
  velocity: number; // tasks completed per day
  burndownRate: number;
  lastUpdated: Date;
}

export interface TaskMetrics {
  taskId: string;
  projectId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  estimatedHours: number;
  actualHours: number;
  timeSpent: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  tags: string[];
}

export interface ProjectInsight {
  type: 'performance' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: Record<string, any>;
  actionable: boolean;
  actionUrl?: string;
}

export class ProjectMetricsCollector {
  private analyticsEngine = getAnalyticsEngine();
  private projectMetrics: Map<string, ProjectMetrics> = new Map();
  private taskMetrics: Map<string, TaskMetrics> = new Map();
  private isCollecting: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Register with analytics engine
    this.analyticsEngine.registerCollector('projectMetrics', this);
    
    logger.info('Project Metrics Collector initialized');
  }

  /**
   * Start collecting project metrics
   */
  startCollecting(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.analyticsEngine.emit('collectorStarted', { name: 'projectMetrics' });
    
    logger.info('Project metrics collection started');
  }

  /**
   * Stop collecting project metrics
   */
  stopCollecting(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    this.analyticsEngine.emit('collectorStopped', { name: 'projectMetrics' });
    
    logger.info('Project metrics collection stopped');
  }

  /**
   * Track project creation
   */
  async trackProjectCreated(
    projectId: string,
    data: {
      name: string;
      workspaceId: string;
      createdBy: string;
      startDate?: Date;
      endDate?: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.trackEvent('project_created', {
      projectId,
      name: data.name,
      workspaceId: data.workspaceId,
      createdBy: data.createdBy,
      startDate: data.startDate,
      endDate: data.endDate,
      metadata: data.metadata,
    }, {
      userId: data.createdBy,
      workspaceId: data.workspaceId,
      projectId,
    });

    // Initialize project metrics
    this.initializeProjectMetrics(projectId, data.name);

    logger.debug('Project creation tracked', { projectId, name: data.name });
  }

  /**
   * Track task creation
   */
  async trackTaskCreated(
    taskId: string,
    projectId: string,
    data: {
      title: string;
      assigneeId?: string;
      priority: string;
      estimatedHours: number;
      dueDate?: Date;
      tags: string[];
      createdBy: string;
    }
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.trackEvent('task_created', {
      taskId,
      projectId,
      title: data.title,
      assigneeId: data.assigneeId,
      priority: data.priority,
      estimatedHours: data.estimatedHours,
      dueDate: data.dueDate,
      tags: data.tags,
      createdBy: data.createdBy,
    }, {
      userId: data.createdBy,
      projectId,
    });

    // Add task metrics
    const taskMetrics: TaskMetrics = {
      taskId,
      projectId,
      title: data.title,
      status: 'todo',
      priority: data.priority as any,
      assigneeId: data.assigneeId,
      estimatedHours: data.estimatedHours,
      actualHours: 0,
      timeSpent: 0,
      createdAt: new Date(),
      tags: data.tags,
    };

    this.taskMetrics.set(taskId, taskMetrics);
    this.updateProjectMetrics(projectId);

    logger.debug('Task creation tracked', { taskId, projectId, title: data.title });
  }

  /**
   * Track task status change
   */
  async trackTaskStatusChange(
    taskId: string,
    projectId: string,
    data: {
      oldStatus: string;
      newStatus: string;
      changedBy: string;
      timestamp: Date;
    }
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.trackEvent('task_status_changed', {
      taskId,
      projectId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      changedBy: data.changedBy,
      timestamp: data.timestamp,
    }, {
      userId: data.changedBy,
      projectId,
    });

    // Update task metrics
    const task = this.taskMetrics.get(taskId);
    if (task) {
      task.status = data.newStatus as any;
      
      if (data.newStatus === 'in_progress' && !task.startedAt) {
        task.startedAt = data.timestamp;
      } else if (data.newStatus === 'completed' && !task.completedAt) {
        task.completedAt = data.timestamp;
      }

      this.taskMetrics.set(taskId, task);
      this.updateProjectMetrics(projectId);
    }

    logger.debug('Task status change tracked', { 
      taskId, 
      projectId, 
      oldStatus: data.oldStatus, 
      newStatus: data.newStatus 
    });
  }

  /**
   * Track time spent on task
   */
  async trackTaskTimeSpent(
    taskId: string,
    projectId: string,
    data: {
      timeSpent: number;
      userId: string;
      sessionId?: string;
    }
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.recordMetric('task_time_spent', data.timeSpent, {
      unit: 'ms',
      dimensions: { taskId, projectId, userId: data.userId },
    });

    // Update task metrics
    const task = this.taskMetrics.get(taskId);
    if (task) {
      task.timeSpent += data.timeSpent;
      task.actualHours = task.timeSpent / (1000 * 60 * 60); // Convert to hours
      this.taskMetrics.set(taskId, task);
      this.updateProjectMetrics(projectId);
    }

    logger.debug('Task time spent tracked', { 
      taskId, 
      projectId, 
      timeSpent: data.timeSpent,
      userId: data.userId 
    });
  }

  /**
   * Track project milestone completion
   */
  async trackMilestoneCompleted(
    milestoneId: string,
    projectId: string,
    data: {
      name: string;
      completedBy: string;
      completedAt: Date;
      tasksCompleted: number;
      totalTasks: number;
    }
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.trackEvent('milestone_completed', {
      milestoneId,
      projectId,
      name: data.name,
      completedBy: data.completedBy,
      completedAt: data.completedAt,
      tasksCompleted: data.tasksCompleted,
      totalTasks: data.totalTasks,
      completionRate: (data.tasksCompleted / data.totalTasks) * 100,
    }, {
      userId: data.completedBy,
      projectId,
    });

    logger.debug('Milestone completion tracked', { 
      milestoneId, 
      projectId, 
      name: data.name,
      completionRate: (data.tasksCompleted / data.totalTasks) * 100 
    });
  }

  /**
   * Get project metrics
   */
  getProjectMetrics(projectId: string): ProjectMetrics | null {
    return this.projectMetrics.get(projectId) || null;
  }

  /**
   * Get all project metrics
   */
  getAllProjectMetrics(): ProjectMetrics[] {
    return Array.from(this.projectMetrics.values());
  }

  /**
   * Get task metrics for a project
   */
  getProjectTaskMetrics(projectId: string): TaskMetrics[] {
    return Array.from(this.taskMetrics.values())
      .filter(task => task.projectId === projectId);
  }

  /**
   * Get project performance insights
   */
  async generateProjectInsights(projectId: string): Promise<ProjectInsight[]> {
    const metrics = this.getProjectMetrics(projectId);
    if (!metrics) {
      return [];
    }

    const insights: ProjectInsight[] = [];

    // Progress analysis
    if (metrics.progressPercentage < 25 && metrics.totalTasks > 10) {
      insights.push({
        type: 'performance',
        title: 'Low Project Progress',
        description: `Project is only ${metrics.progressPercentage.toFixed(1)}% complete with ${metrics.totalTasks} total tasks`,
        severity: 'high',
        data: { progressPercentage: metrics.progressPercentage, totalTasks: metrics.totalTasks },
        actionable: true,
        actionUrl: `/projects/${projectId}/tasks`,
      });
    }

    // Overdue tasks analysis
    if (metrics.overdueTasks > 0) {
      const overduePercentage = (metrics.overdueTasks / metrics.totalTasks) * 100;
      insights.push({
        type: 'anomaly',
        title: 'Overdue Tasks Detected',
        description: `${metrics.overdueTasks} tasks (${overduePercentage.toFixed(1)}%) are overdue`,
        severity: overduePercentage > 20 ? 'critical' : 'medium',
        data: { overdueTasks: metrics.overdueTasks, overduePercentage },
        actionable: true,
        actionUrl: `/projects/${projectId}/tasks?status=overdue`,
      });
    }

    // Velocity analysis
    if (metrics.velocity < 0.5 && metrics.totalTasks > 5) {
      insights.push({
        type: 'trend',
        title: 'Low Project Velocity',
        description: `Project velocity is ${metrics.velocity.toFixed(2)} tasks per day, consider reviewing task assignments`,
        severity: 'medium',
        data: { velocity: metrics.velocity },
        actionable: true,
        actionUrl: `/projects/${projectId}/analytics`,
      });
    }

    // Team workload analysis
    const tasksPerTeamMember = metrics.totalTasks / metrics.teamSize;
    if (tasksPerTeamMember > 10) {
      insights.push({
        type: 'recommendation',
        title: 'High Team Workload',
        description: `Average of ${tasksPerTeamMember.toFixed(1)} tasks per team member, consider redistributing workload`,
        severity: 'medium',
        data: { tasksPerTeamMember, teamSize: metrics.teamSize },
        actionable: true,
        actionUrl: `/projects/${projectId}/team`,
      });
    }

    // Time estimation accuracy
    const tasks = this.getProjectTaskMetrics(projectId);
    const completedTasks = tasks.filter(t => t.status === 'completed');
    if (completedTasks.length > 0) {
      const estimationAccuracy = completedTasks.map(task => {
        if (task.estimatedHours === 0) return 1;
        return Math.abs(task.actualHours - task.estimatedHours) / task.estimatedHours;
      });
      
      const averageAccuracy = estimationAccuracy.reduce((sum, acc) => sum + acc, 0) / estimationAccuracy.length;
      
      if (averageAccuracy > 0.5) {
        insights.push({
          type: 'recommendation',
          title: 'Time Estimation Issues',
          description: `Time estimates are off by ${(averageAccuracy * 100).toFixed(1)}% on average`,
          severity: 'medium',
          data: { averageAccuracy },
          actionable: true,
          actionUrl: `/projects/${projectId}/analytics`,
        });
      }
    }

    return insights;
  }

  /**
   * Get project performance trends
   */
  async getProjectTrends(projectId: string, days: number = 30): Promise<{
    date: string;
    completedTasks: number;
    newTasks: number;
    timeSpent: number;
    progressPercentage: number;
  }[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const analytics = await this.analyticsEngine.getAnalytics({
      startDate,
      endDate,
      projectId,
      types: ['task_created', 'task_status_changed', 'task_time_spent'],
    });

    // Group by date
    const dailyData = new Map<string, {
      completedTasks: number;
      newTasks: number;
      timeSpent: number;
      progressPercentage: number;
    }>();

    // Initialize daily data
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      dailyData.set(dateStr, {
        completedTasks: 0,
        newTasks: 0,
        timeSpent: 0,
        progressPercentage: 0,
      });
    }

    // Process events
    analytics.events.forEach(event => {
      const dateStr = event.timestamp.toISOString().split('T')[0];
      const dayData = dailyData.get(dateStr);
      
      if (!dayData) return;

      if (event.type === 'task_created') {
        dayData.newTasks++;
      } else if (event.type === 'task_status_changed' && event.data.newStatus === 'completed') {
        dayData.completedTasks++;
      }
    });

    // Process metrics
    analytics.metrics.forEach(metric => {
      if (metric.name === 'task_time_spent') {
        const dateStr = metric.timestamp.toISOString().split('T')[0];
        const dayData = dailyData.get(dateStr);
        if (dayData) {
          dayData.timeSpent += metric.value;
        }
      }
    });

    // Calculate cumulative progress
    let cumulativeCompleted = 0;
    let cumulativeNew = 0;
    
    return Array.from(dailyData.entries()).map(([date, data]) => {
      cumulativeCompleted += data.completedTasks;
      cumulativeNew += data.newTasks;
      
      const progressPercentage = cumulativeNew > 0 
        ? (cumulativeCompleted / cumulativeNew) * 100 
        : 0;

      return {
        date,
        completedTasks: data.completedTasks,
        newTasks: data.newTasks,
        timeSpent: data.timeSpent,
        progressPercentage: Math.min(progressPercentage, 100),
      };
    });
  }

  /**
   * Initialize project metrics
   */
  private initializeProjectMetrics(projectId: string, name: string): void {
    const metrics: ProjectMetrics = {
      projectId,
      name,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      totalTimeSpent: 0,
      averageTaskDuration: 0,
      teamSize: 1,
      progressPercentage: 0,
      velocity: 0,
      burndownRate: 0,
      lastUpdated: new Date(),
    };

    this.projectMetrics.set(projectId, metrics);
  }

  /**
   * Update project metrics based on current task data
   */
  private updateProjectMetrics(projectId: string): void {
    const metrics = this.projectMetrics.get(projectId);
    if (!metrics) {
      return;
    }

    const tasks = this.getProjectTaskMetrics(projectId);
    
    metrics.totalTasks = tasks.length;
    metrics.completedTasks = tasks.filter(t => t.status === 'completed').length;
    metrics.inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    metrics.overdueTasks = tasks.filter(t => t.status === 'overdue').length;
    metrics.totalTimeSpent = tasks.reduce((sum, t) => sum + t.timeSpent, 0);
    
    // Calculate average task duration
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt && t.startedAt);
    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, t) => {
        return sum + (t.completedAt!.getTime() - t.startedAt!.getTime());
      }, 0);
      metrics.averageTaskDuration = totalDuration / completedTasks.length;
    }

    // Calculate progress percentage
    metrics.progressPercentage = metrics.totalTasks > 0 
      ? (metrics.completedTasks / metrics.totalTasks) * 100 
      : 0;

    // Calculate velocity (tasks completed per day)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const recentCompletedTasks = tasks.filter(t => 
      t.status === 'completed' && 
      t.completedAt && 
      t.completedAt > oneDayAgo
    );
    metrics.velocity = recentCompletedTasks.length;

    // Calculate burndown rate
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + t.actualHours, 0);
    metrics.burndownRate = totalEstimatedHours > 0 
      ? (totalActualHours / totalEstimatedHours) * 100 
      : 0;

    metrics.lastUpdated = new Date();
    this.projectMetrics.set(projectId, metrics);
  }

  /**
   * Get collector statistics
   */
  getStats(): {
    projectsTracked: number;
    tasksTracked: number;
    totalTimeSpent: number;
    averageProjectProgress: number;
  } {
    const projects = Array.from(this.projectMetrics.values());
    const tasks = Array.from(this.taskMetrics.values());
    
    const totalTimeSpent = tasks.reduce((sum, t) => sum + t.timeSpent, 0);
    const averageProgress = projects.length > 0
      ? projects.reduce((sum, p) => sum + p.progressPercentage, 0) / projects.length
      : 0;

    return {
      projectsTracked: projects.length,
      tasksTracked: tasks.length,
      totalTimeSpent,
      averageProjectProgress: averageProgress,
    };
  }
}

// Export singleton instance
export const getProjectMetricsCollector = (): ProjectMetricsCollector => {
  return new ProjectMetricsCollector();
}; 