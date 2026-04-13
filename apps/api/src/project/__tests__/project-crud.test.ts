/**
 * Project CRUD Operations Tests
 * 
 * Comprehensive tests for project management:
 * - Create, read, update, delete operations
 * - Project status management
 * - Project settings and metadata
 * - Member assignments
 * - Cascading operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable, 
  workspaceTable,
  projectTable,
  taskTable,
  workspaceUserTable 
} from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Project CRUD Operations', () => {
  let db: ReturnType<typeof getDatabase>;
  let testOwner: any;
  let testMember: any;
  let testWorkspace: any;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {

    const hashedPassword = await hashPassword('TestPassword123!');

    // Create test users
    [testOwner] = await db.insert(userTable).values({
      id: createId(),
      email: 'project-owner@example.com',
      name: 'Project Owner',
      password: hashedPassword,
      role: 'workspace-manager',
    }).returning();

    [testMember] = await db.insert(userTable).values({
      id: createId(),
      email: 'project-member@example.com',
      name: 'Project Member',
      password: hashedPassword,
      role: 'member',
    }).returning();

    // Create test workspace
    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Project Test Workspace',
      ownerId: testOwner.id,
    }).returning();

    // Add member to workspace
    await db.insert(workspaceUserTable).values({
      id: createId(),
      workspaceId: testWorkspace.id,
      userId: testMember.id,
      userEmail: testMember.email,
      role: 'member',
    });
  });

  describe('Create Project', () => {
    it('should create a new project with required fields', async () => {
      const [project] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Test Project',
        description: 'A test project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        status: 'active',
        priority: 'high',
      }).returning();

      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.workspaceId).toBe(testWorkspace.id);
      expect(project.ownerId).toBe(testOwner.id);
      expect(project.status).toBe('active');
      expect(project.priority).toBe('high');
    });

    it('should set default values for optional fields', async () => {
      const [project] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Minimal Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
      }).returning();

      expect(project.status).toBe('active');
      expect(project.priority).toBe('medium');
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('should create project with start and due dates', async () => {
      const startDate = new Date('2025-01-01');
      const dueDate = new Date('2025-12-31');

      const [project] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Dated Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        startDate,
        dueDate,
      }).returning();

      expect(project.startDate).toBeDefined();
      expect(project.dueDate).toBeDefined();
      expect(new Date(project.startDate!).getTime()).toBe(startDate.getTime());
      expect(new Date(project.dueDate!).getTime()).toBe(dueDate.getTime());
    });

    it('should create project with custom settings', async () => {
      const settings = {
        isPublic: false,
        enableComments: true,
        enableTimeTracking: true,
        customFields: ['field1', 'field2'],
      };

      const [project] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Custom Settings Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        settings,
      }).returning();

      expect(project.settings).toEqual(settings);
    });

    it('should enforce workspace foreign key constraint', async () => {
      await expect(async () => {
        await db.insert(projectTable).values({
          id: createId(),
          name: 'Invalid Workspace Project',
          workspaceId: 'non-existent-workspace-id',
          ownerId: testOwner.id,
        });
      }).rejects.toThrow();
    });

    it('should enforce owner foreign key constraint', async () => {
      await expect(async () => {
        await db.insert(projectTable).values({
          id: createId(),
          name: 'Invalid Owner Project',
          workspaceId: testWorkspace.id,
          ownerId: 'non-existent-user-id',
        });
      }).rejects.toThrow();
    });
  });

  describe('Read Project', () => {
    let testProject: any;

    beforeEach(async () => {
      [testProject] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Read Test Project',
        description: 'Project for read operations',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        status: 'active',
        priority: 'high',
      }).returning();
    });

    it('should read project by ID', async () => {
      const [project] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(project).toBeDefined();
      expect(project.id).toBe(testProject.id);
      expect(project.name).toBe('Read Test Project');
    });

    it('should read all projects in workspace', async () => {
      // Create additional projects
      await db.insert(projectTable).values([
        {
          id: createId(),
          name: 'Project 2',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
        },
        {
          id: createId(),
          name: 'Project 3',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
        },
      ]);

      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id));

      expect(projects.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter projects by status', async () => {
      // Create projects with different statuses
      await db.insert(projectTable).values([
        {
          id: createId(),
          name: 'Active Project',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
          status: 'active',
        },
        {
          id: createId(),
          name: 'Archived Project',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
          status: 'archived',
        },
      ]);

      const activeProjects = await db.select()
        .from(projectTable)
        .where(
          and(
            eq(projectTable.workspaceId, testWorkspace.id),
            eq(projectTable.status, 'active')
          )
        );

      expect(activeProjects.length).toBeGreaterThanOrEqual(2);
      expect(activeProjects.every(p => p.status === 'active')).toBe(true);
    });

    it('should filter projects by owner', async () => {
      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.ownerId, testOwner.id));

      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(projects.every(p => p.ownerId === testOwner.id)).toBe(true);
    });

    it('should filter projects by priority', async () => {
      await db.insert(projectTable).values({
        id: createId(),
        name: 'Urgent Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        priority: 'urgent',
      });

      const urgentProjects = await db.select()
        .from(projectTable)
        .where(
          and(
            eq(projectTable.workspaceId, testWorkspace.id),
            eq(projectTable.priority, 'urgent')
          )
        );

      expect(urgentProjects.length).toBeGreaterThanOrEqual(1);
      expect(urgentProjects.every(p => p.priority === 'urgent')).toBe(true);
    });
  });

  describe('Update Project', () => {
    let testProject: any;

    beforeEach(async () => {
      [testProject] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Update Test Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        status: 'active',
        priority: 'medium',
      }).returning();
    });

    it('should update project name', async () => {
      await db.update(projectTable)
        .set({ name: 'Updated Project Name' })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.name).toBe('Updated Project Name');
    });

    it('should update project status', async () => {
      await db.update(projectTable)
        .set({ status: 'completed' })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.status).toBe('completed');
    });

    it('should update project priority', async () => {
      await db.update(projectTable)
        .set({ priority: 'urgent' })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.priority).toBe('urgent');
    });

    it('should update project dates', async () => {
      const newDueDate = new Date('2025-06-30');

      await db.update(projectTable)
        .set({ dueDate: newDueDate })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.dueDate).toBeDefined();
      expect(new Date(updated.dueDate!).getTime()).toBe(newDueDate.getTime());
    });

    it('should update project settings', async () => {
      const newSettings = {
        isPublic: true,
        enableComments: false,
      };

      await db.update(projectTable)
        .set({ settings: newSettings })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.settings).toEqual(newSettings);
    });

    it('should update multiple fields at once', async () => {
      await db.update(projectTable)
        .set({
          name: 'Multi Update',
          status: 'in_progress',
          priority: 'high',
          description: 'Updated description',
        })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.name).toBe('Multi Update');
      expect(updated.status).toBe('in_progress');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('Updated description');
    });

    it('should update updatedAt timestamp', async () => {
      const originalUpdatedAt = testProject.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await db.update(projectTable)
        .set({ name: 'Timestamp Test', updatedAt: new Date() })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Delete Project', () => {
    let testProject: any;
    let testTask: any;

    beforeEach(async () => {
      [testProject] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Delete Test Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
      }).returning();

      // Create a task in the project
      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Test Task',
        projectId: testProject.id,
        creatorId: testOwner.id,
      }).returning();
    });

    it('should delete project', async () => {
      await db.delete(projectTable)
        .where(eq(projectTable.id, testProject.id));

      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(projects).toHaveLength(0);
    });

    it('should cascade delete associated tasks', async () => {
      await db.delete(projectTable)
        .where(eq(projectTable.id, testProject.id));

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      expect(tasks).toHaveLength(0);
    });

    it('should delete multiple projects', async () => {
      const [project2] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Project 2',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
      }).returning();

      await db.delete(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id));

      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id));

      expect(projects).toHaveLength(0);
    });
  });

  describe('Project Status Transitions', () => {
    let testProject: any;

    beforeEach(async () => {
      [testProject] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Status Test Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
        status: 'active',
      }).returning();
    });

    it('should transition from active to in_progress', async () => {
      await db.update(projectTable)
        .set({ status: 'in_progress' })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.status).toBe('in_progress');
    });

    it('should transition from in_progress to completed', async () => {
      await db.update(projectTable)
        .set({ status: 'in_progress' })
        .where(eq(projectTable.id, testProject.id));

      await db.update(projectTable)
        .set({ status: 'completed' })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.status).toBe('completed');
    });

    it('should archive project', async () => {
      await db.update(projectTable)
        .set({ status: 'archived' })
        .where(eq(projectTable.id, testProject.id));

      const [updated] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.id, testProject.id));

      expect(updated.status).toBe('archived');
    });
  });

  describe('Project Queries and Aggregations', () => {
    beforeEach(async () => {
      // Create multiple projects for aggregation tests
      await db.insert(projectTable).values([
        {
          id: createId(),
          name: 'Active Project 1',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
          status: 'active',
          priority: 'high',
        },
        {
          id: createId(),
          name: 'Active Project 2',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
          status: 'active',
          priority: 'medium',
        },
        {
          id: createId(),
          name: 'Completed Project',
          workspaceId: testWorkspace.id,
          ownerId: testOwner.id,
          status: 'completed',
          priority: 'low',
        },
      ]);
    });

    it('should count projects by status', async () => {
      const activeProjects = await db.select()
        .from(projectTable)
        .where(
          and(
            eq(projectTable.workspaceId, testWorkspace.id),
            eq(projectTable.status, 'active')
          )
        );

      expect(activeProjects.length).toBeGreaterThanOrEqual(2);
    });

    it('should count projects by priority', async () => {
      const highPriorityProjects = await db.select()
        .from(projectTable)
        .where(
          and(
            eq(projectTable.workspaceId, testWorkspace.id),
            eq(projectTable.priority, 'high')
          )
        );

      expect(highPriorityProjects.length).toBeGreaterThanOrEqual(1);
    });

    it('should get projects ordered by creation date', async () => {
      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id))
        .orderBy(projectTable.createdAt);

      expect(projects.length).toBeGreaterThanOrEqual(3);
      
      // Verify ordering
      for (let i = 1; i < projects.length; i++) {
        expect(
          projects[i].createdAt.getTime()
        ).toBeGreaterThanOrEqual(
          projects[i - 1].createdAt.getTime()
        );
      }
    });
  });
});

