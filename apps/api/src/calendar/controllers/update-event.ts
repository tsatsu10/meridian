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

// @epic-3.4-teams: Update calendar event
export async function updateEvent(eventId: string, eventData: any, userId: string) {
  const db = getDatabase();

  try {
    // Check if event exists and user has permission
    const existingEvent = await db.query.calendarEvents.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    // Only creator can update
    if (existingEvent.createdBy !== userId) {
      throw new Error('Unauthorized to update this event');
    }

    // Update the event
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.type !== undefined) updateData.type = eventData.type;
    if (eventData.status !== undefined) updateData.status = eventData.status;
    if (eventData.startTime !== undefined) updateData.startTime = new Date(eventData.startTime);
    if (eventData.endTime !== undefined) updateData.endTime = eventData.endTime ? new Date(eventData.endTime) : null;
    if (eventData.allDay !== undefined) updateData.allDay = eventData.allDay;
    if (eventData.priority !== undefined) updateData.priority = eventData.priority;
    if (eventData.location !== undefined) updateData.location = eventData.location;
    if (eventData.meetingLink !== undefined) updateData.meetingLink = eventData.meetingLink;
    if (eventData.estimatedHours !== undefined) updateData.estimatedHours = eventData.estimatedHours;
    if (eventData.actualHours !== undefined) updateData.actualHours = eventData.actualHours;
    if (eventData.color !== undefined) updateData.color = eventData.color;
    if (eventData.reminderMinutes !== undefined) updateData.reminderMinutes = eventData.reminderMinutes;

    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(updateData)
      .where(eq(calendarEvents.id, eventId))
      .returning();

    return updatedEvent;
  } catch (error) {
    logger.error("Error updating event:", error);
    throw error;
  }
}


