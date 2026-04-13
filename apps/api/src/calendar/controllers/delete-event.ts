import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { calendarEvents } from "../../database/schema";
import logger from '../../utils/logger';

// @epic-3.4-teams: Get event team ID (for WebSocket broadcasting)
export async function getEventTeamId(eventId: string): Promise<string | null> {
  const db = getDatabase();
  
  try {
    const event = await db.query.calendarEvents.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
      columns: {
        teamId: true,
      },
    });

    return event?.teamId || null;
  } catch (error) {
    logger.error("Error fetching event team ID:", error);
    return null;
  }
}

// @epic-3.4-teams: Delete calendar event (soft delete)
export async function deleteEvent(eventId: string, userId: string) {
  const db = getDatabase();

  try {
    // Check if event exists and user has permission
    const existingEvent = await db.query.calendarEvents.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    // Only creator can delete
    if (existingEvent.createdBy !== userId) {
      throw new Error('Unauthorized to delete this event');
    }

    // Soft delete the event
    await db
      .update(calendarEvents)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(calendarEvents.id, eventId));

    return { success: true, message: 'Event deleted successfully' };
  } catch (error) {
    logger.error("Error deleting event:", error);
    throw error;
  }
}


