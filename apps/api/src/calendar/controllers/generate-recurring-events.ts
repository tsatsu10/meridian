import { getDatabase } from "../../database/connection";
import { calendarEvents, recurringPatterns } from "../../database/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

// @epic-3.4-teams: Generate recurring event instances
export async function generateRecurringEvents(
  parentEventId: string,
  startDate: Date,
  endDate: Date
) {
  const db = getDatabase();

  try {
    // Get the parent event and its recurring pattern
    const parentEvent = await db.query.calendarEvents.findFirst({
      where: (events, { eq }) => eq(events.id, parentEventId),
    });

    if (!parentEvent || !parentEvent.isRecurring) {
      return [];
    }

    const pattern = await db.query.recurringPatterns.findFirst({
      where: (patterns, { eq }) => eq(patterns.eventId, parentEventId),
    });

    if (!pattern) {
      return [];
    }

    const occurrenceDates: Date[] = [];
    const eventStart = new Date(parentEvent.startTime);
    const eventDuration = parentEvent.endTime 
      ? new Date(parentEvent.endTime).getTime() - new Date(parentEvent.startTime).getTime()
      : 60 * 60 * 1000; // Default 1 hour

    let currentDate = new Date(eventStart);
    let occurrenceCount = 0;
    const maxOccurrences = pattern.occurrences || 100; // Safety limit

    // Generate instances based on frequency
    while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
      // Check if this date is within our range and not an exception
      if (currentDate >= startDate && currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0] ?? "";
        const exceptionDates = (pattern.exceptionDates as string[]) || [];
        
        if (!exceptionDates.includes(dateStr)) {
          occurrenceDates.push(new Date(currentDate));
        }
      }

      // Calculate next occurrence based on frequency
      switch (pattern.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + (pattern.interval || 1));
          break;

        case 'weekly':
          if (pattern.weekdays && (pattern.weekdays as number[]).length > 0) {
            // Find next matching weekday
            const weekdays = pattern.weekdays as number[];
            let found = false;
            let daysToAdd = 1;
            
            while (!found && daysToAdd <= 7) {
              const testDate = new Date(currentDate);
              testDate.setDate(testDate.getDate() + daysToAdd);
              const dayOfWeek = testDate.getDay();
              
              if (weekdays.includes(dayOfWeek)) {
                currentDate = testDate;
                found = true;
              } else {
                daysToAdd++;
              }
            }
            
            if (!found) {
              currentDate.setDate(currentDate.getDate() + 7 * (pattern.interval || 1));
            }
          } else {
            currentDate.setDate(currentDate.getDate() + 7 * (pattern.interval || 1));
          }
          break;

        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;

        case 'monthly':
          if (pattern.dayOfMonth) {
            currentDate.setMonth(currentDate.getMonth() + (pattern.interval || 1));
            currentDate.setDate(pattern.dayOfMonth);
          } else {
            currentDate.setMonth(currentDate.getMonth() + (pattern.interval || 1));
          }
          break;

        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;

        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + (pattern.interval || 1));
          break;

        default:
          // For 'none' or unknown, don't generate more instances
          return [];
      }

      occurrenceCount++;

      // Check if we've reached the pattern's end date
      if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
        break;
      }
    }

    return occurrenceDates.map((instanceDate) => ({
      ...parentEvent,
      id: createId(),
      startTime: instanceDate,
      endTime: new Date(instanceDate.getTime() + eventDuration),
      recurringEventId: parentEventId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  } catch (error) {
    logger.error("Error generating recurring events:", error);
    throw error;
  }
}

// @epic-3.4-teams: Get all instances of a recurring event
export async function getRecurringEventInstances(
  parentEventId: string,
  startDate: string,
  endDate: string
) {
  const instances = await generateRecurringEvents(
    parentEventId,
    new Date(startDate),
    new Date(endDate)
  );

  return instances.map(instance => ({
    id: instance.id,
    title: instance.title,
    description: instance.description,
    type: instance.type,
    status: instance.status,
    date: instance.startTime.toISOString(),
    endDate: instance.endTime?.toISOString(),
    startTime: instance.startTime.toISOString(), // For DayView/WeekView compatibility
    endTime: instance.endTime?.toISOString(), // For DayView/WeekView compatibility
    priority: instance.priority,
    color: instance.color,
    location: instance.location,
    meetingLink: instance.meetingLink,
    source: 'calendar' as const,
    isRecurringInstance: true,
    recurringEventId: parentEventId,
  }));
}


