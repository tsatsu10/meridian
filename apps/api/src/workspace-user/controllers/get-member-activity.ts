/**
 * 📊 Get Member Activity Controller
 * 
 * @epic-3.4-teams - Enhanced member details with activity timeline
 * @persona-sarah - PM needs visibility into member contributions
 * @persona-david - Team lead needs performance insights
 */

import { Context } from 'hono';
import { getDatabase } from '../../database/connection';
import { 
  workspaceUserTable, 
  userTable,
  taskTable,
  activityTable,
  attachmentTable,
  timeEntryTable
} from '../../database/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import logger from '../../utils/logger';

export async function getMemberActivity(c: Context) {
  const db = getDatabase();
  const workspaceId = c.req.param('workspaceId');
  const memberId = c.req.param('memberId');
  if (!workspaceId || !memberId) {
    return c.json({ error: 'workspaceId and memberId are required' }, 400);
  }
  
  logger.debug(`📊 Fetching activity for member: workspace=${workspaceId}, member=${memberId}`);
  
  try {
    // Get member info
    const [member] = await db
      .select({
        id: workspaceUserTable.id,
        userId: workspaceUserTable.userId,
        userEmail: workspaceUserTable.userEmail,
        userName: userTable.name,
        role: workspaceUserTable.role,
        joinedAt: workspaceUserTable.joinedAt,
      })
      .from(workspaceUserTable)
      .leftJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
      .where(
        and(
          eq(workspaceUserTable.workspaceId, workspaceId),
          eq(workspaceUserTable.id, memberId)
        )
      )
      .limit(1);
    
    if (!member) {
      logger.debug(`❌ Member not found: ${memberId}`);
      return c.json({ error: 'Member not found' }, 404);
    }
    
    // Get time periods for analysis
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get tasks statistics
    const allTasks = await db
      .select({
        id: taskTable.id,
        title: taskTable.title,
        status: taskTable.status,
        priority: taskTable.priority,
        createdAt: taskTable.createdAt,
        completedAt: taskTable.completedAt,
        estimatedHours: taskTable.estimatedHours,
        actualHours: taskTable.actualHours,
      })
      .from(taskTable)
      .where(eq(taskTable.userEmail, member.userEmail));
    
    const taskStats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'done').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      highPriority: allTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      completedThisWeek: allTasks.filter(t => 
        t.completedAt && new Date(t.completedAt) >= oneWeekAgo
      ).length,
      completedThisMonth: allTasks.filter(t => 
        t.completedAt && new Date(t.completedAt) >= oneMonthAgo
      ).length,
    };
    
    // Get activity timeline (last 30 days)
    const activities = await db
      .select({
        id: activityTable.id,
        type: activityTable.type,
        content: activityTable.content,
        metadata: activityTable.metadata,
        createdAt: activityTable.createdAt,
      })
      .from(activityTable)
      .where(
        and(
          eq(activityTable.userId, member.userId),
          gte(activityTable.createdAt, oneMonthAgo)
        )
      )
      .orderBy(desc(activityTable.createdAt))
      .limit(50);
    
    // Get file uploads
    const attachments = await db
      .select({
        id: attachmentTable.id,
        fileName: attachmentTable.fileName,
        fileSize: attachmentTable.fileSize,
        fileType: attachmentTable.fileType,
        createdAt: attachmentTable.createdAt,
      })
      .from(attachmentTable)
      .where(eq(attachmentTable.uploadedBy, member.userId))
      .orderBy(desc(attachmentTable.createdAt))
      .limit(10);
    
    // Get time entries for the last 30 days
    const timeEntries = await db
      .select({
        id: timeEntryTable.id,
        taskId: timeEntryTable.taskId,
        duration: timeEntryTable.duration,
        startTime: timeEntryTable.startTime,
        description: timeEntryTable.description,
      })
      .from(timeEntryTable)
      .where(
        and(
          eq(timeEntryTable.userEmail, member.userEmail),
          gte(timeEntryTable.startTime, oneMonthAgo)
        )
      )
      .orderBy(desc(timeEntryTable.startTime));
    
    // Calculate daily contribution for the last 30 days (contribution graph)
    const contributionMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0] ?? '';
      contributionMap.set(dateKey, 0);
    }
    
    // Count activities per day
    activities.forEach(activity => {
      if (activity.createdAt) {
        const dateKey = new Date(activity.createdAt).toISOString().split('T')[0] ?? '';
        if (contributionMap.has(dateKey)) {
          contributionMap.set(dateKey, contributionMap.get(dateKey)! + 1);
        }
      }
    });
    
    // Count time entries per day
    timeEntries.forEach(entry => {
      if (entry.startTime) {
        const dateKey = new Date(entry.startTime).toISOString().split('T')[0] ?? '';
        if (contributionMap.has(dateKey)) {
          const hours = entry.duration ? Math.ceil(entry.duration / 3600) : 1; // Convert seconds to hours
          contributionMap.set(dateKey, contributionMap.get(dateKey)! + hours);
        }
      }
    });
    
    const contributionGraph = Array.from(contributionMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate performance trends (weekly breakdown over last 4 weeks)
    const performanceTrends = [];
    for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
      const weekStart = new Date(now.getTime() - (weekIndex + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - weekIndex * 7 * 24 * 60 * 60 * 1000);
      
      const weekTasks = allTasks.filter(t => 
        t.completedAt && 
        new Date(t.completedAt) >= weekStart && 
        new Date(t.completedAt) < weekEnd
      );
      
      const weekTimeEntries = timeEntries.filter(e => 
        e.startTime &&
        new Date(e.startTime) >= weekStart &&
        new Date(e.startTime) < weekEnd
      );
      
      const totalHours = weekTimeEntries.reduce((sum, e) => sum + ((e.duration ?? 0) / 3600), 0);
      
      performanceTrends.unshift({
        week: `Week ${4 - weekIndex}`,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        tasksCompleted: weekTasks.length,
        hoursLogged: parseFloat(totalHours.toFixed(1)),
        productivity: weekTasks.length > 0 ? Math.min(100, (weekTasks.length / 10) * 100) : 0
      });
    }
    
    // Calculate total time logged
    const totalTimeLogged = timeEntries.reduce((sum, e) => sum + ((e.duration ?? 0) / 3600), 0);
    
    // Format activity timeline with better grouping
    const formattedTimeline = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      action: activity.type,
      details: typeof activity.content === 'string' ? activity.content : null,
      createdAt: activity.createdAt,
      icon: getActivityIcon(activity.type),
      color: getActivityColor(activity.type)
    }));
    
    logger.debug(`✅ Fetched activity for ${member.userName}: ${activities.length} activities, ${attachments.length} files`);
    
    return c.json({
      member: {
        id: member.id,
        userId: member.userId,
        email: member.userEmail,
        name: member.userName ?? member.userEmail,
        role: member.role,
        joinedAt: member.joinedAt,
      },
      taskStats,
      timeline: formattedTimeline,
      attachments: attachments.map(a => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
        createdAt: a.createdAt,
      })),
      contributionGraph,
      performanceTrends,
      timeStats: {
        totalHoursLogged: parseFloat(totalTimeLogged.toFixed(1)),
        averageHoursPerWeek: parseFloat((totalTimeLogged / 4).toFixed(1)),
        timeEntriesCount: timeEntries.length,
      },
    });
  } catch (error: any) {
    logger.error('❌ Error fetching member activity:', error);
    return c.json({ 
      error: 'Failed to fetch member activity',
      details: error.message 
    }, 500);
  }
}

// Helper functions for activity formatting
function getActivityIcon(type: string): string {
  const iconMap: Record<string, string> = {
    task_created: 'plus',
    task_completed: 'check-circle',
    task_updated: 'edit',
    comment_added: 'message-square',
    file_uploaded: 'file',
    time_logged: 'clock',
    status_changed: 'arrow-right',
  };
  return iconMap[type] || 'activity';
}

function getActivityColor(type: string): string {
  const colorMap: Record<string, string> = {
    task_created: 'blue',
    task_completed: 'green',
    task_updated: 'yellow',
    comment_added: 'purple',
    file_uploaded: 'orange',
    time_logged: 'cyan',
    status_changed: 'indigo',
  };
  return colorMap[type] || 'gray';
}


