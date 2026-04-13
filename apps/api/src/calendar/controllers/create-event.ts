import { getDatabase } from "../../database/connection";
import { calendarEvents, eventAttendees, recurringPatterns } from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

// @epic-3.4-teams: Create calendar event
export async function createEvent(eventData: any, userId: string, workspaceId: string) {
  const db = getDatabase();

  try {
    // Create the event
    const [newEvent] = await db.insert(calendarEvents).values({
      id: createId(),
      title: eventData.title,
      description: eventData.description,
      type: eventData.type || 'meeting',
      status: 'scheduled',
      startTime: new Date(eventData.startTime),
      endTime: eventData.endTime ? new Date(eventData.endTime) : null,
      allDay: eventData.allDay || false,
      timezone: eventData.timezone || 'UTC',
      teamId: eventData.teamId,
      projectId: eventData.projectId || null,
      workspaceId,
      createdBy: userId,
      priority: eventData.priority || 'medium',
      location: eventData.location || null,
      meetingLink: eventData.meetingLink || null,
      estimatedHours: eventData.estimatedHours || null,
      color: eventData.color || '#3b82f6',
      attachments: eventData.attachments || [],
      metadata: eventData.metadata || {},
      isRecurring: eventData.isRecurring || false,
      reminderMinutes: eventData.reminderMinutes || 15,
    }).returning();

    if (!newEvent) {
      throw new Error("Failed to create calendar event");
    }

    // Add attendees if provided
    if (eventData.attendees && eventData.attendees.length > 0) {
      const attendeeRecords = eventData.attendees.map((userId: string, index: number) => ({
        id: createId(),
        eventId: newEvent.id,
        userId: userId,
        status: 'pending' as const,
        isOrganizer: index === 0, // First attendee is organizer
        isOptional: false,
        notified: false,
      }));

      await db.insert(eventAttendees).values(attendeeRecords);
    }

    // Add recurring pattern if event is recurring
    if (eventData.isRecurring && eventData.recurringPattern) {
      await db.insert(recurringPatterns).values({
        id: createId(),
        eventId: newEvent.id,
        frequency: eventData.recurringPattern.frequency || 'weekly',
        interval: eventData.recurringPattern.interval || 1,
        endDate: eventData.recurringPattern.endDate ? new Date(eventData.recurringPattern.endDate) : null,
        occurrences: eventData.recurringPattern.occurrences || null,
        weekdays: eventData.recurringPattern.weekdays || [],
        dayOfMonth: eventData.recurringPattern.dayOfMonth || null,
        weekOfMonth: eventData.recurringPattern.weekOfMonth || null,
        customPattern: eventData.recurringPattern.customPattern || {},
        exceptionDates: eventData.recurringPattern.exceptionDates || [],
      });
    }

    return newEvent;
  } catch (error) {
    logger.error("Error creating event:", error);
    throw error;
  }
}


