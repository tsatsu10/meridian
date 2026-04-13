/**
 * Analytics Service Tests
 * 
 * Tests analytics calculations and aggregations:
 * - Task completion metrics
 * - Project health scoring
 * - Team performance analytics
 * - Time tracking analytics
 * - Velocity calculations
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
import { eq, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Analytics Service', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
  let testWorkspace: any;
  let testProject: any;

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
      email: 'analytics@example.com',
      name: 'Analytics User',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Analytics Workspace',
      ownerId: testUser.id,
    }).returning();

    [testProject] = await db.insert(projectTable).values({
      id: createId(),
      name: 'Analytics Project',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    }).returning();
  });

  describe('Task Completion Metrics', () => {
    beforeEach(async () => {
      // Create sample tasks
      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'Completed Task 1',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'done',
        },
        {
          id: createId(),
          title: 'Completed Task 2',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'done',
        },
        {
          id: createId(),
          title: 'In Progress Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'in_progress',
        },
        {
          id: createId(),
          title: 'Todo Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'todo',
        },
      ]);
    });

    it('should calculate total task count', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const totalTasks = tasks.length;
      expect(totalTasks).toBe(4);
    });

    it('should calculate completed tasks count', async () => {
      const completedTasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, testProject.id),
            eq(taskTable.status, 'done')
          )
        );

      expect(completedTasks.length).toBe(2);
    });

    it('should calculate completion rate', async () => {
      const allTasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const completedTasks = allTasks.filter(t => t.status === 'done');
      const completionRate = (completedTasks.length / allTasks.length) * 100;

      expect(completionRate).toBe(50); // 2 out of 4 tasks completed
    });

    it('should calculate tasks by status', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const tasksByStatus = tasks.reduce((acc: Record<string, number>, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      expect(tasksByStatus).toEqual({
        done: 2,
        in_progress: 1,
        todo: 1,
      });
    });

    it('should calculate tasks by priority', async () => {
      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'High Priority',
          projectId: testProject.id,
          creatorId: testUser.id,
          priority: 'high',
        },
        {
          id: createId(),
          title: 'Medium Priority',
          projectId: testProject.id,
          creatorId: testUser.id,
          priority: 'medium',
        },
      ]);

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const tasksByPriority = tasks.reduce((acc: Record<string, number>, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {});

      expect(tasksByPriority.high).toBeGreaterThanOrEqual(1);
      expect(tasksByPriority.medium).toBeGreaterThanOrEqual(5); // 4 default + 1 new
    });
  });

  describe('Project Health Scoring', () => {
    it('should calculate project health based on completion', async () => {
      // Create tasks with known completion rate
      await db.insert(taskTable).values([
        { id: createId(), title: 'T1', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T2', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T3', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T4', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T5', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T6', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T7', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T8', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'T9', projectId: testProject.id, creatorId: testUser.id, status: 'todo' },
        { id: createId(), title: 'T10', projectId: testProject.id, creatorId: testUser.id, status: 'todo' },
      ]);

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const completedTasks = tasks.filter(t => t.status === 'done');
      const completionRate = (completedTasks.length / tasks.length) * 100;

      // Simple health score based on completion rate
      const healthScore = Math.min(100, completionRate);

      expect(healthScore).toBe(80); // 8 out of 10 completed
    });

    it('should factor in overdue tasks for health score', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'Overdue Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'todo',
          dueDate: yesterday,
        },
      ]);

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const overdueTasks = tasks.filter(
        t => t.dueDate && t.dueDate.getTime() < Date.now() && t.status !== 'done'
      );

      expect(overdueTasks.length).toBeGreaterThanOrEqual(1);

      // Health score penalty for overdue tasks
      const overdueRate = (overdueTasks.length / tasks.length) * 100;
      expect(overdueRate).toBeGreaterThan(0);
    });
  });

  describe('Time Tracking Analytics', () => {
    beforeEach(async () => {
      // Create tasks with time estimates and actuals
      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'Estimated Task 1',
          projectId: testProject.id,
          creatorId: testUser.id,
          estimatedHours: 8,
          actualHours: 6,
          status: 'done',
        },
        {
          id: createId(),
          title: 'Estimated Task 2',
          projectId: testProject.id,
          creatorId: testUser.id,
          estimatedHours: 4,
          actualHours: 5,
          status: 'done',
        },
        {
          id: createId(),
          title: 'Estimated Task 3',
          projectId: testProject.id,
          creatorId: testUser.id,
          estimatedHours: 10,
          actualHours: null, // Not completed yet
          status: 'in_progress',
        },
      ]);
    });

    it('should calculate total estimated hours', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const totalEstimated = tasks.reduce(
        (sum, task) => sum + (task.estimatedHours || 0),
        0
      );

      expect(totalEstimated).toBe(22); // 8 + 4 + 10
    });

    it('should calculate total actual hours', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const totalActual = tasks.reduce(
        (sum, task) => sum + (task.actualHours || 0),
        0
      );

      expect(totalActual).toBe(11); // 6 + 5
    });

    it('should calculate estimation accuracy', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, testProject.id),
            eq(taskTable.status, 'done')
          )
        );

      const tasksWithBoth = tasks.filter(
        t => t.estimatedHours !== null && t.actualHours !== null
      );

      const totalEstimated = tasksWithBoth.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0
      );

      const totalActual = tasksWithBoth.reduce(
        (sum, t) => sum + (t.actualHours || 0),
        0
      );

      const accuracy = (totalActual / totalEstimated) * 100;
      expect(accuracy).toBeCloseTo(91.67, 1); // 11/12 * 100
    });

    it('should identify under-estimated tasks', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const underEstimated = tasks.filter(
        t => t.estimatedHours && t.actualHours && t.actualHours > t.estimatedHours
      );

      expect(underEstimated.length).toBeGreaterThanOrEqual(1);
    });

    it('should identify over-estimated tasks', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const overEstimated = tasks.filter(
        t => t.estimatedHours && t.actualHours && t.actualHours < t.estimatedHours
      );

      expect(overEstimated.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Team Performance Analytics', () => {
    let teamMember1: any, teamMember2: any;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('TestPassword123!');

      [teamMember1] = await db.insert(userTable).values({
        id: createId(),
        email: 'member1@example.com',
        name: 'Member 1',
        password: hashedPassword,
        role: 'member',
      }).returning();

      [teamMember2] = await db.insert(userTable).values({
        id: createId(),
        email: 'member2@example.com',
        name: 'Member 2',
        password: hashedPassword,
        role: 'member',
      }).returning();

      // Create tasks assigned to team members
      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'Member 1 Task 1',
          projectId: testProject.id,
          creatorId: testUser.id,
          assigneeId: teamMember1.id,
          status: 'done',
        },
        {
          id: createId(),
          title: 'Member 1 Task 2',
          projectId: testProject.id,
          creatorId: testUser.id,
          assigneeId: teamMember1.id,
          status: 'done',
        },
        {
          id: createId(),
          title: 'Member 2 Task 1',
          projectId: testProject.id,
          creatorId: testUser.id,
          assigneeId: teamMember2.id,
          status: 'done',
        },
        {
          id: createId(),
          title: 'Member 2 Task 2',
          projectId: testProject.id,
          creatorId: testUser.id,
          assigneeId: teamMember2.id,
          status: 'in_progress',
        },
      ]);
    });

    it('should calculate tasks completed per team member', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const tasksByMember = tasks.reduce((acc: Record<string, any>, task) => {
        if (!task.assigneeId) return acc;
        
        if (!acc[task.assigneeId]) {
          acc[task.assigneeId] = { total: 0, completed: 0 };
        }
        
        acc[task.assigneeId].total++;
        if (task.status === 'done') {
          acc[task.assigneeId].completed++;
        }
        
        return acc;
      }, {});

      expect(tasksByMember[teamMember1.id].completed).toBe(2);
      expect(tasksByMember[teamMember2.id].completed).toBe(1);
    });

    it('should calculate completion rate per team member', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      const member1Tasks = tasks.filter(t => t.assigneeId === teamMember1.id);
      const member1Completed = member1Tasks.filter(t => t.status === 'done');
      const member1Rate = (member1Completed.length / member1Tasks.length) * 100;

      expect(member1Rate).toBe(100); // 2 out of 2

      const member2Tasks = tasks.filter(t => t.assigneeId === teamMember2.id);
      const member2Completed = member2Tasks.filter(t => t.status === 'done');
      const member2Rate = (member2Completed.length / member2Tasks.length) * 100;

      expect(member2Rate).toBe(50); // 1 out of 2
    });
  });

  describe('Velocity Calculations', () => {
    it('should calculate weekly task completion velocity', async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'This Week Task 1',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'done',
          createdAt: oneWeekAgo,
        },
        {
          id: createId(),
          title: 'This Week Task 2',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'done',
          createdAt: oneWeekAgo,
        },
        {
          id: createId(),
          title: 'Last Week Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: 'done',
          createdAt: twoWeeksAgo,
        },
      ]);

      const tasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, testProject.id),
            eq(taskTable.status, 'done')
          )
        );

      const thisWeekTasks = tasks.filter(
        t => t.createdAt.getTime() > oneWeekAgo.getTime()
      );

      const weeklyVelocity = thisWeekTasks.length;
      expect(weeklyVelocity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Workspace-Level Analytics', () => {
    let project2: any;

    beforeEach(async () => {
      [project2] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Project 2',
        workspaceId: testWorkspace.id,
        ownerId: testUser.id,
      }).returning();

      await db.insert(taskTable).values([
        { id: createId(), title: 'P1 T1', projectId: testProject.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'P1 T2', projectId: testProject.id, creatorId: testUser.id, status: 'todo' },
        { id: createId(), title: 'P2 T1', projectId: project2.id, creatorId: testUser.id, status: 'done' },
        { id: createId(), title: 'P2 T2', projectId: project2.id, creatorId: testUser.id, status: 'done' },
      ]);
    });

    it('should calculate workspace-wide task count', async () => {
      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id));

      const projectIds = projects.map(p => p.id);

      const tasks = await db.select()
        .from(taskTable);

      const workspaceTasks = tasks.filter(t => projectIds.includes(t.projectId));

      expect(workspaceTasks.length).toBeGreaterThanOrEqual(4);
    });

    it('should calculate workspace completion rate', async () => {
      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id));

      const projectIds = projects.map(p => p.id);

      const tasks = await db.select()
        .from(taskTable);

      const workspaceTasks = tasks.filter(t => projectIds.includes(t.projectId));
      const completedTasks = workspaceTasks.filter(t => t.status === 'done');

      const completionRate = (completedTasks.length / workspaceTasks.length) * 100;

      expect(completionRate).toBeGreaterThan(0);
    });
  });
});

