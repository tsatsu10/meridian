import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { taskTable, projectTable, timeEntryTable, workspaceTable, workspaceUserTable } from "../../database/schema";
import { eq, and, gte, lte, count, sum, avg, desc } from "drizzle-orm";
import logger from '../../utils/logger';

// @epic-3.1-analytics: Workspace-level analytics for executives
// @role-workspace-manager: Workspace manager needs organization-wide insights
// @permission-canViewWorkspaceAnalytics

export async function getWorkspaceAnalytics(c: Context) {
  const workspaceId = c.req.param('id');
  const timeRange = c.req.query('timeRange') || '30d';

  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required' }, 400);
  }

  try {
    const db = getDatabase();
    // Calculate date range
    const now = new Date();
    const getDaysBack = (range: string) => {
      switch (range) {
        case '7d': return 7;
        case '30d': return 30;
        case '90d': return 90;
        case '1y': return 365;
        default: return 30;
      }
    };
    
    const daysBack = getDaysBack(timeRange);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Get workspace details
    const workspace = await db
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .limit(1);

    if (!workspace.length) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    // Get all projects in workspace
    const projects = await db
      .select({
        id: projectTable.id,
        name: projectTable.name,
        status: projectTable.status,
        createdAt: projectTable.createdAt
      })
      .from(projectTable)
      .where(eq(projectTable.workspaceId, workspaceId));

    const projectMetrics = {
      total: projects.length,
      active: projects.filter((p: { status: string | null }) => p.status === 'active').length,
      completed: projects.filter((p: { status: string | null }) => p.status === 'completed').length,
      onHold: projects.filter((p: { status: string | null }) => p.status === 'on-hold').length,
      planning: projects.filter((p: { status: string | null }) => p.status === 'planning').length
    };

    // Get all tasks across all projects in workspace
    const allTasks = await db
      .select({
        id: taskTable.id,
        status: taskTable.status,
        priority: taskTable.priority,
        dueDate: taskTable.dueDate,
        createdAt: taskTable.createdAt,
        projectId: taskTable.projectId
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(eq(projectTable.workspaceId, workspaceId));

    type TaskRow = (typeof allTasks)[number];
    const productivityMetrics = {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter((t: TaskRow) => t.status === 'done').length,
      overdueTasks: allTasks.filter(
        (t: TaskRow) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done',
      ).length,
      highPriorityTasks: allTasks.filter(
        (t: TaskRow) => t.priority === 'high' || t.priority === 'urgent',
      ).length
    };

    // Get team metrics
    const teamMembers = await db
      .select({
        userEmail: workspaceUserTable.userEmail,
        role: workspaceUserTable.role,
        status: workspaceUserTable.status
      })
      .from(workspaceUserTable)
      .where(eq(workspaceUserTable.workspaceId, workspaceId));

    type MemberRow = (typeof teamMembers)[number];
    const teamMetrics = {
      totalMembers: teamMembers.length,
      activeMembers: teamMembers.filter((m: MemberRow) => m.status === 'active').length,
      pendingMembers: teamMembers.filter((m: MemberRow) => m.status === 'pending').length
    };

    // Get time entries for the workspace
    const timeEntries = await db
      .select({
        duration: timeEntryTable.duration,
        createdAt: timeEntryTable.createdAt
      })
      .from(timeEntryTable)
      .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(
        and(
          eq(projectTable.workspaceId, workspaceId),
          gte(timeEntryTable.createdAt, startDate)
        )
      );

    type TimeRow = (typeof timeEntries)[number];
    const totalMinutes = timeEntries.reduce(
      (sum: number, entry: TimeRow) => sum + (entry.duration || 0),
      0,
    );
    const totalHours = totalMinutes / 60;

    // Generate productivity trend data
    const productivityTrend = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const tasksCreated = allTasks.filter((t: TaskRow) =>
        t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === dateStr
      ).length;

      const tasksCompleted = allTasks.filter((t: TaskRow) =>
        t.status === 'done' && t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === dateStr
      ).length;

      const dayTimeEntries = timeEntries.filter((t: TimeRow) =>
        t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === dateStr
      );
      const dayHours =
        dayTimeEntries.reduce((sum: number, entry: TimeRow) => sum + (entry.duration || 0), 0) / 60;

      productivityTrend.push({
        date: dateStr,
        tasks: tasksCreated,
        completed: tasksCompleted,
        hours: dayHours
      });
    }

    const response = {
      success: true,
      data: {
        workspace: {
          id: workspace[0]!.id,
          name: workspace[0]!.name,
          description: workspace[0]!.description
        },
        timeRange,
        projectMetrics,
        productivityMetrics,
        teamMetrics,
        totalHours,
        productivityTrend
      }
    };

    return c.json(response);
  } catch (error: any) {
    logger.error('Error fetching workspace analytics:', error);
    return c.json({ error: 'Failed to fetch workspace analytics' }, 500);
  }
} 
