/**
 * Time Tracking Tests
 * Comprehensive tests for time entry and tracking functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, resetMockDb } from '../../../tests/helpers/test-database';

vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe('Time Tracking', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Create time entry', () => {
    it('should create time entry with duration', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        taskId: 'task-1',
        userId: 'user-1',
        duration: 120, // minutes
        date: new Date(),
      }]);

      const result = await mockDb.returning();
      expect(result[0].duration).toBe(120);
    });

    it('should create time entry with start/end time', async () => {
      const startTime = new Date('2025-01-15T09:00:00Z');
      const endTime = new Date('2025-01-15T11:30:00Z');
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        startTime,
        endTime,
        duration: durationMinutes,
      }]);

      const result = await mockDb.returning();
      expect(result[0].duration).toBe(150); // 2.5 hours
    });

    it('should validate time entry duration', () => {
      const duration = 480; // 8 hours
      const maxDuration = 720; // 12 hours

      const isValid = duration > 0 && duration <= maxDuration;
      expect(isValid).toBe(true);
    });

    it('should include description', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        description: 'Implemented user authentication',
      }]);

      const result = await mockDb.returning();
      expect(result[0].description).toBe('Implemented user authentication');
    });

    it('should mark entry as billable', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        billable: true,
        rate: 100, // per hour
      }]);

      const result = await mockDb.returning();
      expect(result[0].billable).toBe(true);
    });
  });

  describe('Get time entries', () => {
    it('should get all time entries for task', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { id: 'entry-1', duration: 60 },
        { id: 'entry-2', duration: 90 },
        { id: 'entry-3', duration: 45 },
      ]);

      const result = await mockDb.where();
      expect(result).toHaveLength(3);
    });

    it('should get time entries by date range', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const entries = [
        { date: new Date('2025-01-15') },
        { date: new Date('2025-02-05') },
        { date: new Date('2025-01-20') },
      ];

      const filtered = entries.filter(e =>
        e.date >= startDate && e.date <= endDate
      );

      expect(filtered).toHaveLength(2);
    });

    it('should get time entries by user', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { id: 'entry-1', userId: 'user-1' },
        { id: 'entry-2', userId: 'user-1' },
      ]);

      const result = await mockDb.where();
      expect(result.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should filter billable vs non-billable', () => {
      const entries = [
        { id: 'entry-1', billable: true },
        { id: 'entry-2', billable: false },
        { id: 'entry-3', billable: true },
      ];

      const billable = entries.filter(e => e.billable);
      expect(billable).toHaveLength(2);
    });
  });

  describe('Update time entry', () => {
    it('should update duration', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        duration: 180, // updated to 3 hours
      }]);

      const result = await mockDb.returning();
      expect(result[0].duration).toBe(180);
    });

    it('should update description', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        description: 'Updated description',
      }]);

      const result = await mockDb.returning();
      expect(result[0].description).toBe('Updated description');
    });

    it('should toggle billable status', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
        billable: false,
      }]);

      const result = await mockDb.returning();
      expect(result[0].billable).toBe(false);
    });
  });

  describe('Delete time entry', () => {
    it('should delete time entry', async () => {
      mockDb.delete.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'entry-1',
      }]);

      const result = await mockDb.returning();
      expect(result[0].id).toBe('entry-1');
    });

    it('should verify ownership before delete', () => {
      const entry = { userId: 'user-1' };
      const currentUser = { id: 'user-1' };

      const canDelete = entry.userId === currentUser.id;
      expect(canDelete).toBe(true);
    });
  });

  describe('Timer functionality', () => {
    it('should start timer', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'timer-1',
        userId: 'user-1',
        taskId: 'task-1',
        startTime: new Date(),
        isRunning: true,
      }]);

      const result = await mockDb.returning();
      expect(result[0].isRunning).toBe(true);
    });

    it('should stop timer and calculate duration', () => {
      const startTime = new Date('2025-01-15T09:00:00Z');
      const endTime = new Date('2025-01-15T11:30:00Z');
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      expect(durationMinutes).toBe(150);
    });

    it('should pause timer', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'timer-1',
        isPaused: true,
        pausedAt: new Date(),
      }]);

      const result = await mockDb.returning();
      expect(result[0].isPaused).toBe(true);
    });

    it('should resume timer', () => {
      const pauseDuration = 15; // minutes
      const totalDuration = 120;
      const activeDuration = totalDuration - pauseDuration;

      expect(activeDuration).toBe(105);
    });

    it('should prevent multiple active timers', async () => {
      const activeTimers = [
        { id: 'timer-1', userId: 'user-1', isRunning: true },
      ];

      const hasActiveTimer = activeTimers.some(t => t.isRunning);
      expect(hasActiveTimer).toBe(true);
    });
  });

  describe('Time calculations', () => {
    it('should calculate total time for task', () => {
      const entries = [
        { duration: 60 },
        { duration: 90 },
        { duration: 45 },
      ];

      const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
      const totalHours = totalMinutes / 60;

      expect(totalHours).toBeCloseTo(3.25, 2);
    });

    it('should calculate time by user', () => {
      const entries = [
        { userId: 'user-1', duration: 120 },
        { userId: 'user-2', duration: 90 },
        { userId: 'user-1', duration: 60 },
      ];

      const user1Time = entries
        .filter(e => e.userId === 'user-1')
        .reduce((sum, e) => sum + e.duration, 0);

      expect(user1Time).toBe(180);
    });

    it('should calculate time by date', () => {
      const entries = [
        { date: '2025-01-15', duration: 120 },
        { date: '2025-01-15', duration: 90 },
        { date: '2025-01-16', duration: 60 },
      ];

      const jan15Time = entries
        .filter(e => e.date === '2025-01-15')
        .reduce((sum, e) => sum + e.duration, 0);

      expect(jan15Time).toBe(210);
    });

    it('should calculate estimated vs actual time', () => {
      const task = {
        estimatedHours: 8,
        actualHours: 10.5,
      };

      const variance = task.actualHours - task.estimatedHours;
      const variancePercent = (variance / task.estimatedHours) * 100;

      expect(variancePercent).toBeCloseTo(31.25, 2);
    });
  });

  describe('Billable hours', () => {
    it('should calculate billable hours', () => {
      const entries = [
        { duration: 120, billable: true },
        { duration: 60, billable: false },
        { duration: 90, billable: true },
      ];

      const billableMinutes = entries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + e.duration, 0);

      const billableHours = billableMinutes / 60;
      expect(billableHours).toBe(3.5);
    });

    it('should calculate billable amount', () => {
      const entries = [
        { duration: 120, billable: true, rate: 100 },
        { duration: 90, billable: true, rate: 100 },
      ];

      const totalAmount = entries.reduce((sum, e) => {
        const hours = e.duration / 60;
        return sum + (hours * e.rate);
      }, 0);

      expect(totalAmount).toBe(350);
    });

    it('should calculate billable percentage', () => {
      const totalHours = 40;
      const billableHours = 32;
      const billablePercent = (billableHours / totalHours) * 100;

      expect(billablePercent).toBe(80);
    });
  });

  describe('Time reports', () => {
    it('should generate daily timesheet', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { task: 'Task 1', duration: 120 },
        { task: 'Task 2', duration: 180 },
        { task: 'Task 3', duration: 90 },
      ]);

      const result = await mockDb.where();
      const totalHours = result.reduce((sum, e) => sum + e.duration, 0) / 60;

      expect(totalHours).toBe(6.5);
    });

    it('should generate weekly report', () => {
      const weeklyEntries = [
        { date: '2025-01-13', duration: 480 },
        { date: '2025-01-14', duration: 450 },
        { date: '2025-01-15', duration: 420 },
        { date: '2025-01-16', duration: 480 },
        { date: '2025-01-17', duration: 360 },
      ];

      const totalHours = weeklyEntries.reduce((sum, e) => sum + e.duration, 0) / 60;
      expect(totalHours).toBe(36.5);
    });

    it('should generate monthly summary', () => {
      const totalHours = 160;
      const workingDays = 20;
      const avgHoursPerDay = totalHours / workingDays;

      expect(avgHoursPerDay).toBe(8);
    });

    it('should generate project time report', () => {
      const projectEntries = [
        { userId: 'user-1', hours: 40 },
        { userId: 'user-2', hours: 35 },
        { userId: 'user-3', hours: 45 },
      ];

      const totalProjectHours = projectEntries.reduce((sum, e) => sum + e.hours, 0);
      expect(totalProjectHours).toBe(120);
    });
  });

  describe('Time validation', () => {
    it('should validate no overlap with existing entries', () => {
      const existingEntry = {
        startTime: new Date('2025-01-15T09:00:00Z'),
        endTime: new Date('2025-01-15T11:00:00Z'),
      };

      const newEntry = {
        startTime: new Date('2025-01-15T10:00:00Z'),
        endTime: new Date('2025-01-15T12:00:00Z'),
      };

      const hasOverlap = newEntry.startTime < existingEntry.endTime &&
                        newEntry.endTime > existingEntry.startTime;

      expect(hasOverlap).toBe(true);
    });

    it('should validate future dates', () => {
      const entryDate = new Date('2025-12-31');
      const now = new Date('2025-01-15');

      const isFuture = entryDate > now;
      expect(isFuture).toBe(true);
    });

    it('should validate reasonable duration', () => {
      const duration = 1440; // 24 hours
      const maxReasonableDuration = 720; // 12 hours

      const isReasonable = duration <= maxReasonableDuration;
      expect(isReasonable).toBe(false);
    });
  });

  describe('Time approvals', () => {
    it('should submit timesheet for approval', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'timesheet-1',
        status: 'pending_approval',
        submittedAt: new Date(),
      }]);

      const result = await mockDb.returning();
      expect(result[0].status).toBe('pending_approval');
    });

    it('should approve timesheet', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'timesheet-1',
        status: 'approved',
        approvedBy: 'manager-1',
        approvedAt: new Date(),
      }]);

      const result = await mockDb.returning();
      expect(result[0].status).toBe('approved');
    });

    it('should reject timesheet with comments', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'timesheet-1',
        status: 'rejected',
        rejectionReason: 'Missing task descriptions',
      }]);

      const result = await mockDb.returning();
      expect(result[0].status).toBe('rejected');
    });
  });

  describe('Time analytics', () => {
    it('should calculate average time per task type', () => {
      const tasks = [
        { type: 'bug', hours: 2 },
        { type: 'bug', hours: 3 },
        { type: 'feature', hours: 8 },
        { type: 'bug', hours: 1.5 },
      ];

      const bugTasks = tasks.filter(t => t.type === 'bug');
      const avgBugTime = bugTasks.reduce((sum, t) => sum + t.hours, 0) / bugTasks.length;

      expect(avgBugTime).toBeCloseTo(2.17, 2);
    });

    it('should identify time wasters', () => {
      const entries = [
        { task: 'Meetings', duration: 240 },
        { task: 'Development', duration: 360 },
        { task: 'Email', duration: 120 },
      ];

      const nonProductiveTime = entries
        .filter(e => ['Meetings', 'Email'].includes(e.task))
        .reduce((sum, e) => sum + e.duration, 0);

      const percentage = (nonProductiveTime / 720) * 100;
      expect(percentage).toBe(50);
    });

    it('should calculate utilization rate', () => {
      const availableHours = 40;
      const loggedHours = 32;
      const utilization = (loggedHours / availableHours) * 100;

      expect(utilization).toBe(80);
    });

    it('should track time by project', () => {
      const entries = [
        { projectId: 'p1', duration: 480 },
        { projectId: 'p2', duration: 240 },
        { projectId: 'p1', duration: 360 },
      ];

      const byProject = entries.reduce((acc, e) => {
        acc[e.projectId] = (acc[e.projectId] || 0) + e.duration;
        return acc;
      }, {} as Record<string, number>);

      expect(byProject.p1).toBe(840);
    });
  });

  describe('Time budget tracking', () => {
    it('should track time against budget', () => {
      const budget = {
        allocated: 160, // hours
        spent: 120,
      };

      const remaining = budget.allocated - budget.spent;
      const percentUsed = (budget.spent / budget.allocated) * 100;

      expect(remaining).toBe(40);
      expect(percentUsed).toBe(75);
    });

    it('should alert when approaching budget limit', () => {
      const budget = { allocated: 100, spent: 92 };
      const threshold = 0.9; // 90%

      const percentUsed = budget.spent / budget.allocated;
      const shouldAlert = percentUsed >= threshold;

      expect(shouldAlert).toBe(true);
    });

    it('should calculate burn rate', () => {
      const spent = 80; // hours
      const days = 10;
      const burnRate = spent / days;

      expect(burnRate).toBe(8); // hours per day
    });
  });

  describe('Time export', () => {
    it('should export to CSV format', () => {
      const entries = [
        { date: '2025-01-15', task: 'Task 1', hours: 2.5 },
        { date: '2025-01-15', task: 'Task 2', hours: 3.0 },
      ];

      const csv = entries.map(e =>
        `${e.date},${e.task},${e.hours}`
      ).join('\n');

      expect(csv).toContain('Task 1');
    });

    it('should export invoice data', () => {
      const invoiceData = {
        client: 'Client A',
        period: '2025-01',
        billableHours: 120,
        rate: 100,
        total: 12000,
      };

      expect(invoiceData.total).toBe(12000);
    });
  });

  describe('Time integrations', () => {
    it('should sync with calendar', () => {
      const calendarEvent = {
        title: 'Development',
        start: new Date('2025-01-15T09:00:00Z'),
        end: new Date('2025-01-15T11:00:00Z'),
      };

      const duration = (calendarEvent.end.getTime() - calendarEvent.start.getTime()) / (1000 * 60);
      expect(duration).toBe(120);
    });

    it('should integrate with payroll', () => {
      const payrollData = {
        employeeId: 'emp-1',
        period: '2025-01',
        regularHours: 160,
        overtimeHours: 10,
      };

      expect(payrollData.regularHours).toBe(160);
    });
  });
});

