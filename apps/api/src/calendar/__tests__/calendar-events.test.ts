/**
 * Calendar Events Tests
 * 
 * Comprehensive tests for calendar functionality:
 * - Event creation and management
 * - Scheduling and conflicts
 * - Recurring events
 * - Attendee management
 * - Reminders
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable, 
  workspaceTable,
  calendarEventTable,
  eventAttendeeTable 
} from '../../database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Calendar Events', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
  let testWorkspace: any;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {

    const hashedPassword = await hashPassword('TestPassword123!');

    [testUser] = await db.insert(userTable).values({
      id: createId(),
      email: 'calendar@example.com',
      name: 'Calendar User',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Calendar Workspace',
      ownerId: testUser.id,
    }).returning();
  });

  describe('Event Creation', () => {
    it('should create calendar event', async () => {
      const startTime = new Date('2025-12-01T10:00:00Z');
      const endTime = new Date('2025-12-01T11:00:00Z');

      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startTime,
        endTime,
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        eventType: 'meeting',
        status: 'scheduled',
      }).returning();

      expect(event).toBeDefined();
      expect(event.title).toBe('Team Meeting');
      expect(event.eventType).toBe('meeting');
      expect(event.status).toBe('scheduled');
    });

    it('should create all-day event', async () => {
      const eventDate = new Date('2025-12-25');

      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Christmas Holiday',
        startTime: eventDate,
        endTime: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        eventType: 'time-off',
        isAllDay: true,
      }).returning();

      expect(event.isAllDay).toBe(true);
      expect(event.eventType).toBe('time-off');
    });

    it('should create event with location', async () => {
      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Client Meeting',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        location: 'Conference Room A',
        eventType: 'meeting',
      }).returning();

      expect(event.location).toBe('Conference Room A');
    });

    it('should create recurring event', async () => {
      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Daily Standup',
        startTime: new Date(),
        endTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        recurringFrequency: 'daily',
        recurringUntil: new Date('2025-12-31'),
        eventType: 'meeting',
      }).returning();

      expect(event.recurringFrequency).toBe('daily');
      expect(event.recurringUntil).toBeDefined();
    });
  });

  describe('Conflict Detection', () => {
    const checkConflict = (
      event1Start: Date,
      event1End: Date,
      event2Start: Date,
      event2End: Date
    ): boolean => {
      return (
        (event1Start < event2End && event1End > event2Start) ||
        (event2Start < event1End && event2End > event1Start)
      );
    };

    it('should detect overlapping events', () => {
      const event1Start = new Date('2025-12-01T10:00:00Z');
      const event1End = new Date('2025-12-01T11:00:00Z');
      const event2Start = new Date('2025-12-01T10:30:00Z');
      const event2End = new Date('2025-12-01T11:30:00Z');

      expect(checkConflict(event1Start, event1End, event2Start, event2End)).toBe(true);
    });

    it('should detect no conflict for sequential events', () => {
      const event1Start = new Date('2025-12-01T10:00:00Z');
      const event1End = new Date('2025-12-01T11:00:00Z');
      const event2Start = new Date('2025-12-01T11:00:00Z');
      const event2End = new Date('2025-12-01T12:00:00Z');

      expect(checkConflict(event1Start, event1End, event2Start, event2End)).toBe(false);
    });

    it('should detect event completely within another', () => {
      const event1Start = new Date('2025-12-01T10:00:00Z');
      const event1End = new Date('2025-12-01T12:00:00Z');
      const event2Start = new Date('2025-12-01T10:30:00Z');
      const event2End = new Date('2025-12-01T11:00:00Z');

      expect(checkConflict(event1Start, event1End, event2Start, event2End)).toBe(true);
    });
  });

  describe('Attendee Management', () => {
    let testEvent: any;
    let attendee: any;

    beforeEach(async () => {
      [testEvent] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Team Meeting',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        eventType: 'meeting',
      }).returning();

      const hashedPassword = await hashPassword('TestPassword123!');

      [attendee] = await db.insert(userTable).values({
        id: createId(),
        email: 'attendee@example.com',
        name: 'Attendee',
        password: hashedPassword,
        role: 'member',
      }).returning();
    });

    it('should add attendee to event', async () => {
      const [attendance] = await db.insert(eventAttendeeTable).values({
        id: createId(),
        eventId: testEvent.id,
        userId: attendee.id,
        status: 'pending',
      }).returning();

      expect(attendance).toBeDefined();
      expect(attendance.eventId).toBe(testEvent.id);
      expect(attendance.userId).toBe(attendee.id);
      expect(attendance.status).toBe('pending');
    });

    it('should update attendee status', async () => {
      const [attendance] = await db.insert(eventAttendeeTable).values({
        id: createId(),
        eventId: testEvent.id,
        userId: attendee.id,
        status: 'pending',
      }).returning();

      await db.update(eventAttendeeTable)
        .set({ status: 'accepted' })
        .where(eq(eventAttendeeTable.id, attendance.id));

      const [updated] = await db.select()
        .from(eventAttendeeTable)
        .where(eq(eventAttendeeTable.id, attendance.id));

      expect(updated.status).toBe('accepted');
    });

    it('should get event attendees', async () => {
      await db.insert(eventAttendeeTable).values([
        {
          id: createId(),
          eventId: testEvent.id,
          userId: attendee.id,
          status: 'accepted',
        },
        {
          id: createId(),
          eventId: testEvent.id,
          userId: testUser.id,
          status: 'accepted',
        },
      ]);

      const attendees = await db.select()
        .from(eventAttendeeTable)
        .where(eq(eventAttendeeTable.eventId, testEvent.id));

      expect(attendees).toHaveLength(2);
    });
  });

  describe('Event Queries', () => {
    beforeEach(async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(calendarEventTable).values([
        {
          id: createId(),
          title: 'Today Meeting',
          startTime: now,
          endTime: new Date(now.getTime() + 60 * 60 * 1000),
          creatorId: testUser.id,
          workspaceId: testWorkspace.id,
          eventType: 'meeting',
        },
        {
          id: createId(),
          title: 'Tomorrow Deadline',
          startTime: tomorrow,
          endTime: tomorrow,
          creatorId: testUser.id,
          workspaceId: testWorkspace.id,
          eventType: 'deadline',
        },
        {
          id: createId(),
          title: 'Next Week Review',
          startTime: nextWeek,
          endTime: new Date(nextWeek.getTime() + 60 * 60 * 1000),
          creatorId: testUser.id,
          workspaceId: testWorkspace.id,
          eventType: 'meeting',
        },
      ]);
    });

    it('should get events in date range', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      const events = await db.select()
        .from(calendarEventTable)
        .where(
          and(
            eq(calendarEventTable.workspaceId, testWorkspace.id),
            gte(calendarEventTable.startTime, startDate),
            lte(calendarEventTable.startTime, endDate)
          )
        );

      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter events by type', async () => {
      const meetings = await db.select()
        .from(calendarEventTable)
        .where(
          and(
            eq(calendarEventTable.workspaceId, testWorkspace.id),
            eq(calendarEventTable.eventType, 'meeting')
          )
        );

      expect(meetings.length).toBeGreaterThanOrEqual(2);
      expect(meetings.every(e => e.eventType === 'meeting')).toBe(true);
    });

    it('should get upcoming events', async () => {
      const now = new Date();

      const upcomingEvents = await db.select()
        .from(calendarEventTable)
        .where(
          and(
            eq(calendarEventTable.workspaceId, testWorkspace.id),
            gte(calendarEventTable.startTime, now)
          )
        );

      expect(upcomingEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event Updates', () => {
    let testEvent: any;

    beforeEach(async () => {
      [testEvent] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Original Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        eventType: 'meeting',
        status: 'scheduled',
      }).returning();
    });

    it('should update event title', async () => {
      await db.update(calendarEventTable)
        .set({ title: 'Updated Event' })
        .where(eq(calendarEventTable.id, testEvent.id));

      const [updated] = await db.select()
        .from(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      expect(updated.title).toBe('Updated Event');
    });

    it('should update event time', async () => {
      const newStart = new Date('2025-12-15T14:00:00Z');
      const newEnd = new Date('2025-12-15T15:00:00Z');

      await db.update(calendarEventTable)
        .set({ startTime: newStart, endTime: newEnd })
        .where(eq(calendarEventTable.id, testEvent.id));

      const [updated] = await db.select()
        .from(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      expect(updated.startTime.getTime()).toBe(newStart.getTime());
      expect(updated.endTime.getTime()).toBe(newEnd.getTime());
    });

    it('should cancel event', async () => {
      await db.update(calendarEventTable)
        .set({ status: 'cancelled' })
        .where(eq(calendarEventTable.id, testEvent.id));

      const [updated] = await db.select()
        .from(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      expect(updated.status).toBe('cancelled');
    });

    it('should complete event', async () => {
      await db.update(calendarEventTable)
        .set({ status: 'completed' })
        .where(eq(calendarEventTable.id, testEvent.id));

      const [updated] = await db.select()
        .from(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      expect(updated.status).toBe('completed');
    });
  });

  describe('Event Deletion', () => {
    let testEvent: any;

    beforeEach(async () => {
      [testEvent] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Delete Test Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        eventType: 'meeting',
      }).returning();
    });

    it('should delete event', async () => {
      await db.delete(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      const events = await db.select()
        .from(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      expect(events).toHaveLength(0);
    });

    it('should cascade delete attendees', async () => {
      const hashedPassword = await hashPassword('TestPassword123!');

      const [attendee] = await db.insert(userTable).values({
        id: createId(),
        email: 'attendee@example.com',
        name: 'Attendee',
        password: hashedPassword,
        role: 'member',
      }).returning();

      await db.insert(eventAttendeeTable).values({
        id: createId(),
        eventId: testEvent.id,
        userId: attendee.id,
        status: 'accepted',
      });

      await db.delete(calendarEventTable)
        .where(eq(calendarEventTable.id, testEvent.id));

      const attendees = await db.select()
        .from(eventAttendeeTable)
        .where(eq(eventAttendeeTable.eventId, testEvent.id));

      expect(attendees).toHaveLength(0);
    });
  });

  describe('Recurring Events', () => {
    it('should create daily recurring event', async () => {
      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Daily Standup',
        startTime: new Date(),
        endTime: new Date(Date.now() + 15 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        recurringFrequency: 'daily',
        recurringUntil: new Date('2025-12-31'),
        eventType: 'meeting',
      }).returning();

      expect(event.recurringFrequency).toBe('daily');
    });

    it('should create weekly recurring event', async () => {
      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Weekly Review',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        recurringFrequency: 'weekly',
        eventType: 'meeting',
      }).returning();

      expect(event.recurringFrequency).toBe('weekly');
    });

    it('should create monthly recurring event', async () => {
      const [event] = await db.insert(calendarEventTable).values({
        id: createId(),
        title: 'Monthly Planning',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        creatorId: testUser.id,
        workspaceId: testWorkspace.id,
        recurringFrequency: 'monthly',
        eventType: 'meeting',
      }).returning();

      expect(event.recurringFrequency).toBe('monthly');
    });
  });
});

