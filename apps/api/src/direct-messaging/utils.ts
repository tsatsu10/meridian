import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  messageTable,
  readReceiptsTable,
  userTable,
} from "../database/schema";
import { getDatabase } from "../database/connection";
import logger from "../utils/logger";

export type Database = ReturnType<typeof getDatabase>;

export type ConversationRecord = {
  id: string;
  workspaceId: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  isArchived: boolean | null;
  createdAt: Date;
  updatedAt: Date | null;
  participant1Email: string | null;
  participant1Name: string | null;
  participant1Avatar: string | null;
  participant2Email: string | null;
  participant2Name: string | null;
  participant2Avatar: string | null;
};

const lastMessageAuthorAlias = alias(userTable, "dm_last_message_author");

export async function getUserByEmail(db: Database, email: string) {
  const [user] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      avatar: userTable.avatar,
    })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  return user ?? null;
}

export async function computeUnreadCount(
  db: Database,
  conversationId: string,
  userId: string,
) {
  const [result] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(messageTable)
    .leftJoin(
      readReceiptsTable,
      and(
        eq(readReceiptsTable.messageId, messageTable.id),
        eq(readReceiptsTable.userId, userId),
      ),
    )
    .where(
      and(
        eq(messageTable.channelId, conversationId),
        ne(messageTable.userId, userId),
        isNull(readReceiptsTable.id),
        isNull(messageTable.deletedAt),
      ),
    );

  return Number(result?.count ?? 0);
}

export async function getLastMessageForConversation(
  db: Database,
  conversationId: string,
) {
  const [lastMessage] = await db
    .select({
      id: messageTable.id,
      content: messageTable.content,
      authorId: messageTable.userId,
      createdAt: messageTable.createdAt,
      authorEmail: lastMessageAuthorAlias.email,
    })
    .from(messageTable)
    .leftJoin(
      lastMessageAuthorAlias,
      eq(lastMessageAuthorAlias.id, messageTable.userId),
    )
    .where(eq(messageTable.channelId, conversationId))
    .orderBy(desc(messageTable.createdAt))
    .limit(1);

  return lastMessage ?? null;
}

export function buildLastMessagePreview(content: string | null | undefined) {
  if (!content) return null;
  const trimmed = content.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}...`;
}

export async function serializeConversationRecord(
  db: Database,
  record: ConversationRecord,
) {
  let unreadCount1 = 0;
  let unreadCount2 = 0;
  let lastMessage = null;

  try {
    unreadCount1 = await computeUnreadCount(db, record.id, record.participant1Id);
  } catch (error) {
    logger.warn("Failed to compute unread count for participant1", {
      conversationId: record.id,
      participantId: record.participant1Id,
      error,
    });
  }

  try {
    unreadCount2 = await computeUnreadCount(db, record.id, record.participant2Id);
  } catch (error) {
    logger.warn("Failed to compute unread count for participant2", {
      conversationId: record.id,
      participantId: record.participant2Id,
      error,
    });
  }

  try {
    lastMessage = await getLastMessageForConversation(db, record.id);
  } catch (error) {
    logger.warn("Failed to fetch last message for conversation", {
      conversationId: record.id,
      error,
    });
  }

  return {
    id: record.id,
    workspaceId: record.workspaceId,
    user1Email: record.participant1Email ?? "",
    user2Email: record.participant2Email ?? "",
    participant1Id: record.participant1Id,
    participant2Id: record.participant2Id,
    participant1: {
      id: record.participant1Id,
      email: record.participant1Email,
      name: record.participant1Name,
      avatar: record.participant1Avatar,
    },
    participant2: {
      id: record.participant2Id,
      email: record.participant2Email,
      name: record.participant2Name,
      avatar: record.participant2Avatar,
    },
    lastMessageAt: record.lastMessageAt ?? record.updatedAt ?? record.createdAt,
    lastMessageContent:
      lastMessage?.content ?? record.lastMessagePreview ?? null,
    lastMessageSender: lastMessage?.authorEmail ?? null,
    unreadCount1,
    unreadCount2,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export type SerializedConversation = Awaited<
  ReturnType<typeof serializeConversationRecord>
>;

export function formatConversationForClient(
  conversation: SerializedConversation,
) {
  return {
    id: conversation.id,
    channelId: conversation.id,
    user1Email: conversation.user1Email,
    user2Email: conversation.user2Email,
    unreadCount1: conversation.unreadCount1,
    unreadCount2: conversation.unreadCount2,
    lastMessageAt: conversation.lastMessageAt,
    lastMessageContent: conversation.lastMessageContent ?? undefined,
    lastMessageSender: conversation.lastMessageSender ?? undefined,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt ?? conversation.createdAt,
  };
}


