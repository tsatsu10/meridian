import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable, userTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { findGroupForNotification, mergeSimilarNotifications } from "../services/notification-grouper";
import logger from '../../utils/logger';

async function createNotification({
  userEmail,
  title,
  content,
  type,
  resourceId,
  resourceType,
  priority,
}: {
  userEmail: string;
  title: string;
  content?: string;
  type?: string;
  resourceId?: string;
  resourceType?: string;
  priority?: string;
}) {
  const db = getDatabase(); // FIX: Initialize database connection
  // Look up userId from email
  const [user] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    logger.error(`❌ Cannot create notification: User not found for email ${userEmail}`);
    return null;
  }

  // Phase 2: Find if this notification should be grouped
  const groupId = await findGroupForNotification(userEmail, {
    type: type || "info",
    resourceType,
    resourceId,
  });

  const [notification] = await db
    .insert(notificationTable)
    .values({
      id: createId(),
      userId: user.id, // Add userId from lookup
      userEmail,
      title,
      content: content || "",
      type: type || "info",
      resourceId: resourceId || null,
      resourceType: resourceType || null,
      priority: priority || null,
      groupId: groupId || null,
      isGrouped: !!groupId,
    })
    .returning();

  // Phase 2: Merge similar notifications (debounce)
  if (type && resourceType && resourceId) {
    await mergeSimilarNotifications(userEmail, type, resourceType, resourceId);
  }

  if (notification) {
    await publishEvent("notification.created", {
      notificationId: notification.id,
      userEmail,
    });
  }

  return notification;
}

export default createNotification;

