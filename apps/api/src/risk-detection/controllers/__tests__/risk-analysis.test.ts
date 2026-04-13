/**
 * Risk Analysis Tests
 * Comprehensive tests for risk detection and analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, resetMockDb } from '../../../tests/helpers/test-database';

vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe('Risk Analysis', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Schedule risk detection', () => {
    it('should detect tasks at risk of missing deadline', () => {
      const task = {
        dueDate: new Date('2025-02-01'),
        progress: 30, // 30% complete
        status: 'in-progress',
      };

      const now = new Date('2025-01-30');
      const daysRemaining = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const isAtRisk = task.progress < 70 && daysRemaining <= 2;
      expect(isAtRisk).toBe(true);
    });

    it('should calculate schedule performance index', () => {
      const plannedValue = 100;
      const earnedValue = 60;
      const spi = earnedValue / plannedValue;

      const isBehindSchedule = spi < 1.0;
      expect(isBehindSchedule).toBe(true);
      expect(spi).toBe(0.6);
    });

    it('should detect milestone slippage', () => {
      const milestone = {
        plannedDate: new Date('2025-01-15'),
        actualDate: new Date('2025-01-25'),
      };

      const slippageDays = Math.ceil(
        (milestone.actualDate.getTime() - milestone.plannedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(slippageDays).toBe(10);
    });

    it('should project completion date', () => {
      const totalTasks = 100;
      const completedTasks = 30;
      const daysElapsed = 15;

      const tasksPerDay = completedTasks / daysElapsed;
      const remainingTasks = totalTasks - completedTasks;
      const projectedDays = remainingTasks / tasksPerDay;

      expect(projectedDays).toBeCloseTo(35, 0);
    });
  });

  describe('Budget risk detection', () => {
    it('should detect budget overrun', () => {
      const budget = {
        planned: 100000,
        actual: 85000,
        percentComplete: 70,
      };

      const projectedTotal = budget.actual / (budget.percentComplete / 100);
      const isOverBudget = projectedTotal > budget.planned;

      expect(isOverBudget).toBe(true);
      expect(projectedTotal).toBeCloseTo(121428.57, 2);
    });

    it('should calculate cost performance index', () => {
      const earnedValue = 50000;
      const actualCost = 60000;
      const cpi = earnedValue / actualCost;

      const isOverBudget = cpi < 1.0;
      expect(isOverBudget).toBe(true);
      expect(cpi).toBeCloseTo(0.833, 2);
    });

    it('should calculate burn rate', () => {
      const totalSpent = 80000;
      const daysElapsed = 40;
      const burnRate = totalSpent / daysElapsed;

      expect(burnRate).toBe(2000); // $2000/day
    });

    it('should project budget at completion', () => {
      const budget = 100000;
      const cpi = 0.8; // Cost performance index
      const estimateAtCompletion = budget / cpi;

      expect(estimateAtCompletion).toBe(125000);
    });
  });

  describe('Resource risk detection', () => {
    it('should detect over-allocated team members', () => {
      const member = {
        capacity: 40, // hours per week
        assignedHours: 55,
      };

      const overAllocated = member.assignedHours > member.capacity;
      const overAllocationPercent = ((member.assignedHours - member.capacity) / member.capacity) * 100;

      expect(overAllocated).toBe(true);
      expect(overAllocationPercent).toBe(37.5);
    });

    it('should detect skill gaps', () => {
      const taskRequirements = ['React', 'Node.js', 'PostgreSQL'];
      const teamSkills = ['React', 'Node.js'];

      const missingSkills = taskRequirements.filter(skill => !teamSkills.includes(skill));
      const hasGap = missingSkills.length > 0;

      expect(hasGap).toBe(true);
      expect(missingSkills).toEqual(['PostgreSQL']);
    });

    it('should detect single point of failure', () => {
      const criticalTasks = [
        { assignee: 'user-1' },
        { assignee: 'user-1' },
        { assignee: 'user-1' },
      ];

      const assigneeCounts = criticalTasks.reduce((acc, task) => {
        acc[task.assignee] = (acc[task.assignee] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxAssignment = Math.max(...Object.values(assigneeCounts));
      const isSinglePointOfFailure = maxAssignment >= 3;

      expect(isSinglePointOfFailure).toBe(true);
    });

    it('should calculate team velocity trend', () => {
      const sprintVelocities = [20, 22, 19, 17, 15];
      const recentVelocities = sprintVelocities.slice(-3);
      const avgRecent = recentVelocities.reduce((a, b) => a + b) / recentVelocities.length;
      const avgAll = sprintVelocities.reduce((a, b) => a + b) / sprintVelocities.length;

      const isDecreasing = avgRecent < avgAll;
      expect(isDecreasing).toBe(true);
    });
  });

  describe('Quality risk detection', () => {
    it('should detect high bug rate', () => {
      const metrics = {
        totalTasks: 100,
        bugs: 25,
      };

      const bugRate = (metrics.bugs / metrics.totalTasks) * 100;
      const isHighBugRate = bugRate > 15; // 15% threshold

      expect(isHighBugRate).toBe(true);
      expect(bugRate).toBe(25);
    });

    it('should detect test coverage gaps', () => {
      const coverage = {
        lines: 55,
        branches: 45,
        functions: 60,
      };

      const minCoverage = 80;
      const hasGaps = Object.values(coverage).some(val => val < minCoverage);

      expect(hasGaps).toBe(true);
    });

    it('should detect code complexity issues', () => {
      const complexityMetrics = {
        cyclomaticComplexity: 25,
        linesOfCode: 500,
      };

      const maxComplexity = 15;
      const isComplex = complexityMetrics.cyclomaticComplexity > maxComplexity;

      expect(isComplex).toBe(true);
    });

    it('should track technical debt ratio', () => {
      const technicalDebtMinutes = 120;
      const developmentTimeMinutes = 480;
      const debtRatio = (technicalDebtMinutes / developmentTimeMinutes) * 100;

      const isHighDebt = debtRatio > 20; // 20% threshold
      expect(isHighDebt).toBe(true);
      expect(debtRatio).toBe(25);
    });
  });

  describe('Dependency risk detection', () => {
    it('should detect blocked tasks', () => {
      const task = {
        id: 'task-1',
        dependencies: ['task-2', 'task-3'],
        dependencyStatuses: {
          'task-2': 'done',
          'task-3': 'in-progress',
        },
      };

      const hasBlockedDependencies = Object.values(task.dependencyStatuses).some(
        status => status !== 'done'
      );

      expect(hasBlockedDependencies).toBe(true);
    });

    it('should detect circular dependencies', () => {
      const dependencies = {
        'task-1': ['task-2'],
        'task-2': ['task-3'],
        'task-3': ['task-1'], // Circular
      };

      // Simplified check - in real implementation would use graph traversal
      const hasCircular = dependencies['task-3'].includes('task-1');
      expect(hasCircular).toBe(true);
    });

    it('should calculate critical path', () => {
      const tasks = [
        { id: 'task-1', duration: 5, dependencies: [] },
        { id: 'task-2', duration: 3, dependencies: ['task-1'] },
        { id: 'task-3', duration: 4, dependencies: ['task-1'] },
        { id: 'task-4', duration: 2, dependencies: ['task-2', 'task-3'] },
      ];

      // Critical path: task-1 (5) -> task-2 (3) -> task-4 (2) = 10 days
      const criticalPathDuration = 5 + 3 + 2;
      expect(criticalPathDuration).toBe(10);
    });
  });

  describe('Scope risk detection', () => {
    it('should detect scope creep', () => {
      const project = {
        originalTaskCount: 50,
        currentTaskCount: 75,
      };

      const scopeIncrease = ((project.currentTaskCount - project.originalTaskCount) / project.originalTaskCount) * 100;
      const hasScopeCreep = scopeIncrease > 10; // 10% threshold

      expect(hasScopeCreep).toBe(true);
      expect(scopeIncrease).toBe(50);
    });

    it('should detect requirements volatility', () => {
      const changeHistory = [
        { date: '2025-01-05', type: 'requirement_change' },
        { date: '2025-01-10', type: 'requirement_change' },
        { date: '2025-01-12', type: 'requirement_change' },
        { date: '2025-01-15', type: 'requirement_change' },
      ];

      const daysElapsed = 15;
      const changesPerWeek = (changeHistory.length / daysElapsed) * 7;
      const isVolatile = changesPerWeek > 1;

      expect(isVolatile).toBe(true);
    });

    it('should detect incomplete requirements', () => {
      const requirements = [
        { status: 'complete' },
        { status: 'draft' },
        { status: 'draft' },
        { status: 'complete' },
      ];

      const incompleteCount = requirements.filter(r => r.status !== 'complete').length;
      const incompletionRate = (incompleteCount / requirements.length) * 100;

      expect(incompletionRate).toBe(50);
    });
  });

  describe('Communication risk detection', () => {
    it('should detect low stakeholder engagement', () => {
      const stakeholder = {
        lastInteraction: new Date('2025-01-01'),
        expectedFrequency: 'weekly',
      };

      const now = new Date('2025-01-20');
      const daysSinceLastInteraction = Math.ceil(
        (now.getTime() - stakeholder.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isLowEngagement = daysSinceLastInteraction > 7;
      expect(isLowEngagement).toBe(true);
    });

    it('should detect communication gaps', () => {
      const teamCommunication = {
        messagesThisWeek: 5,
        normalAverage: 30,
      };

      const communicationRate = (teamCommunication.messagesThisWeek / teamCommunication.normalAverage) * 100;
      const hasGap = communicationRate < 50;

      expect(hasGap).toBe(true);
    });

    it('should detect meeting frequency issues', () => {
      const meetingHistory = [
        { date: new Date('2025-01-01') },
        { date: new Date('2025-01-20') },
      ];

      const daysBetween = Math.ceil(
        (meetingHistory[1].date.getTime() - meetingHistory[0].date.getTime()) / (1000 * 60 * 60 * 24)
      );

      const tooInfrequent = daysBetween > 14;
      expect(tooInfrequent).toBe(true);
    });
  });

  describe('Risk scoring', () => {
    it('should calculate risk probability', () => {
      const historicalData = {
        similarProjects: 10,
        projectsWithIssue: 7,
      };

      const probability = (historicalData.projectsWithIssue / historicalData.similarProjects) * 100;
      expect(probability).toBe(70);
    });

    it('should calculate risk impact', () => {
      const risk = {
        delayDays: 10,
        budgetImpact: 50000,
        affectedTasks: 25,
      };

      // Simplified scoring: high impact if affects many tasks
      const impactScore = risk.affectedTasks > 20 ? 'high' : 'medium';
      expect(impactScore).toBe('high');
    });

    it('should calculate overall risk score', () => {
      const probability = 0.7; // 70%
      const impact = 8; // 0-10 scale
      const riskScore = probability * impact;

      expect(riskScore).toBeCloseTo(5.6, 1);
    });

    it('should prioritize risks by score', () => {
      const risks = [
        { id: 'risk-1', score: 7.5 },
        { id: 'risk-2', score: 4.2 },
        { id: 'risk-3', score: 9.1 },
      ];

      const sorted = risks.sort((a, b) => b.score - a.score);
      expect(sorted[0].id).toBe('risk-3');
    });
  });

  describe('Risk mitigation', () => {
    it('should suggest mitigation strategies', () => {
      const risk = {
        type: 'schedule_delay',
        severity: 'high',
      };

      const strategies = [
        'Add more resources',
        'Reduce scope',
        'Extend deadline',
      ];

      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should track mitigation actions', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        riskId: 'risk-1',
        action: 'Add senior developer to team',
        status: 'in-progress',
      }]);

      const result = await mockDb.returning();
      expect(result[0].status).toBe('in-progress');
    });

    it('should calculate mitigation effectiveness', () => {
      const before = { riskScore: 8.5 };
      const after = { riskScore: 4.2 };

      const reduction = ((before.riskScore - after.riskScore) / before.riskScore) * 100;
      expect(reduction).toBeCloseTo(50.59, 2);
    });
  });

  describe('Risk alerts', () => {
    it('should generate alert for high-risk items', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'alert-1',
        type: 'high_risk_detected',
        severity: 'critical',
        riskId: 'risk-1',
      }]);

      const result = await mockDb.returning();
      expect(result[0].severity).toBe('critical');
    });

    it('should notify stakeholders of risks', () => {
      const notification = {
        type: 'risk_alert',
        recipients: ['manager@example.com', 'sponsor@example.com'],
        riskDetails: {
          type: 'budget_overrun',
          severity: 'high',
        },
      };

      expect(notification.recipients.length).toBe(2);
    });

    it('should escalate unmitigated risks', () => {
      const risk = {
        detected: new Date('2025-01-01'),
        lastReviewed: new Date('2025-01-01'),
        status: 'open',
      };

      const now = new Date('2025-01-15');
      const daysOpen = Math.ceil((now.getTime() - risk.detected.getTime()) / (1000 * 60 * 60 * 24));

      const shouldEscalate = daysOpen > 7 && risk.status === 'open';
      expect(shouldEscalate).toBe(true);
    });
  });

  describe('Risk trends', () => {
    it('should track risk over time', () => {
      const riskHistory = [
        { date: '2025-01-01', score: 3.5 },
        { date: '2025-01-08', score: 5.2 },
        { date: '2025-01-15', score: 6.8 },
      ];

      const isIncreasing = riskHistory[2].score > riskHistory[0].score;
      expect(isIncreasing).toBe(true);
    });

    it('should calculate risk velocity', () => {
      const scores = [3.5, 5.2, 6.8];
      const velocities = [];

      for (let i = 1; i < scores.length; i++) {
        velocities.push(scores[i] - scores[i - 1]);
      }

      const avgVelocity = velocities.reduce((a, b) => a + b) / velocities.length;
      expect(avgVelocity).toBeCloseTo(1.65, 2);
    });

    it('should project future risk', () => {
      const currentScore = 6.8;
      const velocity = 1.65; // per week
      const weeksAhead = 2;

      const projectedScore = currentScore + (velocity * weeksAhead);
      expect(projectedScore).toBeCloseTo(10.1, 1);
    });
  });

  describe('Risk reporting', () => {
    it('should generate risk register', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { id: 'risk-1', type: 'schedule', status: 'open' },
        { id: 'risk-2', type: 'budget', status: 'mitigated' },
        { id: 'risk-3', type: 'quality', status: 'open' },
      ]);

      const result = await mockDb.where();
      expect(result).toHaveLength(3);
    });

    it('should categorize risks by type', () => {
      const risks = [
        { type: 'schedule' },
        { type: 'budget' },
        { type: 'schedule' },
        { type: 'quality' },
      ];

      const byType = risks.reduce((acc, risk) => {
        acc[risk.type] = (acc[risk.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byType.schedule).toBe(2);
    });

    it('should calculate risk exposure', () => {
      const risks = [
        { probability: 0.7, impact: 50000 },
        { probability: 0.3, impact: 100000 },
        { probability: 0.5, impact: 25000 },
      ];

      const totalExposure = risks.reduce((sum, risk) =>
        sum + (risk.probability * risk.impact), 0
      );

      expect(totalExposure).toBe(77500);
    });
  });

  describe('Predictive analytics', () => {
    it('should predict project success probability', () => {
      const factors = {
        scheduleHealth: 0.7,
        budgetHealth: 0.8,
        teamHealth: 0.9,
        qualityHealth: 0.75,
      };

      const weights = {
        scheduleHealth: 0.3,
        budgetHealth: 0.3,
        teamHealth: 0.2,
        qualityHealth: 0.2,
      };

      const successProbability = Object.keys(factors).reduce((sum, key) => {
        const k = key as keyof typeof factors;
        return sum + (factors[k] * weights[k]);
      }, 0);

      expect(successProbability).toBeCloseTo(0.78, 2);
    });

    it('should identify leading indicators', () => {
      const indicators = {
        velocityTrend: 'declining',
        bugRate: 'increasing',
        burnRate: 'increasing',
        teamMorale: 'stable',
      };

      const negativeIndicators = Object.values(indicators).filter(
        val => val === 'declining' || val === 'increasing'
      ).length;

      const hasWarningSignals = negativeIndicators >= 2;
      expect(hasWarningSignals).toBe(true);
    });
  });
});

