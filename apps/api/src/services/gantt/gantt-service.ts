/**
 * Gantt Chart Service
 * Calculate critical path, dependencies, and timeline data
 * Phase 3.2 - Gantt Chart & Timeline Visualization
 */

import { getDatabase } from '../../database/connection';
import { tasks } from '../../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface TaskNode {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  dueDate: Date | null;
  status: string;
  progress: number;
  assigneeId: string | null;
  dependencies: string[];
  duration: number; // in days
  earliestStart: Date | null;
  earliestFinish: Date | null;
  latestStart: Date | null;
  latestFinish: Date | null;
  slack: number; // Total float
  isCritical: boolean;
}

interface GanttData {
  tasks: TaskNode[];
  criticalPath: string[];
  projectStart: Date;
  projectEnd: Date;
  totalDuration: number;
}

export class GanttService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Get Gantt chart data for a project
   */
  async getGanttData(projectId: string): Promise<GanttData> {
    try {
      // Fetch all tasks for the project
      const taskList = await this.getDb()
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId));

      // Build task nodes
      const taskNodes = await this.buildTaskNodes(taskList);

      // Calculate critical path using CPM (Critical Path Method)
      const { criticalPath, projectStart, projectEnd } = this.calculateCriticalPath(taskNodes);

      return {
        tasks: taskNodes,
        criticalPath,
        projectStart,
        projectEnd,
        totalDuration: this.calculateDuration(projectStart, projectEnd),
      };
    } catch (error: any) {
      logger.error('Failed to get Gantt data', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Build task nodes with duration calculations
   */
  private async buildTaskNodes(tasks: any[]): Promise<TaskNode[]> {
    return tasks.map((t) => {
      const startDate = t.startDate ? new Date(t.startDate) : null;
      const endDate = t.endDate ? new Date(t.endDate) : null;
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;

      // Calculate duration
      let duration = 0;
      if (startDate && endDate) {
        duration = this.calculateDuration(startDate, endDate);
      } else if (startDate && dueDate) {
        duration = this.calculateDuration(startDate, dueDate);
      } else {
        duration = 1; // Default to 1 day if no dates
      }

      // Calculate progress from status
      const progress = this.calculateProgress(t.status);

      return {
        id: t.id,
        title: t.title,
        startDate,
        endDate,
        dueDate,
        status: t.status,
        progress,
        assigneeId: t.assigneeId,
        dependencies: t.dependencies || [],
        duration,
        earliestStart: null,
        earliestFinish: null,
        latestStart: null,
        latestFinish: null,
        slack: 0,
        isCritical: false,
      };
    });
  }

  /**
   * Calculate critical path using Critical Path Method (CPM)
   */
  private calculateCriticalPath(tasks: TaskNode[]): {
    criticalPath: string[];
    projectStart: Date;
    projectEnd: Date;
  } {
    if (tasks.length === 0) {
      return {
        criticalPath: [],
        projectStart: new Date(),
        projectEnd: new Date(),
      };
    }

    // Build dependency graph
    const taskMap = new Map<string, TaskNode>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    // Forward pass - calculate earliest start and finish
    this.forwardPass(tasks, taskMap);

    // Find project end date
    const projectEnd = new Date(
      Math.max(...tasks.map((t) => t.earliestFinish?.getTime() || 0))
    );

    // Backward pass - calculate latest start and finish
    this.backwardPass(tasks, taskMap, projectEnd);

    // Calculate slack and identify critical tasks
    tasks.forEach((t) => {
      if (t.earliestStart && t.latestStart) {
        t.slack = this.calculateDuration(t.earliestStart, t.latestStart);
        t.isCritical = t.slack === 0;
      }
    });

    // Build critical path
    const criticalPath = this.buildCriticalPath(tasks);

    // Find project start date
    const projectStart = new Date(
      Math.min(...tasks.map((t) => t.earliestStart?.getTime() || Date.now()))
    );

    return { criticalPath, projectStart, projectEnd };
  }

  /**
   * Forward pass to calculate earliest start and finish times
   */
  private forwardPass(tasks: TaskNode[], taskMap: Map<string, TaskNode>): void {
    // Start with tasks that have no dependencies
    const processed = new Set<string>();
    const queue = tasks.filter((t) => t.dependencies.length === 0);

    // Set initial start dates
    queue.forEach((t) => {
      t.earliestStart = t.startDate || new Date();
      t.earliestFinish = this.addDays(t.earliestStart, t.duration);
      processed.add(t.id);
    });

    // Process remaining tasks
    while (processed.size < tasks.length) {
      let progress = false;

      for (const task of tasks) {
        if (processed.has(task.id)) continue;

        // Check if all dependencies are processed
        const allDepsProcessed = task.dependencies.every((depId) =>
          processed.has(depId)
        );

        if (allDepsProcessed) {
          // Find latest finish time of dependencies
          let earliestStart = task.startDate || new Date();

          if (task.dependencies.length > 0) {
            const depFinishTimes = task.dependencies
              .map((depId) => taskMap.get(depId)?.earliestFinish)
              .filter((d): d is Date => d !== null && d !== undefined);

            if (depFinishTimes.length > 0) {
              earliestStart = new Date(Math.max(...depFinishTimes.map((d) => d.getTime())));
            }
          }

          task.earliestStart = earliestStart;
          task.earliestFinish = this.addDays(earliestStart, task.duration);
          processed.add(task.id);
          progress = true;
        }
      }

      // Prevent infinite loop
      if (!progress && processed.size < tasks.length) {
        logger.warn('Circular dependency detected in task graph');
        break;
      }
    }
  }

  /**
   * Backward pass to calculate latest start and finish times
   */
  private backwardPass(
    tasks: TaskNode[],
    taskMap: Map<string, TaskNode>,
    projectEnd: Date
  ): void {
    // Build reverse dependency graph
    const successors = new Map<string, string[]>();
    tasks.forEach((t) => {
      t.dependencies.forEach((depId) => {
        if (!successors.has(depId)) {
          successors.set(depId, []);
        }
        successors.get(depId)!.push(t.id);
      });
    });

    // Start with tasks that have no successors
    const processed = new Set<string>();
    const queue = tasks.filter((t) => !successors.has(t.id) || successors.get(t.id)!.length === 0);

    // Set initial finish dates
    queue.forEach((t) => {
      t.latestFinish = t.earliestFinish || projectEnd;
      t.latestStart = this.subtractDays(t.latestFinish, t.duration);
      processed.add(t.id);
    });

    // Process remaining tasks in reverse
    while (processed.size < tasks.length) {
      let progress = false;

      for (const task of tasks) {
        if (processed.has(task.id)) continue;

        const taskSuccessors = successors.get(task.id) || [];

        // Check if all successors are processed
        const allSuccessorsProcessed = taskSuccessors.every((succId) =>
          processed.has(succId)
        );

        if (allSuccessorsProcessed && taskSuccessors.length > 0) {
          // Find earliest start time of successors
          const succStartTimes = taskSuccessors
            .map((succId) => taskMap.get(succId)?.latestStart)
            .filter((d): d is Date => d !== null && d !== undefined);

          if (succStartTimes.length > 0) {
            const latestFinish = new Date(Math.min(...succStartTimes.map((d) => d.getTime())));
            task.latestFinish = latestFinish;
            task.latestStart = this.subtractDays(latestFinish, task.duration);
          } else {
            task.latestFinish = task.earliestFinish || projectEnd;
            task.latestStart = this.subtractDays(task.latestFinish, task.duration);
          }

          processed.add(task.id);
          progress = true;
        }
      }

      // Prevent infinite loop
      if (!progress && processed.size < tasks.length) {
        logger.warn('Could not complete backward pass');
        break;
      }
    }
  }

  /**
   * Build critical path from tasks
   */
  private buildCriticalPath(tasks: TaskNode[]): string[] {
    const criticalTasks = tasks.filter((t) => t.isCritical);
    
    // Sort by earliest start
    criticalTasks.sort((a, b) => {
      const aTime = a.earliestStart?.getTime() || 0;
      const bTime = b.earliestStart?.getTime() || 0;
      return aTime - bTime;
    });

    return criticalTasks.map((t) => t.id);
  }

  /**
   * Update task dates based on drag-and-drop
   */
  async updateTaskDates(
    taskId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      await this.getDb()
        .update(tasks)
        .set({
          startDate,
          endDate,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      logger.info('Task dates updated', { taskId, startDate, endDate });
    } catch (error: any) {
      logger.error('Failed to update task dates', { error: error.message, taskId });
      throw error;
    }
  }

  /**
   * Update task dependencies
   */
  async updateTaskDependencies(
    taskId: string,
    dependencies: string[]
  ): Promise<void> {
    try {
      await this.getDb()
        .update(tasks)
        .set({
          dependencies,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      logger.info('Task dependencies updated', { taskId, dependencies });
    } catch (error: any) {
      logger.error('Failed to update task dependencies', {
        error: error.message,
        taskId,
      });
      throw error;
    }
  }

  /**
   * Helper: Calculate duration in days between two dates
   */
  private calculateDuration(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Minimum 1 day
  }

  /**
   * Helper: Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Helper: Subtract days from a date
   */
  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /**
   * Helper: Calculate progress from status
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'not-started': 0,
      'todo': 0,
      'in-progress': 50,
      'in-review': 75,
      'done': 100,
      'completed': 100,
      'blocked': 25,
    };

    return progressMap[status] || 0;
  }
}

export default GanttService;



