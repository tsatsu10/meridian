import { eq, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { calendarEvents, eventAttendees, recurringPatterns } from "../../database/schema";
import logger from '../../utils/logger';

// @epic-3.4-teams: Get single calendar event with attendees and recurring pattern
export async function getEvent(eventId: string) {
  const db = getDatabase();

  try {
    // Get the event (exclude soft-deleted)
    const event = await db.query.calendarEvents.findFirst({
      where: (events, { eq, and, isNull }) => and(
        eq(events.id, eventId),
        isNull(events.deletedAt)
      ),
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Get attendees
    const attendees = await db
      .select({
        id: eventAttendees.id,
        userId: eventAttendees.userId,
        status: eventAttendees.status,
        isOrganizer: eventAttendees.isOrganizer,
        isOptional: eventAttendees.isOptional,
        respondedAt: eventAttendees.respondedAt,
        responseNote: eventAttendees.responseNote,
      })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));

    // Get recurring pattern if exists
    let recurringPattern = null;
    if (event.isRecurring) {
      recurringPattern = await db.query.recurringPatterns.findFirst({
        where: (patterns, { eq }) => eq(patterns.eventId, eventId),
      });
    }

    return {
      ...event,
      attendees,
      recurringPattern,
    };
  } catch (error) {
    logger.error("Error fetching event:", error);
    throw error;
  }
}


