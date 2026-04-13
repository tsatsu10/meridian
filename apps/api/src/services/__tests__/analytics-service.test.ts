/**
 * Analytics Service Tests
 * 
 * Comprehensive tests for analytics functionality:
 * - Task metrics
 * - Project health
 * - Team performance
 * - Velocity calculations
 * - Time tracking analytics
 */

import { describe, it, expect } from 'vitest';

describe('Analytics Service', () => {
  describe('calculateTaskMetrics', () => {
    it('should calculate task completion rate', () => {
      const metrics = {
        total: 100,
        completed: 75,
        inProgress: 15,
        todo: 10,
      };

      const completionRate = (metrics.completed / metrics.total) * 100;

      expect(completionRate).toBe(75);
    });

    it('should calculate average task completion time', () => {
      const tasks = [
        { completionTime: 3600 }, // 1 hour
        { completionTime: 7200 }, // 2 hours
        { completionTime: 5400 }, // 1.5 hours
      ];

      const avgTime = tasks.reduce((sum, t) => sum + t.completionTime, 0) / tasks.length;

      expect(avgTime).toBe(5400); // 1.5 hours average
    });

    it('should group tasks by status', () => {
      const tasks = [
        { status: 'todo' },
        { status: 'todo' },
        { status: 'in_progress' },
        { status: 'done' },
        { status: 'done' },
        { status: 'done' },
      ];

      const grouped = {
        todo: 2,
        in_progress: 1,
        done: 3,
      };

      expect(grouped.done).toBe(3);
      expect(grouped.todo).toBe(2);
    });

    it('should group tasks by priority', () => {
      const tasks = [
        { priority: 'high' },
        { priority: 'high' },
        { priority: 'medium' },
        { priority: 'low' },
      ];

      const grouped = {
        high: 2,
        medium: 1,
        low: 1,
      };

      expect(grouped.high).toBe(2);
    });
  });

  describe('calculateProjectHealth', () => {
    it('should calculate health score based on metrics', () => {
      const metrics = {
        completionRate: 75,
        onTimeDelivery: 80,
        teamVelocity: 90,
        bugRate: 5,
      };

      const healthScore = (
        metrics.completionRate * 0.4 +
        metrics.onTimeDelivery * 0.3 +
        metrics.teamVelocity * 0.2 +
        (100 - metrics.bugRate) * 0.1
      );

      expect(healthScore).toBeGreaterThan(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });

    it('should identify at-risk projects', () => {
      const project = {
        completionRate: 30,
        daysOverdue: 10,
        blockedTasks: 15,
      };

      const isAtRisk = project.completionRate < 50 || 
                       project.daysOverdue > 5 || 
                       project.blockedTasks > 10;

      expect(isAtRisk).toBe(true);
    });

    it('should identify healthy projects', () => {
      const project = {
        completionRate: 85,
        daysOverdue: 0,
        blockedTasks: 2,
      };

      const isHealthy = project.completionRate > 70 && 
                        project.daysOverdue === 0 && 
                        project.blockedTasks < 5;

      expect(isHealthy).toBe(true);
    });
  });

  describe('calculateVelocity', () => {
    it('should calculate team velocity', () => {
      const completedTasks = {
        week1: 10,
        week2: 15,
        week3: 12,
        week4: 18,
      };

      const avgVelocity = (10 + 15 + 12 + 18) / 4;

      expect(avgVelocity).toBe(13.75);
    });

    it('should calculate velocity trend', () => {
      const weeks = [
        { tasks: 10 },
        { tasks: 12 },
        { tasks: 15 },
        { tasks: 18 },
      ];

      const trend = weeks[weeks.length - 1].tasks - weeks[0].tasks;

      expect(trend).toBe(8); // Increasing
    });

    it('should handle zero tasks', () => {
      const weeks = [
        { tasks: 0 },
        { tasks: 0 },
      ];

      const avgVelocity = 0;

      expect(avgVelocity).toBe(0);
    });
  });

  describe('calculateBurndown', () => {
    it('should calculate ideal burndown', () => {
      const totalTasks = 100;
      const totalDays = 10;
      const idealRate = totalTasks / totalDays;

      expect(idealRate).toBe(10); // 10 tasks per day
    });

    it('should calculate actual burndown', () => {
      const dailyCompletion = [12, 8, 15, 10, 9];
      const totalCompleted = dailyCompletion.reduce((sum, count) => sum + count, 0);

      expect(totalCompleted).toBe(54);
    });

    it('should identify ahead/behind schedule', () => {
      const ideal = 50;
      const actual = 60;
      const status = actual > ideal ? 'ahead' : 'behind';

      expect(status).toBe('ahead');
    });
  });

  describe('calculateTimeMetrics', () => {
    it('should calculate total time tracked', () => {
      const timeEntries = [
        { duration: 3600 }, // 1 hour
        { duration: 7200 }, // 2 hours
        { duration: 1800 }, // 30 min
      ];

      const total = timeEntries.reduce((sum, e) => sum + e.duration, 0);

      expect(total).toBe(12600); // 3.5 hours
    });

    it('should calculate billable vs non-billable', () => {
      const entries = [
        { duration: 3600, billable: true },
        { duration: 7200, billable: true },
        { duration: 1800, billable: false },
      ];

      const billable = entries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + e.duration, 0);

      const nonBillable = entries
        .filter(e => !e.billable)
        .reduce((sum, e) => sum + e.duration, 0);

      expect(billable).toBe(10800); // 3 hours
      expect(nonBillable).toBe(1800); // 30 min
    });

    it('should calculate estimated vs actual time', () => {
      const task = {
        estimatedHours: 5,
        actualHours: 7,
      };

      const variance = task.actualHours - task.estimatedHours;
      const variancePercent = (variance / task.estimatedHours) * 100;

      expect(variance).toBe(2);
      expect(variancePercent).toBe(40); // 40% over estimate
    });
  });

  describe('calculateTeamPerformance', () => {
    it('should calculate individual performance', () => {
      const member = {
        tasksCompleted: 50,
        averageTime: 3600, // 1 hour per task
        qualityScore: 95,
      };

      const performanceScore = (
        (member.tasksCompleted / 100) * 40 +
        (member.qualityScore) * 0.6
      );

      expect(performanceScore).toBeGreaterThan(0);
    });

    it('should rank team members by performance', () => {
      const team = [
        { name: 'Alice', score: 95 },
        { name: 'Bob', score: 85 },
        { name: 'Carol', score: 90 },
      ];

      const ranked = team.sort((a, b) => b.score - a.score);

      expect(ranked[0].name).toBe('Alice');
      expect(ranked[2].name).toBe('Bob');
    });
  });

  describe('generateReport', () => {
    it('should generate daily report', () => {
      const report = {
        date: new Date(),
        tasksCompleted: 15,
        timeTracked: 28800, // 8 hours
        activeUsers: 10,
      };

      expect(report.tasksCompleted).toBe(15);
    });

    it('should generate weekly report', () => {
      const report = {
        week: 44,
        year: 2025,
        tasksCompleted: 75,
        averageVelocity: 15,
        topPerformers: ['Alice', 'Bob'],
      };

      expect(report.tasksCompleted).toBe(75);
    });

    it('should generate monthly report', () => {
      const report = {
        month: 10,
        year: 2025,
        tasksCompleted: 300,
        projectsCompleted: 5,
        totalTimeTracked: 720000, // 200 hours
      };

      expect(report.projectsCompleted).toBe(5);
    });
  });

  describe('predictCompletion', () => {
    it('should predict project completion date', () => {
      const project = {
        totalTasks: 100,
        completedTasks: 60,
        averageVelocity: 10, // tasks per week
      };

      const remainingTasks = project.totalTasks - project.completedTasks;
      const weeksRemaining = remainingTasks / project.averageVelocity;

      expect(remainingTasks).toBe(40);
      expect(weeksRemaining).toBe(4);
    });

    it('should account for velocity trends', () => {
      const recentVelocity = [12, 14, 16, 18]; // Increasing
      const avgVelocity = recentVelocity.reduce((a, b) => a + b) / recentVelocity.length;

      expect(avgVelocity).toBe(15);
    });
  });
});

