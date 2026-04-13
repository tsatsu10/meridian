/**
 * Notification System Tests
 * 
 * Comprehensive tests for notification functionality:
 * - Notification creation and delivery
 * - Notification preferences
 * - Multi-channel notifications (in-app, email, push)
 * - Notification grouping and batching
 * - Read/unread status
 * - Notification filtering
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable, 
  workspaceTable,
  notificationTable,
  notificationPreferencesTable 
} from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Notification System', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
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

    [testUser] = await db.insert(userTable).values({
      id: createId(),
      email: 'notification-user@example.com',
      name: 'Notification User',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Notification Test Workspace',
      ownerId: testUser.id,
    }).returning();
  });

  describe('Notification Creation', () => {
    it('should create a simple notification', async () => {
      const [notification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned to a new task',
        read: false,
      }).returning();

      expect(notification).toBeDefined();
      expect(notification.type).toBe('task_assigned');
      expect(notification.read).toBe(false);
      expect(notification.userId).toBe(testUser.id);
    });

    it('should create notification with metadata', async () => {
      const metadata = {
        taskId: 'task-123',
        taskTitle: 'Implement feature',
        projectId: 'project-456',
        assignedBy: 'user-789',
      };

      const [notification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'task_assigned',
        title: 'New Task',
        message: 'Task assigned',
        metadata,
        read: false,
      }).returning();

      expect(notification.metadata).toEqual(metadata);
    });

    it('should create notification with priority', async () => {
      const [notification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'urgent_deadline',
        title: 'Urgent Deadline',
        message: 'Task due in 1 hour',
        priority: 'high',
        read: false,
      }).returning();

      expect(notification.priority).toBe('high');
    });

    it('should create notification with action link', async () => {
      const [notification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'comment_mention',
        title: 'You were mentioned',
        message: '@user mentioned you in a comment',
        actionUrl: '/tasks/123#comment-456',
        read: false,
      }).returning();

      expect(notification.actionUrl).toBe('/tasks/123#comment-456');
    });

    it('should set default read status to false', async () => {
      const [notification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'info',
        title: 'Info',
        message: 'Information message',
      }).returning();

      expect(notification.read).toBe(false);
    });
  });

  describe('Notification Types', () => {
    it('should create task-related notifications', async () => {
      const types = [
        'task_assigned',
        'task_completed',
        'task_updated',
        'task_comment',
        'task_due_soon',
      ];

      for (const type of types) {
        const [notification] = await db.insert(notificationTable).values({
          id: createId(),
          userId: testUser.id,
          type,
          title: `${type} notification`,
          message: 'Test message',
        }).returning();

        expect(notification.type).toBe(type);
      }
    });

    it('should create project-related notifications', async () => {
      const types = [
        'project_created',
        'project_updated',
        'project_member_added',
        'project_status_changed',
      ];

      for (const type of types) {
        const [notification] = await db.insert(notificationTable).values({
          id: createId(),
          userId: testUser.id,
          type,
          title: `${type} notification`,
          message: 'Test message',
        }).returning();

        expect(notification.type).toBe(type);
      }
    });

    it('should create workspace-related notifications', async () => {
      const types = [
        'workspace_invite',
        'workspace_role_changed',
        'workspace_settings_updated',
      ];

      for (const type of types) {
        const [notification] = await db.insert(notificationTable).values({
          id: createId(),
          userId: testUser.id,
          type,
          title: `${type} notification`,
          message: 'Test message',
        }).returning();

        expect(notification.type).toBe(type);
      }
    });
  });

  describe('Read/Unread Status', () => {
    let testNotification: any;

    beforeEach(async () => {
      [testNotification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'task_assigned',
        title: 'Test Notification',
        message: 'Test message',
        read: false,
      }).returning();
    });

    it('should mark notification as read', async () => {
      await db.update(notificationTable)
        .set({ read: true, readAt: new Date() })
        .where(eq(notificationTable.id, testNotification.id));

      const [updated] = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.id, testNotification.id));

      expect(updated.read).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should mark notification as unread', async () => {
      await db.update(notificationTable)
        .set({ read: true, readAt: new Date() })
        .where(eq(notificationTable.id, testNotification.id));

      await db.update(notificationTable)
        .set({ read: false, readAt: null })
        .where(eq(notificationTable.id, testNotification.id));

      const [updated] = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.id, testNotification.id));

      expect(updated.read).toBe(false);
      expect(updated.readAt).toBeNull();
    });

    it('should mark all notifications as read', async () => {
      // Create multiple unread notifications
      await db.insert(notificationTable).values([
        {
          id: createId(),
          userId: testUser.id,
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          read: false,
        },
        {
          id: createId(),
          userId: testUser.id,
          type: 'info',
          title: 'Notification 2',
          message: 'Message 2',
          read: false,
        },
      ]);

      // Mark all as read
      await db.update(notificationTable)
        .set({ read: true, readAt: new Date() })
        .where(eq(notificationTable.userId, testUser.id));

      const unreadNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.read, false)
          )
        );

      expect(unreadNotifications).toHaveLength(0);
    });
  });

  describe('Notification Queries', () => {
    beforeEach(async () => {
      // Create test notifications
      await db.insert(notificationTable).values([
        {
          id: createId(),
          userId: testUser.id,
          type: 'task_assigned',
          title: 'Unread High Priority',
          message: 'Message',
          priority: 'high',
          read: false,
        },
        {
          id: createId(),
          userId: testUser.id,
          type: 'task_completed',
          title: 'Read Medium Priority',
          message: 'Message',
          priority: 'medium',
          read: true,
          readAt: new Date(),
        },
        {
          id: createId(),
          userId: testUser.id,
          type: 'comment_mention',
          title: 'Unread Low Priority',
          message: 'Message',
          priority: 'low',
          read: false,
        },
      ]);
    });

    it('should get all notifications for user', async () => {
      const notifications = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.userId, testUser.id));

      expect(notifications.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter unread notifications', async () => {
      const unreadNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.read, false)
          )
        );

      expect(unreadNotifications.length).toBeGreaterThanOrEqual(2);
      expect(unreadNotifications.every(n => !n.read)).toBe(true);
    });

    it('should count unread notifications', async () => {
      const unreadNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.read, false)
          )
        );

      const unreadCount = unreadNotifications.length;
      expect(unreadCount).toBeGreaterThanOrEqual(2);
    });

    it('should filter by notification type', async () => {
      const taskNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.type, 'task_assigned')
          )
        );

      expect(taskNotifications.length).toBeGreaterThanOrEqual(1);
      expect(taskNotifications.every(n => n.type === 'task_assigned')).toBe(true);
    });

    it('should filter by priority', async () => {
      const highPriorityNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.priority, 'high')
          )
        );

      expect(highPriorityNotifications.length).toBeGreaterThanOrEqual(1);
      expect(highPriorityNotifications.every(n => n.priority === 'high')).toBe(true);
    });

    it('should get notifications ordered by creation date', async () => {
      const notifications = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.userId, testUser.id))
        .orderBy(desc(notificationTable.createdAt));

      expect(notifications.length).toBeGreaterThanOrEqual(3);
      
      // Verify descending order
      for (let i = 1; i < notifications.length; i++) {
        expect(
          notifications[i - 1].createdAt.getTime()
        ).toBeGreaterThanOrEqual(
          notifications[i].createdAt.getTime()
        );
      }
    });
  });

  describe('Notification Deletion', () => {
    let testNotification: any;

    beforeEach(async () => {
      [testNotification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'info',
        title: 'Delete Test',
        message: 'Test',
        read: false,
      }).returning();
    });

    it('should delete single notification', async () => {
      await db.delete(notificationTable)
        .where(eq(notificationTable.id, testNotification.id));

      const notifications = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.id, testNotification.id));

      expect(notifications).toHaveLength(0);
    });

    it('should delete all read notifications', async () => {
      // Mark notification as read
      await db.update(notificationTable)
        .set({ read: true })
        .where(eq(notificationTable.id, testNotification.id));

      // Delete all read notifications
      await db.delete(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.read, true)
          )
        );

      const readNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.read, true)
          )
        );

      expect(readNotifications).toHaveLength(0);
    });

    it('should cascade delete when user is deleted', async () => {
      await db.delete(userTable)
        .where(eq(userTable.id, testUser.id));

      const notifications = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.userId, testUser.id));

      expect(notifications).toHaveLength(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should create notification preferences', async () => {
      const [preferences] = await db.insert(notificationPreferencesTable).values({
        id: createId(),
        userId: testUser.id,
        emailNotifications: true,
        pushNotifications: false,
        inAppNotifications: true,
        notificationTypes: {
          task_assigned: true,
          task_completed: false,
          comment_mention: true,
        },
      }).returning();

      expect(preferences).toBeDefined();
      expect(preferences.emailNotifications).toBe(true);
      expect(preferences.pushNotifications).toBe(false);
    });

    it('should update notification preferences', async () => {
      const [preferences] = await db.insert(notificationPreferencesTable).values({
        id: createId(),
        userId: testUser.id,
        emailNotifications: true,
      }).returning();

      await db.update(notificationPreferencesTable)
        .set({ emailNotifications: false, pushNotifications: true })
        .where(eq(notificationPreferencesTable.id, preferences.id));

      const [updated] = await db.select()
        .from(notificationPreferencesTable)
        .where(eq(notificationPreferencesTable.id, preferences.id));

      expect(updated.emailNotifications).toBe(false);
      expect(updated.pushNotifications).toBe(true);
    });

    it('should get user notification preferences', async () => {
      await db.insert(notificationPreferencesTable).values({
        id: createId(),
        userId: testUser.id,
        emailNotifications: true,
        pushNotifications: true,
        inAppNotifications: true,
      });

      const [preferences] = await db.select()
        .from(notificationPreferencesTable)
        .where(eq(notificationPreferencesTable.userId, testUser.id));

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe(testUser.id);
    });
  });

  describe('Notification Batching', () => {
    it('should group notifications by type', async () => {
      // Create multiple notifications of same type
      await db.insert(notificationTable).values([
        {
          id: createId(),
          userId: testUser.id,
          type: 'task_assigned',
          title: 'Task 1',
          message: 'Message 1',
        },
        {
          id: createId(),
          userId: testUser.id,
          type: 'task_assigned',
          title: 'Task 2',
          message: 'Message 2',
        },
        {
          id: createId(),
          userId: testUser.id,
          type: 'task_assigned',
          title: 'Task 3',
          message: 'Message 3',
        },
      ]);

      const taskAssignedNotifications = await db.select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, testUser.id),
            eq(notificationTable.type, 'task_assigned')
          )
        );

      expect(taskAssignedNotifications.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Notification Expiry', () => {
    it('should handle notification with expiry date', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [notification] = await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'temporary_access',
        title: 'Temporary Access',
        message: 'Access expires in 7 days',
        expiresAt,
      }).returning();

      expect(notification.expiresAt).toBeDefined();
      expect(notification.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should identify expired notifications', async () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago

      await db.insert(notificationTable).values({
        id: createId(),
        userId: testUser.id,
        type: 'expired',
        title: 'Expired',
        message: 'Expired notification',
        expiresAt: expiredDate,
      });

      const allNotifications = await db.select()
        .from(notificationTable)
        .where(eq(notificationTable.userId, testUser.id));

      const expiredNotifications = allNotifications.filter(
        n => n.expiresAt && n.expiresAt.getTime() < Date.now()
      );

      expect(expiredNotifications.length).toBeGreaterThanOrEqual(1);
    });
  });
});

