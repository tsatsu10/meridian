import { and, eq, gte, lte, sql, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { tasks, milestone, calendarEvents } from "../../database/schema";
import { getRecurringEventInstances } from "./generate-recurring-events";
import logger from '../../utils/logger';

// @epic-3.4-teams: Get calendar events for a team (tasks, milestones, and custom events)
export async function getTeamEvents(teamId: string, startDate: string, endDate: string) {
  const db = getDatabase();

  try {
    // Get tasks assigned to team members (deadlines)
    const taskResults = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        assignedTo: tasks.assigneeId,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, teamId), // Using teamId as proxy for project
          sql`${tasks.dueDate} IS NOT NULL`,
          gte(tasks.dueDate, new Date(startDate)),
          lte(tasks.dueDate, new Date(endDate))
        )
      );

    // Get milestones (project milestones)
    const milestoneResults = await db
      .select({
        id: milestone.id,
        title: milestone.title,
        date: milestone.dueDate,
        description: milestone.description,
      })
      .from(milestone)
      .where(
        and(
          sql`${milestone.dueDate} IS NOT NULL`,
          gte(milestone.dueDate, new Date(startDate)),
          lte(milestone.dueDate, new Date(endDate))
        )
      );

    // Get custom calendar events (exclude soft-deleted)
    const customEvents = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        description: calendarEvents.description,
        type: calendarEvents.type,
        status: calendarEvents.status,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        allDay: calendarEvents.allDay,
        priority: calendarEvents.priority,
        color: calendarEvents.color,
        location: calendarEvents.location,
        meetingLink: calendarEvents.meetingLink,
        createdBy: calendarEvents.createdBy,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.teamId, teamId),
          isNull(calendarEvents.deletedAt), // Exclude soft-deleted events
          gte(calendarEvents.startTime, new Date(startDate)),
          lte(calendarEvents.startTime, new Date(endDate))
        )
      );

    // Get recurring event instances (only for events marked as recurring)
    const recurringEvents = customEvents.filter(e => e.id && e.startTime);
    let recurringInstances: any[] = [];
    
    for (const recurringEvent of recurringEvents) {
      try {
        // Only generate instances if event is marked as recurring
        if (recurringEvent.id) {
          const instances = await getRecurringEventInstances(
            recurringEvent.id,
            startDate,
            endDate
          );
          recurringInstances = [...recurringInstances, ...instances];
        }
      } catch (error) {
        logger.error(`Error generating instances for event ${recurringEvent.id}:`, error);
        // Continue processing other events even if one fails
      }
    }

    // Transform to calendar events format
    const events = [
      ...taskResults.map(task => ({
        id: task.id,
        title: task.title,
        type: 'deadline' as const,
        date: task.dueDate?.toISOString() || new Date().toISOString(),
        startTime: task.dueDate?.toISOString() || new Date().toISOString(), // For DayView/WeekView compatibility
        endTime: task.dueDate?.toISOString() || new Date().toISOString(), // For DayView/WeekView compatibility
        priority: task.priority || 'medium',
        color: task.priority === 'high' ? '#ef4444' : '#3b82f6',
        memberId: task.assignedTo || undefined,
        source: 'task' as const,
      })),
      ...milestoneResults.map(ms => ({
        id: ms.id,
        title: ms.title,
        type: 'milestone' as const,
        date: ms.date?.toISOString() || new Date().toISOString(),
        startTime: ms.date?.toISOString() || new Date().toISOString(), // For DayView/WeekView compatibility
        endTime: ms.date?.toISOString() || new Date().toISOString(), // For DayView/WeekView compatibility
        priority: 'high' as const,
        color: '#8b5cf6',
        source: 'milestone' as const,
      })),
      ...customEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        status: event.status,
        date: event.startTime.toISOString(),
        endDate: event.endTime?.toISOString(),
        startTime: event.startTime.toISOString(), // For DayView/WeekView compatibility
        endTime: event.endTime?.toISOString(), // For DayView/WeekView compatibility
        allDay: event.allDay,
        priority: event.priority || 'medium',
        color: event.color || '#3b82f6',
        location: event.location,
        meetingLink: event.meetingLink,
        createdBy: event.createdBy,
        source: 'calendar' as const,
      })),
      ...recurringInstances, // Add recurring event instances
    ];

    return events;
  } catch (error) {
    logger.error("Error fetching team events:", error);
    throw error;
  }
}

export default getTeamEvents;


