import { getDatabase } from '../../database/connection';
import { projects, tasks } from '../../database/schema';
import { eq, and, gte, isNotNull } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * Get task completion count for today
 */
export async function getTodayTaskCount(workspaceId: string): Promise<{
  completed: number;
  total: number;
  percentage: number;
  completedToday: number;
  milestone?: number;
}> {
  const db = getDatabase();
  
  try {
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all tasks in workspace
    const allTasks = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(projects.workspaceId, workspaceId));
    
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'done').length;
    const completedToday = allTasks.filter(t => {
      if (t.status === 'done' && t.completedAt) {
        const completedDate = new Date(t.completedAt);
        return completedDate >= today;
      }
      return false;
    }).length;
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Check for milestones (every 5, 10, 25, 50, 100 tasks)
    let milestone: number | undefined;
    if (completedToday === 5 || completedToday === 10 || completedToday === 25 || 
        completedToday === 50 || completedToday === 100 || completedToday % 100 === 0) {
      milestone = completedToday;
    }
    
    return {
      completed,
      total,
      percentage,
      completedToday,
      milestone,
    };
  } catch (error) {
    logger.error('Failed to get task count:', error);
    throw new Error('Failed to get task count');
  }
}

/**
 * Get task completion trend (last 7 days)
 */
export async function getTaskTrend(workspaceId: string): Promise<Array<{
  date: string;
  completed: number;
}>> {
  const db = getDatabase();
  
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const completedTasks = await db
      .select({
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(tasks.status, 'done'),
          isNotNull(tasks.completedAt),
          gte(tasks.completedAt, sevenDaysAgo)
        )
      );
    
    // Group by date
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      trendMap.set(dateStr, 0);
    }

    for (const task of completedTasks) {
      if (task.completedAt) {
        const dateStr = new Date(task.completedAt).toISOString().slice(0, 10);
        if (trendMap.has(dateStr)) {
          trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
        }
      }
    }
    
    return Array.from(trendMap.entries())
      .map(([date, completed]) => ({ date, completed }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    logger.error('Failed to get task trend:', error);
    throw new Error('Failed to get task trend');
  }
}

/**
 * Get real-time task stats
 */
export async function getLiveTaskStats(workspaceId: string): Promise<{
  inProgress: number;
  pending: number;
  completed: number;
  overdue: number;
  activeUsers: number;
}> {
  const db = getDatabase();
  
  try {
    const now = new Date();
    
    const allTasks = await db
      .select({
        status: tasks.status,
        dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(projects.workspaceId, workspaceId));

    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
    const pending = allTasks.filter((t) => t.status === 'todo').length;
    const completed = allTasks.filter((t) => t.status === 'done').length;

    const overdue = allTasks.filter((t) => {
      if (t.status !== 'done' && t.dueDate) {
        return new Date(t.dueDate) < now;
      }
      return false;
    }).length;

    const activeUsersSet = new Set(
      allTasks
        .filter((t) => t.status === 'in_progress' && t.assigneeId)
        .map((t) => t.assigneeId as string),
    );
    const activeUsers = activeUsersSet.size;
    
    return {
      inProgress,
      pending,
      completed,
      overdue,
      activeUsers,
    };
  } catch (error) {
    logger.error('Failed to get live task stats:', error);
    throw new Error('Failed to get live task stats');
  }
}


