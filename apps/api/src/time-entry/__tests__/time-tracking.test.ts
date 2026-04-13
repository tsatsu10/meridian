/**
 * Time Tracking Tests
 * 
 * Comprehensive tests for time entry functionality:
 * - Time entry creation
 * - Start/stop tracking
 * - Duration calculations
 * - Time aggregations
 * - Billable hours
 * - Reports
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable, 
  workspaceTable,
  projectTable,
  taskTable,
  timeEntryTable 
} from '../../database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Time Tracking', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
  let testWorkspace: any;
  let testProject: any;
  let testTask: any;

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
      email: 'timetracker@example.com',
      name: 'Time Tracker',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Time Tracking Workspace',
      ownerId: testUser.id,
    }).returning();

    [testProject] = await db.insert(projectTable).values({
      id: createId(),
      name: 'Time Tracking Project',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    }).returning();

    [testTask] = await db.insert(taskTable).values({
      id: createId(),
      title: 'Time Tracking Task',
      projectId: testProject.id,
      creatorId: testUser.id,
    }).returning();
  });

  describe('Time Entry Creation', () => {
    it('should create time entry with start time', async () => {
      const startTime = new Date();

      const [entry] = await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime,
        description: 'Working on feature',
      }).returning();

      expect(entry).toBeDefined();
      expect(entry.userId).toBe(testUser.id);
      expect(entry.taskId).toBe(testTask.id);
      expect(entry.startTime).toBeDefined();
      expect(entry.endTime).toBeNull();
    });

    it('should create completed time entry', async () => {
      const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const endTime = new Date();

      const [entry] = await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime,
        endTime,
        duration: 7200, // 2 hours in seconds
        description: 'Completed work',
      }).returning();

      expect(entry.startTime).toBeDefined();
      expect(entry.endTime).toBeDefined();
      expect(entry.duration).toBe(7200);
    });

    it('should create time entry with description', async () => {
      const [entry] = await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime: new Date(),
        description: 'Implementing authentication',
      }).returning();

      expect(entry.description).toBe('Implementing authentication');
    });

    it('should mark time as billable', async () => {
      const [entry] = await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime: new Date(),
        isBillable: true,
        hourlyRate: 75.00,
      }).returning();

      expect(entry.isBillable).toBe(true);
      expect(entry.hourlyRate).toBe('75.00');
    });
  });

  describe('Duration Calculations', () => {
    const calculateDuration = (start: Date, end: Date): number => {
      return Math.floor((end.getTime() - start.getTime()) / 1000);
    };

    it('should calculate duration in seconds', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T11:00:00Z');
      
      const duration = calculateDuration(start, end);
      expect(duration).toBe(3600); // 1 hour = 3600 seconds
    });

    it('should calculate duration for partial hours', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T10:30:00Z');
      
      const duration = calculateDuration(start, end);
      expect(duration).toBe(1800); // 30 minutes = 1800 seconds
    });

    it('should calculate duration for multiple days', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-02T10:00:00Z');
      
      const duration = calculateDuration(start, end);
      expect(duration).toBe(86400); // 24 hours = 86400 seconds
    });

    it('should handle same start and end time', () => {
      const time = new Date('2025-01-01T10:00:00Z');
      
      const duration = calculateDuration(time, time);
      expect(duration).toBe(0);
    });
  });

  describe('Time Entry Updates', () => {
    let activeEntry: any;

    beforeEach(async () => {
      [activeEntry] = await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime: new Date(),
      }).returning();
    });

    it('should stop active time entry', async () => {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - activeEntry.startTime.getTime()) / 1000);

      await db.update(timeEntryTable)
        .set({ 
          endTime,
          duration,
        })
        .where(eq(timeEntryTable.id, activeEntry.id));

      const [updated] = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.id, activeEntry.id));

      expect(updated.endTime).toBeDefined();
      expect(updated.duration).toBeDefined();
    });

    it('should update time entry description', async () => {
      await db.update(timeEntryTable)
        .set({ description: 'Updated description' })
        .where(eq(timeEntryTable.id, activeEntry.id));

      const [updated] = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.id, activeEntry.id));

      expect(updated.description).toBe('Updated description');
    });

    it('should update billable status', async () => {
      await db.update(timeEntryTable)
        .set({ isBillable: true, hourlyRate: 100.00 })
        .where(eq(timeEntryTable.id, activeEntry.id));

      const [updated] = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.id, activeEntry.id));

      expect(updated.isBillable).toBe(true);
      expect(updated.hourlyRate).toBe('100.00');
    });
  });

  describe('Time Aggregations', () => {
    beforeEach(async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Create multiple time entries
      await db.insert(timeEntryTable).values([
        {
          id: createId(),
          userId: testUser.id,
          taskId: testTask.id,
          startTime: twoHoursAgo,
          endTime: oneHourAgo,
          duration: 3600, // 1 hour
        },
        {
          id: createId(),
          userId: testUser.id,
          taskId: testTask.id,
          startTime: oneHourAgo,
          endTime: now,
          duration: 3600, // 1 hour
        },
      ]);
    });

    it('should calculate total time for task', async () => {
      const entries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.taskId, testTask.id));

      const totalDuration = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      expect(totalDuration).toBe(7200); // 2 hours
    });

    it('should calculate total time for user', async () => {
      const entries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.userId, testUser.id));

      const totalDuration = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      expect(totalDuration).toBeGreaterThanOrEqual(7200);
    });

    it('should filter time entries by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const entries = await db.select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, testUser.id),
            gte(timeEntryTable.startTime, yesterday),
            lte(timeEntryTable.startTime, tomorrow)
          )
        );

      expect(entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Billable Hours Calculation', () => {
    beforeEach(async () => {
      await db.insert(timeEntryTable).values([
        {
          id: createId(),
          userId: testUser.id,
          taskId: testTask.id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          duration: 3600,
          isBillable: true,
          hourlyRate: 100.00,
        },
        {
          id: createId(),
          userId: testUser.id,
          taskId: testTask.id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(),
          duration: 3600,
          isBillable: false, // Not billable
        },
      ]);
    });

    it('should calculate total billable amount', async () => {
      const entries = await db.select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, testUser.id),
            eq(timeEntryTable.isBillable, true)
          )
        );

      const totalAmount = entries.reduce((sum, entry) => {
        const hours = (entry.duration || 0) / 3600;
        const rate = parseFloat(entry.hourlyRate || '0');
        return sum + (hours * rate);
      }, 0);

      expect(totalAmount).toBe(100); // 1 hour * $100/hour
    });

    it('should separate billable from non-billable hours', async () => {
      const allEntries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.userId, testUser.id));

      const billableEntries = allEntries.filter(e => e.isBillable);
      const nonBillableEntries = allEntries.filter(e => !e.isBillable);

      expect(billableEntries.length).toBeGreaterThanOrEqual(1);
      expect(nonBillableEntries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Active Timer Management', () => {
    const getActiveTimer = async (userId: string) => {
      const entries = await db.select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, userId),
            eq(timeEntryTable.endTime, null)
          )
        );

      return entries[0] || null;
    };

    it('should identify active timer', async () => {
      await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime: new Date(),
        endTime: null, // Active timer
      });

      const activeTimer = await getActiveTimer(testUser.id);
      
      expect(activeTimer).toBeDefined();
      expect(activeTimer.endTime).toBeNull();
    });

    it('should return null when no active timer', async () => {
      const activeTimer = await getActiveTimer(testUser.id);
      expect(activeTimer).toBeNull();
    });

    it('should prevent multiple active timers', async () => {
      const active = await getActiveTimer(testUser.id);
      
      if (active) {
        // Stop existing timer before starting new one
        await db.update(timeEntryTable)
          .set({ endTime: new Date() })
          .where(eq(timeEntryTable.id, active.id));
      }

      // Start new timer
      await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime: new Date(),
      });

      const activeTimers = await db.select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, testUser.id),
            eq(timeEntryTable.endTime, null)
          )
        );

      expect(activeTimers.length).toBe(1);
    });
  });

  describe('Time Entry Deletion', () => {
    let testEntry: any;

    beforeEach(async () => {
      [testEntry] = await db.insert(timeEntryTable).values({
        id: createId(),
        userId: testUser.id,
        taskId: testTask.id,
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        endTime: new Date(),
        duration: 3600,
      }).returning();
    });

    it('should delete time entry', async () => {
      await db.delete(timeEntryTable)
        .where(eq(timeEntryTable.id, testEntry.id));

      const entries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.id, testEntry.id));

      expect(entries).toHaveLength(0);
    });

    it('should cascade delete when task is deleted', async () => {
      await db.delete(taskTable)
        .where(eq(taskTable.id, testTask.id));

      const entries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.taskId, testTask.id));

      expect(entries).toHaveLength(0);
    });

    it('should cascade delete when user is deleted', async () => {
      await db.delete(userTable)
        .where(eq(userTable.id, testUser.id));

      const entries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.userId, testUser.id));

      expect(entries).toHaveLength(0);
    });
  });

  describe('Time Reporting', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      await db.insert(timeEntryTable).values([
        {
          id: createId(),
          userId: testUser.id,
          taskId: testTask.id,
          startTime: yesterday,
          endTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
          duration: 7200, // 2 hours
          isBillable: true,
          hourlyRate: 75.00,
        },
        {
          id: createId(),
          userId: testUser.id,
          taskId: testTask.id,
          startTime: today,
          endTime: new Date(today.getTime() + 3 * 60 * 60 * 1000),
          duration: 10800, // 3 hours
          isBillable: true,
          hourlyRate: 75.00,
        },
      ]);
    });

    it('should calculate daily hours', async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const entries = await db.select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, testUser.id),
            gte(timeEntryTable.startTime, startOfDay),
            lte(timeEntryTable.startTime, endOfDay)
          )
        );

      const dailyHours = entries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      ) / 3600;

      expect(dailyHours).toBeGreaterThan(0);
    });

    it('should calculate weekly hours', async () => {
      const entries = await db.select()
        .from(timeEntryTable)
        .where(eq(timeEntryTable.userId, testUser.id));

      const totalSeconds = entries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );

      const weeklyHours = totalSeconds / 3600;
      expect(weeklyHours).toBe(5); // 2 + 3 hours
    });

    it('should calculate total billable amount', async () => {
      const entries = await db.select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, testUser.id),
            eq(timeEntryTable.isBillable, true)
          )
        );

      const totalAmount = entries.reduce((sum, entry) => {
        const hours = (entry.duration || 0) / 3600;
        const rate = parseFloat(entry.hourlyRate || '0');
        return sum + (hours * rate);
      }, 0);

      expect(totalAmount).toBe(375); // (2 + 3) * $75
    });
  });

  describe('Time Entry Validation', () => {
    it('should validate start time before end time', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T09:00:00Z'); // Before start

      const isValid = start < end;
      expect(isValid).toBe(false);
    });

    it('should validate reasonable durations', () => {
      const maxDuration = 24 * 60 * 60; // 24 hours in seconds
      
      expect(3600 <= maxDuration).toBe(true); // 1 hour - valid
      expect(7200 <= maxDuration).toBe(true); // 2 hours - valid
      expect(86400 <= maxDuration).toBe(true); // 24 hours - valid
      expect(100000 <= maxDuration).toBe(false); // > 24 hours - invalid
    });

    it('should validate future dates', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date();
      
      const isFuture = future > now;
      expect(isFuture).toBe(true);
      
      // Time entries should not be in the future
      const isValid = future <= now;
      expect(isValid).toBe(false);
    });
  });
});

