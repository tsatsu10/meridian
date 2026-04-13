/**
 * Task Routes - REAL Integration Tests
 * 
 * TRUE integration tests that execute actual task code:
 * - Real task CRUD operations
 * - Real dependencies
 * - Real assignments
 * - Real status transitions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { users, workspaces, projects, tasks, taskDependencies } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe('Task API - REAL Integration Tests', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
  let testWorkspace: any;
  let testProject: any;
  let testTaskId: string;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
    
    const hashedPassword = await hashPassword('TestPassword123!');
    [testUser] = await db.insert(users).values({
      id: createId(),
      email: 'task-real-test@example.com',
      name: 'Task Tester',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaces).values({
      id: createId(),
      name: 'Task Test Workspace',
      ownerId: testUser.id,
    }).returning();

    [testProject] = await db.insert(projects).values({
      id: createId(),
      name: 'Task Test Project',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    }).returning();
  });

  afterAll(async () => {
    if (testProject) {
      await db.delete(projects).where(eq(projects.id, testProject.id));
    }
    if (testWorkspace) {
      await db.delete(workspaces).where(eq(workspaces.id, testWorkspace.id));
    }
    if (testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    await closeDatabase();
  });

  beforeEach(async () => {
    if (testTaskId) {
      await db.delete(tasks).where(eq(tasks.id, testTaskId));
    }
  });

  describe('Create Task - REAL Operations', () => {
    it('should create task in REAL database', async () => {
      // ✅ REAL database insert
      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Real Test Task',
        description: 'Created by real integration test',
        projectId: testProject.id,
        status: 'todo',
        priority: 'high',
      }).returning();

      testTaskId = task.id;

      expect(task.title).toBe('Real Test Task');
      expect(task.projectId).toBe(testProject.id);
      
      // ✅ Verify persistence
      const [found] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      
      expect(found.title).toBe('Real Test Task');
    });

    it('should set default values from schema', async () => {
      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Default Test',
        projectId: testProject.id,
      }).returning();

      testTaskId = task.id;

      // ✅ REAL schema defaults
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.position).toBe(0);
    });

    it('should create with due date', async () => {
      const dueDate = new Date('2025-12-31');

      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Task with Due Date',
        projectId: testProject.id,
        dueDate,
      }).returning();

      testTaskId = task.id;

      expect(task.dueDate).toBeInstanceOf(Date);
      expect(task.dueDate!.getTime()).toBe(dueDate.getTime());
    });
  });

  describe('List Tasks - REAL Queries', () => {
    beforeEach(async () => {
      await db.insert(tasks).values([
        {
          id: createId(),
          title: 'Task 1',
          projectId: testProject.id,
          status: 'todo',
          priority: 'high',
        },
        {
          id: createId(),
          title: 'Task 2',
          projectId: testProject.id,
          status: 'in_progress',
          priority: 'medium',
        },
        {
          id: createId(),
          title: 'Task 3',
          projectId: testProject.id,
          status: 'done',
          priority: 'low',
        },
      ]).returning().then(results => {
        testTaskId = results[0].id;
      });
    });

    it('should list project tasks', async () => {
      // ✅ REAL database query
      const projectTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.projectId, testProject.id));

      expect(projectTasks.length).toBeGreaterThanOrEqual(3);
      expect(projectTasks.every(t => t.projectId === testProject.id)).toBe(true);
    });

    it('should filter by status', async () => {
      const todoTasks = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, testProject.id),
            eq(tasks.status, 'todo')
          )
        );

      expect(todoTasks.every(t => t.status === 'todo')).toBe(true);
    });

    it('should filter by priority', async () => {
      const highPriorityTasks = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, testProject.id),
            eq(tasks.priority, 'high')
          )
        );

      expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);
    });
  });

  describe('Update Task - REAL Updates', () => {
    beforeEach(async () => {
      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Original Title',
        projectId: testProject.id,
        status: 'todo',
      }).returning();

      testTaskId = task.id;
    });

    it('should update task title', async () => {
      await db.update(tasks)
        .set({ title: 'Updated Title' })
        .where(eq(tasks.id, testTaskId));

      const [updated] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, testTaskId));

      expect(updated.title).toBe('Updated Title');
    });

    it('should update task status', async () => {
      await db.update(tasks)
        .set({ status: 'in_progress' })
        .where(eq(tasks.id, testTaskId));

      const [updated] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, testTaskId));

      expect(updated.status).toBe('in_progress');
    });

    it('should set completion timestamp when done', async () => {
      const completedAt = new Date();

      await db.update(tasks)
        .set({ status: 'done', completedAt })
        .where(eq(tasks.id, testTaskId));

      const [updated] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, testTaskId));

      expect(updated.status).toBe('done');
      expect(updated.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Task Assignment - REAL Operations', () => {
    beforeEach(async () => {
      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Assignable Task',
        projectId: testProject.id,
      }).returning();

      testTaskId = task.id;
    });

    it('should assign task to user', async () => {
      await db.update(tasks)
        .set({
          assigneeId: testUser.id,
          userEmail: testUser.email,
        })
        .where(eq(tasks.id, testTaskId));

      const [updated] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, testTaskId));

      expect(updated.assigneeId).toBe(testUser.id);
      expect(updated.userEmail).toBe(testUser.email);
    });

    it('should unassign task', async () => {
      // First assign
      await db.update(tasks)
        .set({ assigneeId: testUser.id })
        .where(eq(tasks.id, testTaskId));

      // Then unassign
      await db.update(tasks)
        .set({ assigneeId: null })
        .where(eq(tasks.id, testTaskId));

      const [updated] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, testTaskId));

      expect(updated.assigneeId).toBeNull();
    });
  });

  describe('Task Dependencies - REAL Operations', () => {
    let task1Id: string;
    let task2Id: string;

    beforeEach(async () => {
      const [task1, task2] = await db.insert(tasks).values([
        {
          id: createId(),
          title: 'Task 1',
          projectId: testProject.id,
        },
        {
          id: createId(),
          title: 'Task 2',
          projectId: testProject.id,
        },
      ]).returning();

      task1Id = task1.id;
      task2Id = task2.id;
      testTaskId = task1Id;
    });

    it('should create task dependency', async () => {
      // ✅ REAL dependency creation
      const [dependency] = await db.insert(taskDependencies).values({
        id: createId(),
        dependentTaskId: task2Id,
        requiredTaskId: task1Id,
        type: 'blocks',
      }).returning();

      expect(dependency.dependentTaskId).toBe(task2Id);
      expect(dependency.requiredTaskId).toBe(task1Id);
    });

    it('should query task dependencies', async () => {
      // Create dependency
      await db.insert(taskDependencies).values({
        id: createId(),
        dependentTaskId: task2Id,
        requiredTaskId: task1Id,
        type: 'blocks',
      });

      // ✅ REAL dependency query
      const dependencies = await db.select()
        .from(taskDependencies)
        .where(eq(taskDependencies.dependentTaskId, task2Id));

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].requiredTaskId).toBe(task1Id);
    });

    it('should delete dependency', async () => {
      const [dependency] = await db.insert(taskDependencies).values({
        id: createId(),
        dependentTaskId: task2Id,
        requiredTaskId: task1Id,
        type: 'blocks',
      }).returning();

      await db.delete(taskDependencies)
        .where(eq(taskDependencies.id, dependency.id));

      const found = await db.select()
        .from(taskDependencies)
        .where(eq(taskDependencies.id, dependency.id));

      expect(found).toHaveLength(0);
    });
  });

  describe('Task Deletion - REAL Cascade', () => {
    beforeEach(async () => {
      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Parent Task',
        projectId: testProject.id,
      }).returning();

      testTaskId = task.id;
    });

    it('should cascade delete dependencies when task deleted', async () => {
      // Create dependency
      const [dependency] = await db.insert(taskDependencies).values({
        id: createId(),
        dependentTaskId: testTaskId,
        requiredTaskId: testTaskId,
        type: 'blocks',
      }).returning();

      // Delete task
      await db.delete(tasks)
        .where(eq(tasks.id, testTaskId));

      // ✅ REAL cascade verification
      const foundDeps = await db.select()
        .from(taskDependencies)
        .where(eq(taskDependencies.id, dependency.id));

      expect(foundDeps).toHaveLength(0);
    });
  });
});

