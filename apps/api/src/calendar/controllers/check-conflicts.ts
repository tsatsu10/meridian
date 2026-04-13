import { and, eq, gte, lte, ne, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { calendarEvents, eventAttendees } from "../../database/schema";
import logger from '../../utils/logger';

// @epic-3.4-teams: Check for scheduling conflicts
export async function checkEventConflicts(
  startTime: Date,
  endTime: Date,
  teamId: string,
  excludeEventId?: string
) {
  const db = getDatabase();

  try {
    // Build the where clause
    const conditions = [
      eq(calendarEvents.teamId, teamId),
      isNull(calendarEvents.deletedAt),
      // Check for overlap: event starts before our end AND ends after our start
      lte(calendarEvents.startTime, endTime),
    ];

    if (excludeEventId) {
      conditions.push(ne(calendarEvents.id, excludeEventId));
    }

    // Find conflicting events
    const conflicts = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        type: calendarEvents.type,
        priority: calendarEvents.priority,
      })
      .from(calendarEvents)
      .where(and(...conditions));

    // Filter to only events that actually overlap
    const actualConflicts = conflicts.filter(event => {
      const eventEnd = event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000);
      return eventEnd > startTime;
    });

    return actualConflicts.map(conflict => ({
      id: conflict.id,
      title: conflict.title,
      startTime: conflict.startTime.toISOString(),
      endTime: conflict.endTime?.toISOString(),
      type: conflict.type,
      priority: conflict.priority,
      conflictType: 'time_overlap' as const,
    }));
  } catch (error) {
    logger.error("Error checking conflicts:", error);
    throw error;
  }
}

// @epic-3.4-teams: Check conflicts for specific attendees
export async function checkAttendeeConflicts(
  startTime: Date,
  endTime: Date,
  attendeeIds: string[],
  excludeEventId?: string
) {
  const db = getDatabase();

  try {
    if (!attendeeIds || attendeeIds.length === 0) {
      return [];
    }

    // Find all events where these attendees are participating
    const attendeeEvents = await db
      .select({
        eventId: eventAttendees.eventId,
        userId: eventAttendees.userId,
        event: {
          id: calendarEvents.id,
          title: calendarEvents.title,
          startTime: calendarEvents.startTime,
          endTime: calendarEvents.endTime,
          type: calendarEvents.type,
        },
      })
      .from(eventAttendees)
      .innerJoin(calendarEvents, eq(eventAttendees.eventId, calendarEvents.id))
      .where(
        and(
          isNull(calendarEvents.deletedAt),
          lte(calendarEvents.startTime, endTime)
        )
      );

    // Filter to actual conflicts
    const conflicts = attendeeEvents.filter(item => {
      if (excludeEventId && item.eventId === excludeEventId) return false;
      if (!attendeeIds.includes(item.userId)) return false;

      const eventEnd = item.event.endTime || new Date(item.event.startTime.getTime() + 60 * 60 * 1000);
      return eventEnd > startTime;
    });

    // Group by attendee
    const conflictsByAttendee = conflicts.reduce((acc, conflict) => {
      let bucket = acc[conflict.userId];
      if (!bucket) {
        bucket = [];
        acc[conflict.userId] = bucket;
      }
      bucket.push({
        eventId: conflict.event.id,
        title: conflict.event.title,
        startTime: conflict.event.startTime.toISOString(),
        endTime: conflict.event.endTime?.toISOString(),
      });
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(conflictsByAttendee).map(([userId, events]) => ({
      userId,
      conflicts: events,
      conflictCount: events.length,
    }));
  } catch (error) {
    logger.error("Error checking attendee conflicts:", error);
    throw error;
  }
}


