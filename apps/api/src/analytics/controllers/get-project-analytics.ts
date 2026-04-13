import { Context } from 'hono';
import { getDatabase } from '../../database/connection';
import { taskTable, projectTable, timeEntryTable, userTable, workspaceUserTable, milestoneTable } from '../../database/schema';
import { eq, and, gte } from 'drizzle-orm';
import logger from '../../utils/logger';

export async function getProjectAnalytics(c: Context) {
  const db = getDatabase();
  const projectId = c.req.param('projectId');
  const timeRange = c.req.query('timeRange') || '30d';

  if (!projectId) {
    return c.json({ error: 'Project ID required' }, 400);
  }

  logger.debug(`📊 Analytics request for project: ${projectId}, timeRange: ${timeRange}`);

  try {
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

    // Get project details
    const project = await db
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .limit(1);

    if (!project.length) {
      logger.debug(`❌ Project not found: ${projectId}`);
      return c.json({ error: 'Project not found' }, 404);
    }

    logger.debug(`✅ Found project: ${project[0]!.name} (${project[0]!.id})`);

    // Get task metrics
    const allTasks = await db
      .select({
        id: taskTable.id,
        status: taskTable.status,
        priority: taskTable.priority,
        dueDate: taskTable.dueDate,
        createdAt: taskTable.createdAt
      })
      .from(taskTable)
      .where(eq(taskTable.projectId, projectId));

    logger.debug(`📋 Found ${allTasks.length} tasks for project ${projectId}`);

    const taskMetrics = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'done').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      overdue: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
      highPriority: allTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length
    };

    // Get time metrics - need to join with tasks to get project data
    const timeEntries = await db
      .select({
        duration: timeEntryTable.duration,
        createdAt: timeEntryTable.createdAt
      })
      .from(timeEntryTable)
      .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
      .where(
        and(
          eq(taskTable.projectId, projectId),
          gte(timeEntryTable.createdAt, startDate)
        )
      );

    const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const avgCompletionTime = taskMetrics.completed > 0 ? totalHours / taskMetrics.completed : 0;

    const timeMetrics = {
      totalHours,
      avgCompletionTime,
      efficiency: taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0
    };

    // Get team metrics with detailed per-member analytics
    const teamMembers = await db
      .select({
        userEmail: workspaceUserTable.userEmail,
        userName: userTable.name,
        role: workspaceUserTable.role
      })
      .from(workspaceUserTable)
      .leftJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
      .where(eq(workspaceUserTable.workspaceId, project[0]!.workspaceId));

    // Get per-member task completion data
    const memberPerformance = await Promise.all(
      teamMembers.map(async (member) => {
        const memberTasks = allTasks.filter(t => t.status); // TODO: Add assignee filtering when available
        const completedTasks = memberTasks.filter(t => t.status === 'done');
        const inProgressTasks = memberTasks.filter(t => t.status === 'in_progress');
        
        // Get member's time entries
        const memberTimeEntries = await db
          .select({
            duration: timeEntryTable.duration
          })
          .from(timeEntryTable)
          .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
          .where(
            and(
              eq(taskTable.projectId, projectId),
              eq(timeEntryTable.userEmail, member.userEmail),
              gte(timeEntryTable.createdAt, startDate)
            )
          );
        
        const totalMinutes = memberTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const totalHours = totalMinutes / 60;
        
        return {
          email: member.userEmail,
          name: member.userName || member.userEmail,
          role: member.role,
          completedTasks: completedTasks.length,
          inProgressTasks: inProgressTasks.length,
          totalTasks: memberTasks.length,
          totalHours: totalHours,
          productivity: memberTasks.length > 0 ? (completedTasks.length / memberTasks.length) * 100 : 0,
          avgTaskCompletionTime: completedTasks.length > 0 ? totalHours / completedTasks.length : 0
        };
      })
    );

    const teamMetrics = {
      activeMembers: teamMembers.length,
      avgProductivity: timeMetrics.efficiency,
      collaboration: Math.min(100, teamMembers.length * 15), // Simple collaboration score
      memberPerformance: memberPerformance.sort((a, b) => b.completedTasks - a.completedTasks)
    };

    // Generate task trend data for the time range - format for InteractiveChart
    const taskTrend = [];
    let cumulativeCompleted = 0;
    let cumulativeCreated = 0;
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const tasksCreated = allTasks.filter(t => 
        t.createdAt && t.createdAt.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      ).length;
      
      // For completed tasks, we'll use status since there's no completedAt field
      const tasksCompleted = allTasks.filter(t => 
        t.status === 'done' && t.createdAt && t.createdAt.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      ).length;

      cumulativeCreated += tasksCreated;
      cumulativeCompleted += tasksCompleted;

      taskTrend.push({
        label: dateStr,
        value: tasksCompleted,
        created: tasksCreated,
        completed: tasksCompleted,
        cumulative: allTasks.filter(t => 
          t.createdAt && t.createdAt <= date
        ).length,
        remaining: cumulativeCreated - cumulativeCompleted
      });
    }

    // Calculate velocity (tasks completed per week)
    const weeksInRange = Math.max(1, Math.floor(daysBack / 7));
    const currentVelocity = taskMetrics.completed / weeksInRange;
    
    // Calculate average velocity from historical data (last 4 weeks before current period)
    const historicalStartDate = new Date(startDate);
    historicalStartDate.setDate(historicalStartDate.getDate() - 28);
    
    const historicalTasks = allTasks.filter(t => 
      t.createdAt && 
      t.createdAt >= historicalStartDate && 
      t.createdAt < startDate &&
      t.status === 'done'
    );
    
    const historicalVelocity = historicalTasks.length / 4; // 4 weeks
    
    const velocityMetrics = {
      current: currentVelocity,
      historical: historicalVelocity,
      trend: currentVelocity > historicalVelocity ? 'increasing' : 
             currentVelocity < historicalVelocity ? 'decreasing' : 'stable',
      changePercentage: historicalVelocity > 0 
        ? ((currentVelocity - historicalVelocity) / historicalVelocity) * 100 
        : 0
    };

    // Generate burndown data
    const burndownData = [];
    const totalTasksAtStart = allTasks.filter(t => 
      t.createdAt && t.createdAt <= startDate
    ).length;
    
    const idealBurnRate = totalTasksAtStart / daysBack;
    
    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const completedByDate = allTasks.filter(t => 
        t.status === 'done' && 
        t.createdAt && 
        t.createdAt <= date
      ).length;
      
      const createdByDate = allTasks.filter(t =>
        t.createdAt && 
        t.createdAt <= date
      ).length;
      
      burndownData.push({
        label: dateStr,
        actual: createdByDate - completedByDate,
        ideal: Math.max(0, totalTasksAtStart - (idealBurnRate * i)),
        completed: completedByDate,
        total: createdByDate
      });
    }

    // Calculate project health score
    const completionRate = taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0;
    const onTimeRate = taskMetrics.total > 0 ? ((taskMetrics.total - taskMetrics.overdue) / taskMetrics.total) * 100 : 100;
    const projectHealth = {
      score: Math.round((completionRate * 0.4) + (onTimeRate * 0.3) + (timeMetrics.efficiency * 0.3)),
      riskFactors: [
        ...(taskMetrics.overdue > 0 ? [`${taskMetrics.overdue} overdue tasks`] : []),
        ...(completionRate < 50 ? ['Low completion rate'] : []),
        ...(teamMetrics.activeMembers < 2 ? ['Small team size'] : [])
      ]
    };

    // Milestone metrics - FIXED: Now using real data
    const milestones = await db
      .select({
        id: milestoneTable.id,
        title: milestoneTable.title,
        dueDate: milestoneTable.dueDate,
        status: milestoneTable.status,
        completedAt: milestoneTable.completedAt
      })
      .from(milestoneTable)
      .where(eq(milestoneTable.projectId, projectId));

    const milestoneMetrics = {
      achieved: milestones.filter(m => m.status === 'completed').length,
      upcoming: milestones.filter(m => 
        m.dueDate && 
        new Date(m.dueDate) > now && 
        m.status !== 'completed'
      ).length,
      missed: milestones.filter(m => 
        m.dueDate && 
        new Date(m.dueDate) < now && 
        m.status !== 'completed'
      ).length,
      total: milestones.length,
      milestoneDetails: milestones.map(m => ({
        id: m.id,
        name: m.title,
        dueDate: m.dueDate,
        status: m.status,
        completedAt: m.completedAt,
        isOverdue: m.dueDate && new Date(m.dueDate) < now && m.status !== 'completed'
      }))
    };

    // Generate AI-powered insights
    const insights = [];
    
    if (velocityMetrics.trend === 'increasing') {
      insights.push({
        type: 'positive',
        title: 'Velocity is improving',
        description: `Your team completed ${Math.abs(velocityMetrics.changePercentage).toFixed(1)}% more tasks this period compared to the previous period`,
        icon: 'trending-up'
      });
    } else if (velocityMetrics.trend === 'decreasing') {
      insights.push({
        type: 'warning',
        title: 'Velocity is declining',
        description: `Task completion rate has decreased by ${Math.abs(velocityMetrics.changePercentage).toFixed(1)}%`,
        icon: 'trending-down'
      });
    }
    
    if (taskMetrics.overdue > 0) {
      insights.push({
        type: 'warning',
        title: 'Overdue tasks detected',
        description: `${taskMetrics.overdue} tasks are past their due date and need attention`,
        icon: 'alert-triangle'
      });
    }
    
    if (completionRate >= 80) {
      insights.push({
        type: 'positive',
        title: 'Project on track',
        description: `${completionRate.toFixed(1)}% completion rate indicates strong progress`,
        icon: 'check-circle'
      });
    }
    
    if (teamMetrics.activeMembers < 3 && taskMetrics.total > 20) {
      insights.push({
        type: 'info',
        title: 'Consider adding team members',
        description: `High task count (${taskMetrics.total}) with small team size (${teamMetrics.activeMembers})`,
        icon: 'users'
      });
    }

    const response = {
      success: true,
      data: {
        project: {
          id: project[0]!.id,
          name: project[0]!.name,
          description: project[0]!.description
        },
        timeRange,
        taskMetrics,
        timeMetrics,
        milestoneMetrics,
        teamMetrics,
        projectHealth,
        taskTrend,
        velocityMetrics,
        burndownData,
        insights,
        lastUpdated: new Date().toISOString()
      }
    };

    logger.debug(`📊 Sending analytics response:`, {
      taskMetrics,
      timeMetrics,
      teamMetrics: { activeMembers: teamMetrics.activeMembers }
    });

    return c.json(response);
  } catch (error: any) {
    logger.error('Error fetching project analytics:', error);
    return c.json({ error: 'Failed to fetch project analytics' }, 500);
  }
} 
