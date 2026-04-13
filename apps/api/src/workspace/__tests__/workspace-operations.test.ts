/**
 * Workspace Operations Tests
 * 
 * Covers:
 * - Workspace CRUD operations
 * - Member management
 * - Access control
 * - Settings management
 * - Workspace deletion with cascading
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable, 
  workspaceTable,
  workspaceUserTable,
  projectTable,
  taskTable 
} from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Workspace Operations', () => {
  let db: ReturnType<typeof getDatabase>;
  let testOwner: any;
  let testMember: any;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {

    const hashedPassword = await hashPassword('TestPassword123!');

    // Create test owner
    [testOwner] = await db.insert(userTable).values({
      id: createId(),
      email: 'owner@example.com',
      name: 'Workspace Owner',
      password: hashedPassword,
      role: 'workspace-manager',
    }).returning();

    // Create test member
    [testMember] = await db.insert(userTable).values({
      id: createId(),
      email: 'member@example.com',
      name: 'Workspace Member',
      password: hashedPassword,
      role: 'member',
    }).returning();
  });

  describe('Create Workspace', () => {
    it('should create a new workspace', async () => {
      const [workspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Test Workspace',
        description: 'A workspace for testing',
        ownerId: testOwner.id,
        slug: 'test-workspace',
        settings: { theme: 'dark', notifications: true },
        isActive: true,
      }).returning();

      expect(workspace).toBeDefined();
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.ownerId).toBe(testOwner.id);
      expect(workspace.settings).toEqual({ theme: 'dark', notifications: true });
      expect(workspace.isActive).toBe(true);
    });

    it('should enforce unique slug constraint', async () => {
      const slug = 'unique-workspace';

      // Create first workspace
      await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Workspace 1',
        ownerId: testOwner.id,
        slug,
      });

      // Attempt duplicate slug
      await expect(async () => {
        await db.insert(workspaceTable).values({
          id: createId(),
          name: 'Workspace 2',
          ownerId: testOwner.id,
          slug,
        });
      }).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const [workspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Minimal Workspace',
        ownerId: testOwner.id,
      }).returning();

      expect(workspace.isActive).toBe(true);
      expect(workspace.settings).toEqual({});
      expect(workspace.createdAt).toBeDefined();
    });
  });

  describe('Workspace Member Management', () => {
    let testWorkspace: any;

    beforeEach(async () => {
      [testWorkspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Test Workspace',
        ownerId: testOwner.id,
        slug: `test-workspace-${Date.now()}`,
      }).returning();
    });

    it('should add member to workspace', async () => {
      const [membership] = await db.insert(workspaceUserTable).values({
        id: createId(),
        workspaceId: testWorkspace.id,
        userId: testMember.id,
        userEmail: testMember.email,
        role: 'member',
        status: 'active',
        invitedBy: testOwner.id,
      }).returning();

      expect(membership).toBeDefined();
      expect(membership.userId).toBe(testMember.id);
      expect(membership.workspaceId).toBe(testWorkspace.id);
      expect(membership.role).toBe('member');
    });

    it('should prevent duplicate memberships', async () => {
      // Add member once
      await db.insert(workspaceUserTable).values({
        id: createId(),
        workspaceId: testWorkspace.id,
        userId: testMember.id,
        userEmail: testMember.email,
        role: 'member',
      });

      // Attempt duplicate
      await expect(async () => {
        await db.insert(workspaceUserTable).values({
          id: createId(),
          workspaceId: testWorkspace.id,
          userId: testMember.id,
          userEmail: testMember.email,
          role: 'member',
        });
      }).rejects.toThrow();
    });

    it('should update member role', async () => {
      const [membership] = await db.insert(workspaceUserTable).values({
        id: createId(),
        workspaceId: testWorkspace.id,
        userId: testMember.id,
        userEmail: testMember.email,
        role: 'member',
      }).returning();

      // Update role to admin
      await db.update(workspaceUserTable)
        .set({ role: 'admin' })
        .where(eq(workspaceUserTable.id, membership.id));

      const [updated] = await db.select()
        .from(workspaceUserTable)
        .where(eq(workspaceUserTable.id, membership.id));

      expect(updated.role).toBe('admin');
    });

    it('should remove member from workspace', async () => {
      const [membership] = await db.insert(workspaceUserTable).values({
        id: createId(),
        workspaceId: testWorkspace.id,
        userId: testMember.id,
        userEmail: testMember.email,
        role: 'member',
      }).returning();

      await db.delete(workspaceUserTable)
        .where(eq(workspaceUserTable.id, membership.id));

      const members = await db.select()
        .from(workspaceUserTable)
        .where(eq(workspaceUserTable.id, membership.id));

      expect(members).toHaveLength(0);
    });

    it('should track invitation metadata', async () => {
      const [membership] = await db.insert(workspaceUserTable).values({
        id: createId(),
        workspaceId: testWorkspace.id,
        userId: testMember.id,
        userEmail: testMember.email,
        role: 'member',
        invitedBy: testOwner.id,
      }).returning();

      expect(membership.invitedBy).toBe(testOwner.id);
      expect(membership.joinedAt).toBeDefined();
    });
  });

  describe('Workspace Settings', () => {
    let testWorkspace: any;

    beforeEach(async () => {
      [testWorkspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Settings Test Workspace',
        ownerId: testOwner.id,
        settings: {},
      }).returning();
    });

    it('should update workspace settings', async () => {
      const newSettings = {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          slack: true,
        },
        workHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'America/New_York',
        },
      };

      await db.update(workspaceTable)
        .set({ settings: newSettings })
        .where(eq(workspaceTable.id, testWorkspace.id));

      const [updated] = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      expect(updated.settings).toEqual(newSettings);
    });

    it('should merge partial settings updates', async () => {
      // Initial settings
      await db.update(workspaceTable)
        .set({ settings: { theme: 'light', locale: 'en' } })
        .where(eq(workspaceTable.id, testWorkspace.id));

      // Get current settings
      const [current] = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      // Merge with new settings
      const mergedSettings = {
        ...current.settings,
        theme: 'dark', // Update existing
        notifications: true, // Add new
      };

      await db.update(workspaceTable)
        .set({ settings: mergedSettings })
        .where(eq(workspaceTable.id, testWorkspace.id));

      const [updated] = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      expect(updated.settings).toEqual({
        theme: 'dark',
        locale: 'en',
        notifications: true,
      });
    });
  });

  describe('Workspace Deletion with Cascading', () => {
    let testWorkspace: any;
    let testProject: any;
    let testTask: any;

    beforeEach(async () => {
      // Create workspace
      [testWorkspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Deletion Test Workspace',
        ownerId: testOwner.id,
      }).returning();

      // Create project
      [testProject] = await db.insert(projectTable).values({
        id: createId(),
        name: 'Test Project',
        workspaceId: testWorkspace.id,
        ownerId: testOwner.id,
      }).returning();

      // Create task
      [testTask] = await db.insert(taskTable).values({
        id: createId(),
        title: 'Test Task',
        projectId: testProject.id,
        creatorId: testOwner.id,
      }).returning();

      // Add member
      await db.insert(workspaceUserTable).values({
        id: createId(),
        workspaceId: testWorkspace.id,
        userId: testMember.id,
        userEmail: testMember.email,
        role: 'member',
      });
    });

    it('should cascade delete workspace members', async () => {
      await db.delete(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      const members = await db.select()
        .from(workspaceUserTable)
        .where(eq(workspaceUserTable.workspaceId, testWorkspace.id));

      expect(members).toHaveLength(0);
    });

    it('should cascade delete projects and tasks', async () => {
      await db.delete(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      const projects = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id));

      expect(projects).toHaveLength(0);

      const tasks = await db.select()
        .from(taskTable)
        .where(eq(taskTable.projectId, testProject.id));

      expect(tasks).toHaveLength(0);
    });
  });

  describe('Workspace Status Management', () => {
    let testWorkspace: any;

    beforeEach(async () => {
      [testWorkspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Status Test Workspace',
        ownerId: testOwner.id,
        isActive: true,
      }).returning();
    });

    it('should deactivate workspace', async () => {
      await db.update(workspaceTable)
        .set({ isActive: false })
        .where(eq(workspaceTable.id, testWorkspace.id));

      const [updated] = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      expect(updated.isActive).toBe(false);
    });

    it('should reactivate workspace', async () => {
      // Deactivate first
      await db.update(workspaceTable)
        .set({ isActive: false })
        .where(eq(workspaceTable.id, testWorkspace.id));

      // Reactivate
      await db.update(workspaceTable)
        .set({ isActive: true })
        .where(eq(workspaceTable.id, testWorkspace.id));

      const [updated] = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, testWorkspace.id));

      expect(updated.isActive).toBe(true);
    });
  });

  describe('Workspace Queries', () => {
    let workspace1: any, workspace2: any;

    beforeEach(async () => {
      [workspace1] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Workspace 1',
        ownerId: testOwner.id,
        isActive: true,
      }).returning();

      [workspace2] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Workspace 2',
        ownerId: testOwner.id,
        isActive: false,
      }).returning();
    });

    it('should get all workspaces for user', async () => {
      const workspaces = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.ownerId, testOwner.id));

      expect(workspaces.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter active workspaces', async () => {
      const activeWorkspaces = await db.select()
        .from(workspaceTable)
        .where(
          and(
            eq(workspaceTable.ownerId, testOwner.id),
            eq(workspaceTable.isActive, true)
          )
        );

      expect(activeWorkspaces.length).toBeGreaterThanOrEqual(1);
      expect(activeWorkspaces.every(w => w.isActive)).toBe(true);
    });

    it('should get workspace by slug', async () => {
      const [workspace] = await db.insert(workspaceTable).values({
        id: createId(),
        name: 'Slug Test',
        ownerId: testOwner.id,
        slug: 'unique-slug-123',
      }).returning();

      const [found] = await db.select()
        .from(workspaceTable)
        .where(eq(workspaceTable.slug, 'unique-slug-123'));

      expect(found).toBeDefined();
      expect(found.id).toBe(workspace.id);
    });
  });
});

