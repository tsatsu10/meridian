/**
 * Notification Grouping Service
 * Groups similar notifications together to reduce clutter
 */

import { getDatabase } from '../../database/connection';
import { notifications } from '../../database/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../../utils/logger';

interface NotificationGroup {
  groupId: string;
  type: string;
  count: number;
  latestNotification: any;
  notifications: any[];
}

/**
 * Group notifications by type and similarity
 */
export function groupNotifications(notificationList: any[]): NotificationGroup[] {
  const groups = new Map<string, any[]>();
  
  for (const notification of notificationList) {
    // Skip if already part of a group
    if (notification.isGrouped && notification.groupId) {
      const existing = groups.get(notification.groupId);
      if (existing) {
        existing.push(notification);
      } else {
        groups.set(notification.groupId, [notification]);
      }
      continue;
    }
    
    // Create group key based on type and resource
    const groupKey = generateGroupKey(notification);
    
    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(notification);
    } else {
      groups.set(groupKey, [notification]);
    }
  }
  
  // Convert to group objects
  const result: NotificationGroup[] = [];
  
  for (const [groupId, items] of groups.entries()) {
    if (items.length > 0) {
      // Sort by date (newest first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      result.push({
        groupId,
        type: items[0].type,
        count: items.length,
        latestNotification: items[0],
        notifications: items,
      });
    }
  }
  
  return result;
}

/**
 * Generate a group key for a notification
 * Notifications with the same key will be grouped together
 */
function generateGroupKey(notification: any): string {
  const { type, resourceType, resourceId } = notification;
  
  // Group similar notification types
  switch (type) {
    case 'comment':
    case 'reply':
      // Group by resource (e.g., all comments on the same task)
      return `${type}_${resourceType}_${resourceId}`;
    
    case 'mention':
      // Group mentions by resource
      return `mention_${resourceType}_${resourceId}`;
    
    case 'task':
    case 'task_assigned':
    case 'task_completed':
      // Group task notifications by project
      return `task_updates`;
    
    case 'kudos':
      // Group all kudos together
      return 'kudos_received';
    
    case 'alert':
      // Don't group alerts (they're important)
      return `alert_${notification.id}`;
    
    default:
      // Group by type
      return type || 'general';
  }
}

/**
 * Check if a new notification should be grouped with existing ones
 * Returns the groupId if it should be grouped, or null if it should be standalone
 */
export async function findGroupForNotification(userEmail: string, notification: {
  type: string;
  resourceType?: string;
  resourceId?: string;
}): Promise<string | null> {
  const db = getDatabase();
  
  try {
    // Look for recent similar notifications (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const similar = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userEmail, userEmail),
          eq(notifications.type, notification.type),
          gte(notifications.createdAt, oneDayAgo)
        )
      )
      .limit(10);
    
    // Find matching notifications
    for (const existing of similar) {
      if (
        existing.resourceType === notification.resourceType &&
        existing.resourceId === notification.resourceId
      ) {
        // Found a match! Use its group ID or create one
        if (existing.groupId) {
          return existing.groupId;
        } else {
          // Create a new group ID and update the existing notification
          const newGroupId = createId();
          await db
            .update(notifications)
            .set({ groupId: newGroupId, isGrouped: true })
            .where(eq(notifications.id, existing.id));
          return newGroupId;
        }
      }
    }
    
    return null; // No group found
  } catch (error) {
    logger.error('Failed to find group for notification:', error);
    return null;
  }
}

/**
 * Merge similar notifications that occurred within a time window
 * This is used for debouncing - if multiple similar notifications happen quickly,
 * merge them into a group instead of creating spam
 */
export async function mergeSimilarNotifications(
  userEmail: string,
  type: string,
  resourceType?: string,
  resourceId?: string
): Promise<void> {
  const db = getDatabase();
  
  try {
    // Find notifications of the same type in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recent = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userEmail, userEmail),
          eq(notifications.type, type),
          gte(notifications.createdAt, fiveMinutesAgo)
        )
      );
    
    // Filter by resource if provided
    const matching = resourceType && resourceId
      ? recent.filter(n => n.resourceType === resourceType && n.resourceId === resourceId)
      : recent;
    
    if (matching.length > 1) {
      // Create a group
      const groupId = matching[0].groupId || createId();
      const ids = matching.map(n => n.id);
      
      await db
        .update(notifications)
        .set({ groupId, isGrouped: true })
        .where(inArray(notifications.id, ids));
      
      logger.info(`Merged ${matching.length} notifications into group ${groupId}`);
    }
  } catch (error) {
    logger.error('Failed to merge similar notifications:', error);
  }
}

/**
 * Get summary text for a notification group
 */
export function getGroupSummary(group: NotificationGroup): string {
  const { type, count } = group;
  
  if (count === 1) {
    return group.latestNotification.title;
  }
  
  switch (type) {
    case 'comment':
      return `${count} new comments`;
    case 'mention':
      return `You were mentioned ${count} times`;
    case 'task':
    case 'task_assigned':
      return `${count} task updates`;
    case 'kudos':
      return `${count} kudos received`;
    case 'alert':
      return `${count} alerts`;
    default:
      return `${count} notifications`;
  }
}

/**
 * Mark all notifications in a group as read
 */
export async function markGroupAsRead(userEmail: string, groupId: string): Promise<void> {
  const db = getDatabase();
  
  try {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userEmail, userEmail),
          eq(notifications.groupId, groupId)
        )
      );
    
    logger.info(`Marked group ${groupId} as read`);
  } catch (error) {
    logger.error('Failed to mark group as read:', error);
    throw error;
  }
}

/**
 * Archive all notifications in a group
 */
export async function archiveGroup(userEmail: string, groupId: string): Promise<void> {
  const db = getDatabase();
  
  try {
    await db
      .update(notifications)
      .set({ isArchived: true })
      .where(
        and(
          eq(notifications.userEmail, userEmail),
          eq(notifications.groupId, groupId)
        )
      );
    
    logger.info(`Archived group ${groupId}`);
  } catch (error) {
    logger.error('Failed to archive group:', error);
    throw error;
  }
}

/**
 * Delete all notifications in a group
 */
export async function deleteGroup(userEmail: string, groupId: string): Promise<void> {
  const db = getDatabase();
  
  try {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userEmail, userEmail),
          eq(notifications.groupId, groupId)
        )
      );
    
    logger.info(`Deleted group ${groupId}`);
  } catch (error) {
    logger.error('Failed to delete group:', error);
    throw error;
  }
}


