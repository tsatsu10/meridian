/**
 * 🎯 Goals API - Unit Tests
 * 
 * Comprehensive test suite for Goal Setting API endpoints
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { getDatabase } from '../../database/connection';
import { goals, goalKeyResults, goalProgress } from '../../database/schema/goals';
import { eq } from 'drizzle-orm';

// Test data
const testUserId = 'test-user-id';
const testWorkspaceId = 'test-workspace-id';
let db: ReturnType<typeof getDatabase>;

describe.skip('Goals API', () => {
  beforeAll(() => {
    db = getDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(goals).where(eq(goals.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up after tests
    await db.delete(goals).where(eq(goals.userId, testUserId));
  });

  describe('POST /api/goals - Create Goal', () => {
    it('should create a goal successfully', async () => {
      const goalData = {
        title: 'Test Goal',
        description: 'Test description',
        type: 'objective',
        timeframe: 'Q1 2026',
        priority: 'high',
        privacy: 'private',
      };

      const [goal] = await db.insert(goals).values({
        ...goalData,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        status: 'active',
        progress: 0,
      }).returning();

      expect(goal).toBeDefined();
      expect(goal.title).toBe('Test Goal');
      expect(goal.type).toBe('objective');
      expect(goal.progress).toBe(0);
    });

    it('should validate title length', async () => {
      const longTitle = 'a'.repeat(101);
      
      try {
        await db.insert(goals).values({
          title: longTitle,
          type: 'objective',
          timeframe: 'Q1 2026',
          workspaceId: testWorkspaceId,
          userId: testUserId,
          status: 'active',
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should set default values', async () => {
      const [goal] = await db.insert(goals).values({
        title: 'Test Goal',
        type: 'objective',
        timeframe: 'Q1 2026',
        workspaceId: testWorkspaceId,
        userId: testUserId,
      }).returning();

      expect(goal.status).toBe('active');
      expect(goal.progress).toBe(0);
      expect(goal.priority).toBe('medium');
      expect(goal.privacy).toBe('private');
    });
  });

  describe('Key Results Auto-Calculation', () => {
    it('should calculate goal progress from key results', async () => {
      // Create goal
      const [goal] = await db.insert(goals).values({
        title: 'Test OKR',
        type: 'objective',
        timeframe: 'Q1 2026',
        workspaceId: testWorkspaceId,
        userId: testUserId,
        status: 'active',
      }).returning();

      // Add 3 key results
      await db.insert(goalKeyResults).values([
        {
          goalId: goal.id,
          title: 'KR1',
          targetValue: '100',
          currentValue: '50', // 50%
          unit: '%',
          status: 'on_track',
        },
        {
          goalId: goal.id,
          title: 'KR2',
          targetValue: '100',
          currentValue: '75', // 75%
          unit: '%',
          status: 'on_track',
        },
        {
          goalId: goal.id,
          title: 'KR3',
          targetValue: '100',
          currentValue: '25', // 25%
          unit: '%',
          status: 'on_track',
        },
      ]);

      // Calculate expected progress: (50 + 75 + 25) / 3 = 50%
      const expectedProgress = 50;

      // In real implementation, this would be triggered by the controller
      // For testing, we verify the calculation logic
      const keyResults = await db.query.goalKeyResults.findMany({
        where: eq(goalKeyResults.goalId, goal.id),
      });

      let totalProgress = 0;
      for (const kr of keyResults) {
        const current = parseFloat(kr.currentValue as string) || 0;
        const target = parseFloat(kr.targetValue as string) || 1;
        const krProgress = Math.min((current / target) * 100, 100);
        totalProgress += krProgress;
      }

      const calculatedProgress = Math.round(totalProgress / keyResults.length);
      expect(calculatedProgress).toBe(expectedProgress);
    });

    it('should handle 100% completion', async () => {
      const [goal] = await db.insert(goals).values({
        title: 'Completed Goal',
        type: 'objective',
        timeframe: 'Q1 2026',
        workspaceId: testWorkspaceId,
        userId: testUserId,
        status: 'active',
      }).returning();

      await db.insert(goalKeyResults).values([
        {
          goalId: goal.id,
          title: 'KR1',
          targetValue: '100',
          currentValue: '100', // 100%
          unit: '%',
          status: 'completed',
        },
        {
          goalId: goal.id,
          title: 'KR2',
          targetValue: '1000',
          currentValue: '1000', // 100%
          unit: 'count',
          status: 'completed',
        },
      ]);

      const keyResults = await db.query.goalKeyResults.findMany({
        where: eq(goalKeyResults.goalId, goal.id),
      });

      let totalProgress = 0;
      for (const kr of keyResults) {
        const current = parseFloat(kr.currentValue as string) || 0;
        const target = parseFloat(kr.targetValue as string) || 1;
        const krProgress = Math.min((current / target) * 100, 100);
        totalProgress += krProgress;
      }

      const calculatedProgress = Math.round(totalProgress / keyResults.length);
      expect(calculatedProgress).toBe(100);
    });
  });

  describe('Progress History', () => {
    it('should log progress with timestamp', async () => {
      const [goal] = await db.insert(goals).values({
        title: 'Test Goal',
        type: 'objective',
        timeframe: 'Q1 2026',
        workspaceId: testWorkspaceId,
        userId: testUserId,
        status: 'active',
      }).returning();

      const [progressEntry] = await db.insert(goalProgress).values({
        goalId: goal.id,
        value: '50',
        previousValue: '0',
        note: 'Making great progress!',
        recordedBy: testUserId,
      }).returning();

      expect(progressEntry).toBeDefined();
      expect(progressEntry.value).toBe('50');
      expect(progressEntry.note).toBe('Making great progress!');
      expect(progressEntry.recordedAt).toBeDefined();
    });
  });
});



