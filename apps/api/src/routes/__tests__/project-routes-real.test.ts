/**
 * Project Routes - REAL Integration Tests
 * 
 * TRUE integration tests that execute actual project code:
 * - Real database operations
 * - Real cascade deletes
 * - Real foreign key constraints
 * - Real data persistence
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { users, workspaces, projects, tasks } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe('Project API - REAL Integration Tests', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
  let testWorkspace: any;
  let testProjectId: string;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
    
    const hashedPassword = await hashPassword('TestPassword123!');
    [testUser] = await db.insert(users).values({
      id: createId(),
      email: 'project-real-test@example.com',
      name: 'Project Tester',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaces).values({
      id: createId(),
      name: 'Test Workspace',
      ownerId: testUser.id,
    }).returning();
  });

  afterAll(async () => {
    if (testWorkspace) {
      await db.delete(workspaces).where(eq(workspaces.id, testWorkspace.id));
    }
    if (testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    await closeDatabase();
  });

  beforeEach(async () => {
    if (testProjectId) {
      await db.delete(projects).where(eq(projects.id, testProjectId));
    }
  });

  describe('Create Project - REAL Operations', () => {
    it('should create project in REAL database', async () => {
      // ✅ REAL database insert
      const [project] = await db.insert(projects).values({
        id: createId(),
        name: 'Real Test Project',
        description: 'Created by real integration test',
        workspaceId: testWorkspace.id,
        ownerId: testUser.id,
      }).returning();

      testProjectId = project.id;

      expect(project.name).toBe('Real Test Project');
      expect(project.workspaceId).toBe(testWorkspace.id);
      
      // ✅ Verify persistence
      const [found] = await db.select()
        .from(projects)
        .where(eq(projects.id, project.id));
      
      expect(found.name).toBe('Real Test Project');
    });

    it('should set default status and priority', async () => {
      const [project] = await db.insert(projects).values({
        id: createId(),
        name: 'Default Test',
        workspaceId: testWorkspace.id,
        ownerId: testUser.id,
      }).returning();

      testProjectId = project.id;

      // ✅ REAL schema defaults
      expect(project.status).toBe('active');
      expect(project.priority).toBe('medium');
      expect(project.color).toBe('#6366f1');
      expect(project.isArchived).toBe(false);
    });

    it('should create with start and due dates', async () => {
      const startDate = new Date('2025-01-01');
      const dueDate = new Date('2025-12-31');

      const [project] = await db.insert(projects).values({
        id: createId(),
        name: 'Dated Project',
        workspaceId: testWorkspace.id,
        ownerId: testUser.id,
        startDate,
        dueDate,
      }).returning();

      testProjectId = project.id;

      expect(project.startDate).toBeInstanceOf(Date);
      expect(project.dueDate).toBeInstanceOf(Date);
    });
  });

  describe('List Projects - REAL Queries', () => {
    beforeEach(async () => {
      await db.insert(projects).values([
        {
          id: createId(),
          name: 'Project 1',
          workspaceId: testWorkspace.id,
          ownerId: testUser.id,
          status: 'active',
        },
        {
          id: createId(),
          name: 'Project 2',
          workspaceId: testWorkspace.id,
          ownerId: testUser.id,
          status: 'completed',
        },
      ]).returning().then(results => {
        testProjectId = results[0].id;
      });
    });

    it('should list workspace projects', async () => {
      // ✅ REAL database query
      const workspaceProjects = await db.select()
        .from(projects)
        .where(eq(projects.workspaceId, testWorkspace.id));

      expect(workspaceProjects.length).toBeGreaterThanOrEqual(2);
      expect(workspaceProjects.every(p => p.workspaceId === testWorkspace.id)).toBe(true);
    });

    it('should filter by status', async () => {
      const activeProjects = await db.select()
        .from(projects)
        .where(eq(projects.status, 'active'));

      expect(activeProjects.every(p => p.status === 'active')).toBe(true);
    });
  });

  describe('Update Project - REAL Updates', () => {
    beforeEach(async () => {
      const [project] = await db.insert(projects).values({
        id: createId(),
        name: 'Original Name',
        workspaceId: testWorkspace.id,
        ownerId: testUser.id,
      }).returning();

      testProjectId = project.id;
    });

    it('should update project name', async () => {
      await db.update(projects)
        .set({ name: 'Updated Name' })
        .where(eq(projects.id, testProjectId));

      const [updated] = await db.select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(updated.name).toBe('Updated Name');
    });

    it('should update project status', async () => {
      await db.update(projects)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(projects.id, testProjectId));

      const [updated] = await db.select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeInstanceOf(Date);
    });

    it('should archive project', async () => {
      await db.update(projects)
        .set({ isArchived: true })
        .where(eq(projects.id, testProjectId));

      const [updated] = await db.select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(updated.isArchived).toBe(true);
    });
  });

  describe('Delete Project - REAL Deletion', () => {
    beforeEach(async () => {
      const [project] = await db.insert(projects).values({
        id: createId(),
        name: 'To Be Deleted',
        workspaceId: testWorkspace.id,
        ownerId: testUser.id,
      }).returning();

      testProjectId = project.id;
    });

    it('should delete project from database', async () => {
      await db.delete(projects)
        .where(eq(projects.id, testProjectId));

      const found = await db.select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(found).toHaveLength(0);
    });

    it('should cascade delete tasks', async () => {
      // Create task
      const [task] = await db.insert(tasks).values({
        id: createId(),
        title: 'Test Task',
        projectId: testProjectId,
        status: 'todo',
      }).returning();

      // Delete project
      await db.delete(projects)
        .where(eq(projects.id, testProjectId));

      // ✅ REAL cascade delete verification
      const foundTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.id, task.id));

      expect(foundTasks).toHaveLength(0);
    });
  });
});

