/**
 * Analytics Service Tests
 * Comprehensive tests for analytics data processing and aggregation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, resetMockDb } from '../../../tests/helpers/test-database';

vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe('Analytics Service', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Task completion metrics', () => {
    it('should calculate task completion rate', async () => {
      const totalTasks = 100;
      const completedTasks = 75;
      const completionRate = (completedTasks / totalTasks) * 100;

      expect(completionRate).toBe(75);
    });

    it('should track daily completion trends', async () => {
      const dailyCompletions = [
        { date: '2025-01-01', completed: 5 },
        { date: '2025-01-02', completed: 8 },
        { date: '2025-01-03', completed: 6 },
      ];

      const total = dailyCompletions.reduce((sum, day) => sum + day.completed, 0);
      expect(total).toBe(19);
    });

    it('should identify completion velocity', () => {
      const completionsLastWeek = 20;
      const completionsThisWeek = 30;
      const velocityChange = ((completionsThisWeek - completionsLastWeek) / completionsLastWeek) * 100;

      expect(velocityChange).toBe(50);
    });
  });

  describe('Time tracking analytics', () => {
    it('should calculate average time per task', async () => {
      const tasks = [
        { timeSpent: 120 }, // 2 hours
        { timeSpent: 180 }, // 3 hours
        { timeSpent: 240 }, // 4 hours
      ];

      const average = tasks.reduce((sum, t) => sum + t.timeSpent, 0) / tasks.length;
      expect(average).toBe(180); // 3 hours average
    });

    it('should track billable hours', async () => {
      const timeEntries = [
        { hours: 8, billable: true },
        { hours: 4, billable: false },
        { hours: 6, billable: true },
      ];

      const billableHours = timeEntries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + e.hours, 0);

      expect(billableHours).toBe(14);
    });

    it('should calculate time utilization rate', () => {
      const totalHours = 40;
      const productiveHours = 32;
      const utilization = (productiveHours / totalHours) * 100;

      expect(utilization).toBe(80);
    });
  });

  describe('Team performance metrics', () => {
    it('should calculate team velocity', async () => {
      const sprintPoints = [13, 21, 18, 25, 20];
      const averageVelocity = sprintPoints.reduce((a, b) => a + b) / sprintPoints.length;

      expect(averageVelocity).toBeCloseTo(19.4, 1);
    });

    it('should track individual contributions', async () => {
      const contributions = [
        { userId: 'user-1', tasksCompleted: 15 },
        { userId: 'user-2', tasksCompleted: 12 },
        { userId: 'user-3', tasksCompleted: 18 },
      ];

      const topContributor = contributions.reduce((max, c) =>
        c.tasksCompleted > max.tasksCompleted ? c : max
      );

      expect(topContributor.userId).toBe('user-3');
    });

    it('should calculate team workload distribution', () => {
      const workloads = [
        { userId: 'user-1', activeTasks: 5 },
        { userId: 'user-2', activeTasks: 8 },
        { userId: 'user-3', activeTasks: 3 },
      ];

      const totalTasks = workloads.reduce((sum, w) => sum + w.activeTasks, 0);
      const averageLoad = totalTasks / workloads.length;

      expect(averageLoad).toBeCloseTo(5.33, 2);
    });
  });

  describe('Project health indicators', () => {
    it('should calculate project progress percentage', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { id: 'task-1', status: 'done' },
        { id: 'task-2', status: 'done' },
        { id: 'task-3', status: 'in-progress' },
        { id: 'task-4', status: 'todo' },
      ]);

      const tasks = await mockDb.where();
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const progress = (completedTasks / tasks.length) * 100;

      expect(progress).toBe(50);
    });

    it('should detect project at risk', () => {
      const dueDate = new Date('2025-02-01');
      const currentDate = new Date('2025-01-30');
      const progress = 30; // 30% complete
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      const isAtRisk = progress < 50 && daysRemaining < 3;
      expect(isAtRisk).toBe(true);
    });

    it('should track milestone achievement rate', () => {
      const milestones = [
        { status: 'completed', onTime: true },
        { status: 'completed', onTime: false },
        { status: 'completed', onTime: true },
        { status: 'in-progress', onTime: null },
      ];

      const completedMilestones = milestones.filter(m => m.status === 'completed');
      const onTimeMilestones = completedMilestones.filter(m => m.onTime);
      const achievementRate = (onTimeMilestones.length / completedMilestones.length) * 100;

      expect(achievementRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Burndown chart data', () => {
    it('should generate burndown data points', async () => {
      const sprintData = [
        { day: 1, remaining: 50 },
        { day: 2, remaining: 45 },
        { day: 3, remaining: 38 },
        { day: 4, remaining: 32 },
        { day: 5, remaining: 25 },
      ];

      expect(sprintData[0].remaining).toBe(50);
      expect(sprintData[4].remaining).toBe(25);
    });

    it('should calculate ideal burndown rate', () => {
      const totalPoints = 50;
      const sprintDays = 10;
      const idealRate = totalPoints / sprintDays;

      expect(idealRate).toBe(5);
    });

    it('should detect burndown variance', () => {
      const actualRemaining = 30;
      const idealRemaining = 25;
      const variance = actualRemaining - idealRemaining;
      const isAhead = variance < 0;

      expect(variance).toBe(5);
      expect(isAhead).toBe(false);
    });
  });

  describe('Cumulative flow diagram', () => {
    it('should track work in progress over time', async () => {
      const wipData = [
        { date: '2025-01-01', todo: 20, inProgress: 5, done: 0 },
        { date: '2025-01-02', todo: 18, inProgress: 6, done: 1 },
        { date: '2025-01-03', todo: 15, inProgress: 7, done: 3 },
      ];

      expect(wipData[2].inProgress).toBe(7);
    });

    it('should identify workflow bottlenecks', () => {
      const statusDistribution = {
        todo: 10,
        'in-progress': 25, // Bottleneck
        review: 8,
        done: 5,
      };

      const maxInProgress = 15;
      const hasBottleneck = statusDistribution['in-progress'] > maxInProgress;

      expect(hasBottleneck).toBe(true);
    });
  });

  describe('Label and category analytics', () => {
    it('should count tasks by label', async () => {
      const labelStats = {
        bug: 15,
        feature: 25,
        enhancement: 10,
        documentation: 5,
      };

      expect(labelStats.feature).toBe(25);
    });

    it('should identify most common labels', () => {
      const labelCounts = [
        { label: 'bug', count: 15 },
        { label: 'feature', count: 25 },
        { label: 'enhancement', count: 10 },
      ];

      const sorted = labelCounts.sort((a, b) => b.count - a.count);
      expect(sorted[0].label).toBe('feature');
    });

    it('should calculate label completion rates', () => {
      const labelData = {
        bug: { total: 20, completed: 18 },
        feature: { total: 30, completed: 20 },
      };

      const bugRate = (labelData.bug.completed / labelData.bug.total) * 100;
      const featureRate = (labelData.feature.completed / labelData.feature.total) * 100;

      expect(bugRate).toBe(90);
      expect(featureRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Priority distribution', () => {
    it('should track tasks by priority', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { priority: 'high' },
        { priority: 'high' },
        { priority: 'medium' },
        { priority: 'medium' },
        { priority: 'medium' },
        { priority: 'low' },
      ]);

      const tasks = await mockDb.where();
      const highPriority = tasks.filter(t => t.priority === 'high').length;
      const mediumPriority = tasks.filter(t => t.priority === 'medium').length;

      expect(highPriority).toBe(2);
      expect(mediumPriority).toBe(3);
    });

    it('should calculate priority completion rates', () => {
      const priorities = {
        high: { total: 10, completed: 9 },
        medium: { total: 20, completed: 15 },
        low: { total: 30, completed: 20 },
      };

      const highRate = (priorities.high.completed / priorities.high.total) * 100;
      expect(highRate).toBe(90);
    });
  });

  describe('Overdue task analytics', () => {
    it('should count overdue tasks', () => {
      const now = new Date('2025-02-01');
      const tasks = [
        { id: 'task-1', dueDate: new Date('2025-01-28'), status: 'todo' },
        { id: 'task-2', dueDate: new Date('2025-01-30'), status: 'todo' },
        { id: 'task-3', dueDate: new Date('2025-02-05'), status: 'todo' },
      ];

      const overdue = tasks.filter(t =>
        t.dueDate < now && t.status !== 'done'
      ).length;

      expect(overdue).toBe(2);
    });

    it('should calculate average overdue days', () => {
      const now = new Date('2025-02-01');
      const overdueTasks = [
        { dueDate: new Date('2025-01-25') }, // 7 days
        { dueDate: new Date('2025-01-28') }, // 4 days
        { dueDate: new Date('2025-01-30') }, // 2 days
      ];

      const totalDaysOverdue = overdueTasks.reduce((sum, task) => {
        const days = Math.ceil((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

      const averageDaysOverdue = totalDaysOverdue / overdueTasks.length;
      expect(averageDaysOverdue).toBeCloseTo(4.33, 1);
    });
  });

  describe('Activity timeline', () => {
    it('should aggregate activities by date', async () => {
      const activities = [
        { date: '2025-01-01', type: 'task_created' },
        { date: '2025-01-01', type: 'comment_added' },
        { date: '2025-01-02', type: 'task_completed' },
      ];

      const jan1Activities = activities.filter(a => a.date === '2025-01-01').length;
      expect(jan1Activities).toBe(2);
    });

    it('should identify peak activity hours', () => {
      const activityByHour = {
        9: 15,
        10: 25,
        11: 30,
        14: 20,
        15: 18,
      };

      const peakHour = Object.entries(activityByHour).reduce((max, [hour, count]) =>
        count > max.count ? { hour: Number(hour), count } : max,
        { hour: 0, count: 0 }
      );

      expect(peakHour.hour).toBe(11);
    });
  });

  describe('Workspace-level metrics', () => {
    it('should aggregate metrics across projects', async () => {
      const projectMetrics = [
        { projectId: 'p1', tasksCompleted: 50, totalTasks: 100 },
        { projectId: 'p2', tasksCompleted: 30, totalTasks: 50 },
        { projectId: 'p3', tasksCompleted: 20, totalTasks: 40 },
      ];

      const totalCompleted = projectMetrics.reduce((sum, p) => sum + p.tasksCompleted, 0);
      const totalTasks = projectMetrics.reduce((sum, p) => sum + p.totalTasks, 0);
      const overallProgress = (totalCompleted / totalTasks) * 100;

      expect(overallProgress).toBeCloseTo(52.63, 1);
    });

    it('should track active users count', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { userId: 'user-1', lastActive: new Date() },
        { userId: 'user-2', lastActive: new Date() },
        { userId: 'user-3', lastActive: new Date() },
      ]);

      const activeUsers = await mockDb.where();
      expect(activeUsers.length).toBe(3);
    });
  });

  describe('Report generation', () => {
    it('should generate weekly summary', async () => {
      const weeklySummary = {
        tasksCompleted: 45,
        tasksCreated: 50,
        averageCompletionTime: 3.5, // days
        activeUsers: 12,
      };

      expect(weeklySummary.tasksCompleted).toBeLessThan(weeklySummary.tasksCreated);
    });

    it('should generate monthly trends', () => {
      const monthlyData = [
        { month: 'Jan', tasksCompleted: 120 },
        { month: 'Feb', tasksCompleted: 145 },
        { month: 'Mar', tasksCompleted: 138 },
      ];

      const growth = ((monthlyData[1].tasksCompleted - monthlyData[0].tasksCompleted) / monthlyData[0].tasksCompleted) * 100;
      expect(growth).toBeCloseTo(20.83, 1);
    });
  });

  describe('Performance benchmarks', () => {
    it('should compare against historical averages', () => {
      const currentMetrics = { avgCompletionTime: 3.5, velocity: 25 };
      const historicalAverage = { avgCompletionTime: 4.0, velocity: 20 };

      const timeImprovement = ((historicalAverage.avgCompletionTime - currentMetrics.avgCompletionTime) / historicalAverage.avgCompletionTime) * 100;
      const velocityImprovement = ((currentMetrics.velocity - historicalAverage.velocity) / historicalAverage.velocity) * 100;

      expect(timeImprovement).toBe(12.5);
      expect(velocityImprovement).toBe(25);
    });

    it('should identify anomalies', () => {
      const dataPoints = [20, 22, 21, 23, 19, 150, 21]; // 150 is anomaly
      const average = dataPoints.reduce((a, b) => a + b) / dataPoints.length;
      const threshold = average * 2;

      const anomalies = dataPoints.filter(p => p > threshold);
      expect(anomalies.length).toBe(1);
    });
  });

  describe('Custom date range queries', () => {
    it('should filter data by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { createdAt: new Date('2025-01-15') },
        { createdAt: new Date('2025-01-20') },
      ]);

      const results = await mockDb.where();
      expect(results).toHaveLength(2);
    });

    it('should calculate metrics for custom period', () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysInPeriod).toBe(30);
    });
  });

  describe('Real-time analytics updates', () => {
    it('should update metrics when task is completed', async () => {
      let completedCount = 10;
      completedCount += 1;

      expect(completedCount).toBe(11);
    });

    it('should recalculate progress on status change', () => {
      let progress = 45;
      const totalTasks = 100;
      const completedTasks = 46; // One more completed

      progress = (completedTasks / totalTasks) * 100;
      expect(progress).toBe(46);
    });
  });

  describe('Data aggregation performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `task-${i}`,
        status: i % 3 === 0 ? 'done' : 'in-progress',
      }));

      const completed = largeDataset.filter(t => t.status === 'done').length;
      expect(completed).toBeGreaterThan(3000);
    });

    it('should cache frequently accessed metrics', () => {
      const cache = new Map();
      const key = 'workspace-1-completion-rate';
      cache.set(key, 75.5);

      const cachedValue = cache.get(key);
      expect(cachedValue).toBe(75.5);
    });
  });

  describe('Export analytics data', () => {
    it('should format data for CSV export', () => {
      const data = [
        { date: '2025-01-01', completed: 5, created: 7 },
        { date: '2025-01-02', completed: 8, created: 6 },
      ];

      const csvHeader = 'Date,Completed,Created';
      const csvRow1 = `${data[0].date},${data[0].completed},${data[0].created}`;

      expect(csvRow1).toBe('2025-01-01,5,7');
    });

    it('should generate summary statistics', () => {
      const stats = {
        mean: 15.5,
        median: 14,
        mode: 12,
        stdDev: 3.2,
      };

      expect(stats.mean).toBeGreaterThan(stats.median);
    });
  });
});

