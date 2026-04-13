// @epic-3.6-communication: Thread controller for message threading system
import { Hono } from "hono";
import { and, eq, or, asc, desc, sql, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  messageTable, 
  threadNotificationTable, 
  threadParticipantTable,
  userTable 
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

const thread = new Hono<{ Variables: { userEmail: string } }>();

// @epic-3.6-communication: Get thread messages
thread.get("/:threadId/messages", async (c) => {
  const threadId = c.req.param("threadId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Verify thread exists
    const parentMessage = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.id, threadId))
      .limit(1);

    if (parentMessage.length === 0) {
      return c.json({ error: "Thread not found" }, 404);
    }

    // Get all replies in the thread
    const threadMessages = await db
      .select({
        id: messageTable.id,
        content: messageTable.content,
        messageType: messageTable.messageType,
        userEmail: messageTable.userEmail,
        parentMessageId: messageTable.parentMessageId,
        mentions: messageTable.mentions,
        reactions: messageTable.reactions,
        attachments: messageTable.attachments,
        isEdited: messageTable.isEdited,
        editedAt: messageTable.editedAt,
        createdAt: messageTable.createdAt,
        userName: userTable.name,
      })
      .from(messageTable)
      .leftJoin(userTable, eq(messageTable.userEmail, userTable.email))
      .where(
        or(
          eq(messageTable.id, threadId),
          eq(messageTable.parentMessageId, threadId)
        )
      )
      .orderBy(asc(messageTable.createdAt));

    // Mark thread as read for this user
    await db
      .insert(threadParticipantTable)
      .values({
        id: createId(),
        threadId,
        userEmail,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [threadParticipantTable.threadId, threadParticipantTable.userEmail],
        set: { lastReadAt: new Date() },
      });

    // Mark notifications as read
    await db
      .update(threadNotificationTable)
      .set({ isRead: true })
      .where(
        and(
          eq(threadNotificationTable.threadId, threadId),
          eq(threadNotificationTable.userEmail, userEmail)
        )
      );

    return c.json({ messages: threadMessages });
  } catch (error) {
    logger.error("Error fetching thread messages:", error);
    return c.json({ error: "Failed to fetch thread messages" }, 500);
  }
});

// @epic-3.6-communication: Create thread reply
thread.post("/:threadId/reply", async (c) => {
  const threadId = c.req.param("threadId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  const { content, messageType = "thread_reply", attachments = [] } = body;

  if (!content) {
    return c.json({ error: "Content is required" }, 400);
  }

  try {
    const db = getDatabase();
    // Verify parent message exists
    const parentMessage = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.id, threadId))
      .limit(1);

    if (parentMessage.length === 0) {
      return c.json({ error: "Thread not found" }, 404);
    }

    // Create thread reply
    const replyId = createId();
    const [newReply] = await db
      .insert(messageTable)
      .values({
        id: replyId,
        channelId: parentMessage[0].channelId,
        userEmail,
        content,
        messageType,
        parentMessageId: threadId,
        attachments: JSON.stringify(attachments),
        createdAt: new Date(),
      })
      .returning();

    // Add user as thread participant
    await db
      .insert(threadParticipantTable)
      .values({
        id: createId(),
        threadId,
        userEmail,
        joinedAt: new Date(),
      })
      .onConflictDoNothing();

    // Update thread UI fields
    await updateThreadUIFields(threadId);

    // Create notifications for other thread participants
    await createThreadNotifications(threadId, userEmail);

    return c.json({ message: newReply }, 201);
  } catch (error) {
    logger.error("Error creating thread reply:", error);
    return c.json({ error: "Failed to create thread reply" }, 500);
  }
});

// @epic-3.6-communication: Get thread participants
thread.get("/:threadId/participants", async (c) => {
  const threadId = c.req.param("threadId");

  try {
    const db = getDatabase();
    const participants = await db
      .select({
        userEmail: threadParticipantTable.userEmail,
        lastReadAt: threadParticipantTable.lastReadAt,
        joinedAt: threadParticipantTable.joinedAt,
        isSubscribed: threadParticipantTable.isSubscribed,
        userName: userTable.name,
      })
      .from(threadParticipantTable)
      .leftJoin(userTable, eq(threadParticipantTable.userEmail, userTable.email))
      .where(eq(threadParticipantTable.threadId, threadId))
      .orderBy(asc(threadParticipantTable.joinedAt));

    return c.json({ participants });
  } catch (error) {
    logger.error("Error fetching thread participants:", error);
    return c.json({ error: "Failed to fetch thread participants" }, 500);
  }
});

