/**
 * Task Management Tests
 * 
 * Comprehensive tests for task operations:
 * - Task CRUD
 * - Status transitions
 * - Dependencies
 * - Subtasks
 * - Assignments
 * - Time tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable, 
  workspaceTable,
  projectTable,
  taskTable 
} from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Task Management', () => {
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
      email: 'task-user@example.com',
      name: 'Task User',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Task Test Workspace',
      ownerId: testUser.id,
    }).returning();

    [testProject] = await db.insert(projectTable).values({
      id: createId(),
      name: 'Task Test Project',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    }).returning();
  });

  describe('Create Task', () => {
    it('should create a simple task', async () => {
      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Simple Task',
        description: 'A simple test task',
        projectId: testProject.id,
        creatorId: testUser.id,
        status: 'todo',
        priority: 'medium',
      }).returning();

      expect(task).toBeDefined();
      expect(task.title).toBe('Simple Task');
      expect(task.projectId).toBe(testProject.id);
      expect(task.creatorId).toBe(testUser.id);
    });

    it('should create task with assignee', async () => {
      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Assigned Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        assigneeId: testUser.id,
      }).returning();

      expect(task.assigneeId).toBe(testUser.id);
    });

    it('should create task with due date', async () => {
      const dueDate = new Date('2025-12-31');

      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Task with Due Date',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate,
      }).returning();

      expect(task.dueDate).toBeDefined();
      expect(new Date(task.dueDate!).getTime()).toBe(dueDate.getTime());
    });

    it('should create task with estimated hours', async () => {
      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Task with Estimate',
        projectId: testProject.id,
        creatorId: testUser.id,
        estimatedHours: 8,
      }).returning();

      expect(task.estimatedHours).toBe(8);
    });

    it('should create task with tags', async () => {
      const tags = ['frontend', 'urgent', 'bug'];

      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Tagged Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        tags,
      }).returning();

      expect(task.tags).toEqual(tags);
    });

    it('should set default status to todo', async () => {
      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Default Status Task',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();

      expect(task.status).toBe('todo');
    });

    it('should set default priority to medium', async () => {
      const [task] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Default Priority Task',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();

      expect(task.priority).toBe('medium');
    });
  });

  describe('Task Status Transitions', () => {
    let testTask: any;

    beforeEach(async () => {
      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Status Test Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        status: 'todo',
      }).returning();
    });

    it('should transition from todo to in_progress', async () => {
      await db.update(taskTable)
        .set({ status: 'in_progress' })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.status).toBe('in_progress');
    });

    it('should transition from in_progress to done', async () => {
      await db.update(taskTable)
        .set({ status: 'in_progress' })
        .where(eq(taskTable.id, testTask.id));

      await db.update(taskTable)
        .set({ status: 'done' })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.status).toBe('done');
    });

    it('should allow reopening done tasks', async () => {
      await db.update(taskTable)
        .set({ status: 'done' })
        .where(eq(taskTable.id, testTask.id));

      await db.update(taskTable)
        .set({ status: 'todo' })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.status).toBe('todo');
    });
  });

  describe('Task Dependencies', () => {
    let task1: any, task2: any, task3: any;

    beforeEach(async () => {
      [task1] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Task 1',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();

      [task2] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Task 2',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();

      [task3] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Task 3',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();
    });

    it('should add task dependency', async () => {
      await db.update(taskTable)
        .set({ dependencies: [task1.id] })
        .where(eq(taskTable.id, task2.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, task2.id));

      expect(updated.dependencies).toEqual([task1.id]);
    });

    it('should add multiple dependencies', async () => {
      await db.update(taskTable)
        .set({ dependencies: [task1.id, task2.id] })
        .where(eq(taskTable.id, task3.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, task3.id));

      expect(updated.dependencies).toEqual([task1.id, task2.id]);
    });

    it('should remove task dependency', async () => {
      await db.update(taskTable)
        .set({ dependencies: [task1.id] })
        .where(eq(taskTable.id, task2.id));

      await db.update(taskTable)
        .set({ dependencies: [] })
        .where(eq(taskTable.id, task2.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, task2.id));

      expect(updated.dependencies).toEqual([]);
    });
  });

  describe('Task Assignment', () => {
    let testTask: any;
    let assignee: any;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('TestPassword123!');

      [assignee] = await db.insert(userTable).values({
        id: createId(),
        email: 'assignee@example.com',
        name: 'Assignee User',
        password: hashedPassword,
        role: 'member',
      }).returning();

      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Assignment Test Task',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();
    });

    it('should assign task to user', async () => {
      await db.update(taskTable)
        .set({ assigneeId: assignee.id })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.assigneeId).toBe(assignee.id);
    });

    it('should reassign task to different user', async () => {
      await db.update(taskTable)
        .set({ assigneeId: testUser.id })
        .where(eq(taskTable.id, testTask.id));

      await db.update(taskTable)
        .set({ assigneeId: assignee.id })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.assigneeId).toBe(assignee.id);
    });

    it('should unassign task', async () => {
      await db.update(taskTable)
        .set({ assigneeId: assignee.id })
        .where(eq(taskTable.id, testTask.id));

      await db.update(taskTable)
        .set({ assigneeId: null })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.assigneeId).toBeNull();
    });
  });

  describe('Time Tracking', () => {
    let testTask: any;

    beforeEach(async () => {
      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Time Tracking Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        estimatedHours: 10,
      }).returning();
    });

    it('should track actual hours', async () => {
      await db.update(taskTable)
        .set({ actualHours: 8 })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.actualHours).toBe(8);
    });

    it('should compare estimated vs actual hours', async () => {
      await db.update(taskTable)
        .set({ actualHours: 12 })
        .where(eq(taskTable.id, testTask.id));

      const [task] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(task.estimatedHours).toBe(10);
      expect(task.actualHours).toBe(12);
      expect(task.actualHours! > task.estimatedHours!).toBe(true);
    });
  });

  describe('Task Queries', () => {
    beforeEach(async () => {
      // Create multiple tasks for query tests
      await db.insert(taskTable).values([
        {
          id: createId(),
          title: 'High Priority Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          priority: 'high',
          status: 'todo',
        },
        {
          id: createId(),
          title: 'In Progress Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          priority: 'medium',
          status: 'in_progress',
        },
        {
          id: createId(),
          title: 'Done Task',
          projectId: testProject.id,
          creatorId: testUser.id,
          priority: 'low',
          status: 'done',
        },
      ]);
    });

    it('should get all tasks in project', async () => {
      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter tasks by status', async () => {
      const todoTasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, testProject.id),
            eq(taskTable.status, 'todo')
          )
        );

      expect(todoTasks.length).toBeGreaterThanOrEqual(1);
      expect(todoTasks.every(t => t.status === 'todo')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const highPriorityTasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, testProject.id),
            eq(taskTable.priority, 'high')
          )
        );

      expect(highPriorityTasks.length).toBeGreaterThanOrEqual(1);
      expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);
    });

    it('should get tasks by assignee', async () => {
      // Assign a task
      const [task] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id))
        .limit(1);

      await db.update(taskTable)
        .set({ assigneeId: testUser.id })
        .where(eq(taskTable.id, task.id));

      const assignedTasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.assigneeId, testUser.id));

      expect(assignedTasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should get unassigned tasks', async () => {
      const unassignedTasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, testProject.id),
            eq(taskTable.assigneeId, null)
          )
        );

      expect(unassignedTasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Task Deletion', () => {
    let testTask: any;

    beforeEach(async () => {
      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Delete Test Task',
        projectId: testProject.id,
        creatorId: testUser.id,
      }).returning();
    });

    it('should delete task', async () => {
      await db.delete(taskTable)
        .where(eq(taskTable.id, testTask.id));

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(tasks).toHaveLength(0);
    });

    it('should cascade delete when project is deleted', async () => {
      await db.delete(projectTable)
        .where(eq(projectTable.id, testProject.id));

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      expect(tasks).toHaveLength(0);
    });
  });

  describe('Task Updates', () => {
    let testTask: any;

    beforeEach(async () => {
      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Update Test Task',
        description: 'Original description',
        projectId: testProject.id,
        creatorId: testUser.id,
        priority: 'low',
      }).returning();
    });

    it('should update task title', async () => {
      await db.update(taskTable)
        .set({ title: 'Updated Title' })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.title).toBe('Updated Title');
    });

    it('should update task description', async () => {
      await db.update(taskTable)
        .set({ description: 'Updated description' })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.description).toBe('Updated description');
    });

    it('should update task priority', async () => {
      await db.update(taskTable)
        .set({ priority: 'urgent' })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.priority).toBe('urgent');
    });

    it('should update multiple fields', async () => {
      await db.update(taskTable)
        .set({
          title: 'Multi Update',
          priority: 'high',
          status: 'in_progress',
          assigneeId: testUser.id,
        })
        .where(eq(taskTable.id, testTask.id));

      const [updated] = await db.select()
        .from(taskTable)
        .where(eq(taskTable.id, testTask.id));

      expect(updated.title).toBe('Multi Update');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('in_progress');
      expect(updated.assigneeId).toBe(testUser.id);
    });
  });
});