// @epic-3.6-communication: Get thread notifications for user
thread.get("/notifications", async (c) => {
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    const notifications = await db
      .select({
        id: threadNotificationTable.id,
        threadId: threadNotificationTable.threadId,
        notificationType: threadNotificationTable.notificationType,
        isRead: threadNotificationTable.isRead,
        createdAt: threadNotificationTable.createdAt,
        threadPreview: messageTable.threadPreview,
        threadMessageCount: messageTable.threadMessageCount,
      })
      .from(threadNotificationTable)
      .leftJoin(messageTable, eq(threadNotificationTable.threadId, messageTable.id))
      .where(
        and(
          eq(threadNotificationTable.userEmail, userEmail),
          eq(threadNotificationTable.isRead, false)
        )
      )
      .orderBy(desc(threadNotificationTable.createdAt));

    return c.json({ notifications });
  } catch (error) {
    logger.error("Error fetching thread notifications:", error);
    return c.json({ error: "Failed to fetch thread notifications" }, 500);
  }
});

// @epic-3.6-communication: Mark thread notifications as read
thread.put("/notifications/read", async (c) => {
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  const { threadIds } = body;

  try {
    const db = getDatabase();
    if (threadIds && Array.isArray(threadIds)) {
      // Mark specific threads as read
      await db
        .update(threadNotificationTable)
        .set({ isRead: true })
        .where(
          and(
            eq(threadNotificationTable.userEmail, userEmail),
            sql`${threadNotificationTable.threadId} IN (${threadIds.join(",")})`
          )
        );
    } else {
      // Mark all notifications as read
      await db
        .update(threadNotificationTable)
        .set({ isRead: true })
        .where(eq(threadNotificationTable.userEmail, userEmail));
    }

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error marking notifications as read:", error);
    return c.json({ error: "Failed to mark notifications as read" }, 500);
  }
});

// @epic-3.6-communication: Update thread status
thread.put("/:threadId/status", async (c) => {
  const threadId = c.req.param("threadId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  const { status } = body; // 'open', 'resolved', 'archived'

  if (!["open", "resolved", "archived"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  try {
    const db = getDatabase();
    // Verify user is thread participant
    const participant = await db
      .select()
      .from(threadParticipantTable)
      .where(
        and(
          eq(threadParticipantTable.threadId, threadId),
          eq(threadParticipantTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return c.json({ error: "Not a thread participant" }, 403);
    }

    // Update thread status
    await db
      .update(messageTable)
      .set({ 
        threadStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(messageTable.id, threadId));

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error updating thread status:", error);
    return c.json({ error: "Failed to update thread status" }, 500);
  }
});

// @epic-3.6-communication: Subscribe/unsubscribe from thread
thread.put("/:threadId/subscription", async (c) => {
  const threadId = c.req.param("threadId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  const { isSubscribed } = body;

  try {
    const db = getDatabase();
    await db
      .insert(threadParticipantTable)
      .values({
        id: createId(),
        threadId,
        userEmail,
        isSubscribed,
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [threadParticipantTable.threadId, threadParticipantTable.userEmail],
        set: { isSubscribed },
      });

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error updating thread subscription:", error);
    return c.json({ error: "Failed to update thread subscription" }, 500);
  }
});

// Helper function to update thread UI fields
async function updateThreadUIFields(threadId: string): Promise<void> {
  try {
    const db = getDatabase();
    // Get thread statistics
    const [messageStats, participants] = await Promise.all([
      // Get message count and latest reply
      db
        .select({
          count: sql<number>`count(*)`,
          lastReply: sql<Date>`max(created_at)`,
          preview: sql<string>`content`,
        })
        .from(messageTable)
        .where(eq(messageTable.parentMessageId, threadId))
        .get(),
      // Get unique participants
      db
        .select({
          participantCount: sql<number>`count(distinct user_email)`,
        })
        .from(messageTable)
        .where(
          or(
            eq(messageTable.id, threadId),
            eq(messageTable.parentMessageId, threadId)
          )
        )
        .get(),
    ]);

    // Update parent message with thread UI fields
    await db
      .update(messageTable)
      .set({
        threadMessageCount: messageStats?.count || 0,
        threadParticipantCount: participants?.participantCount || 0,
        threadLastReplyAt: messageStats?.lastReply || new Date(),
        threadPreview: messageStats?.preview || '',
      })
      .where(eq(messageTable.id, threadId));
  } catch (error) {
    logger.error("Error updating thread UI fields:", error);
  }
}

// Helper function to create thread notifications
async function createThreadNotifications(threadId: string, excludeUserEmail: string): Promise<void> {
  try {
    const db = getDatabase();
    // Get all subscribed participants except the sender
    const participants = await db
      .select({ userEmail: threadParticipantTable.userEmail })
      .from(threadParticipantTable)
      .where(
        and(
          eq(threadParticipantTable.threadId, threadId),
          eq(threadParticipantTable.isSubscribed, true),
          sql`${threadParticipantTable.userEmail} != ${excludeUserEmail}`
        )
      );

    // Create notifications for each participant
    const notificationPromises = participants.map(participant =>
      db
        .insert(threadNotificationTable)
        .values({
          id: createId(),
          threadId,
          userEmail: participant.userEmail,
          notificationType: "reply",
          isRead: false,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    logger.error("Error creating thread notifications:", error);
  }
}

export default thread; 
