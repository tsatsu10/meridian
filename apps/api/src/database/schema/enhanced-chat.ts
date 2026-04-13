/**
 * Enhanced Chat Features Schema
 * Phase 4.3 - Enhanced Chat Features
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';

/**
 * Message Threads - Conversation threads
 */
export const messageThread = pgTable('message_thread', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull(),
  parentMessageId: uuid('parent_message_id').notNull(),
  title: text('title'), // Optional thread title
  createdBy: uuid('created_by').notNull(),
  messageCount: integer('message_count').default(0),
  participantCount: integer('participant_count').default(0),
  lastMessageAt: timestamp('last_message_at'),
  isResolved: boolean('is_resolved').default(false),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  channelIdIdx: index('message_thread_channel_id_idx').on(table.channelId),
  parentMessageIdIdx: index('message_thread_parent_message_id_idx').on(table.parentMessageId),
  lastMessageAtIdx: index('message_thread_last_message_at_idx').on(table.lastMessageAt),
  isResolvedIdx: index('message_thread_is_resolved_idx').on(table.isResolved),
}));

/**
 * Thread Messages - Messages in threads
 */
export const threadMessage = pgTable('thread_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').notNull(),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  contentHtml: text('content_html'), // Rich text HTML
  messageType: text('message_type').default('text'), // text, voice, system
  voiceUrl: text('voice_url'), // Voice message URL
  voiceDuration: integer('voice_duration'), // Seconds
  attachments: jsonb('attachments').default([]),
  mentions: jsonb('mentions').default([]), // Array of user IDs
  reactions: jsonb('reactions').default({}), // {emoji: [userIds]}
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Pinned Messages - Important messages
 */
export const pinnedMessage = pgTable('pinned_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull(),
  messageId: uuid('message_id').notNull(),
  pinnedBy: uuid('pinned_by').notNull(),
  note: text('note'), // Why it was pinned
  expiresAt: timestamp('expires_at'), // Auto-unpin
  pinnedAt: timestamp('pinned_at').defaultNow(),
});

/**
 * Message Reactions - Emoji reactions
 */
export const messageReaction = pgTable('message_reaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull(),
  userId: uuid('user_id').notNull(),
  emoji: text('emoji').notNull(), // Unicode emoji
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  messageIdIdx: index('message_reaction_message_id_idx').on(table.messageId),
  userIdIdx: index('message_reaction_user_id_idx').on(table.userId),
}));

/**
 * Voice Messages - Audio recordings
 */
export const voiceMessage = pgTable('voice_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull(),
  userId: uuid('user_id').notNull(),
  fileUrl: text('file_url').notNull(),
  duration: integer('duration').notNull(), // Seconds
  fileSize: integer('file_size'), // Bytes
  format: text('format').default('webm'), // webm, mp3, ogg
  waveformData: jsonb('waveform_data'), // Visual waveform
  transcription: text('transcription'), // AI transcription
  transcriptionStatus: text('transcription_status').default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Message Search Index - Full-text search
 */
export const messageSearchIndex = pgTable('message_search_index', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  channelId: uuid('channel_id').notNull(),
  messageId: uuid('message_id').notNull(),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  contentVector: text('content_vector'), // For vector search
  mentions: jsonb('mentions').default([]),
  attachments: jsonb('attachments').default([]),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * AI Message Summaries - Conversation summaries
 */
export const aiMessageSummary = pgTable('ai_message_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id'),
  threadId: uuid('thread_id'),
  summaryType: text('summary_type').notNull(), // daily, weekly, thread, channel
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  messageCount: integer('message_count'),
  summary: text('summary').notNull(), // AI-generated summary
  keyPoints: jsonb('key_points').default([]), // Array of key points
  actionItems: jsonb('action_items').default([]), // Array of action items
  participants: jsonb('participants').default([]), // Array of user IDs
  sentiment: text('sentiment'), // positive, neutral, negative
  generatedBy: text('generated_by').default('ai'), // ai, user
  generatedAt: timestamp('generated_at').defaultNow(),
});

/**
 * Read Receipts - Message read tracking
 */
export const messageReadReceipt = pgTable('message_read_receipt', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull(),
  threadId: uuid('thread_id'),
  userId: uuid('user_id').notNull(),
  readAt: timestamp('read_at').defaultNow(),
}, (table) => ({
  messageIdIdx: index('message_read_receipt_message_id_idx').on(table.messageId),
  userIdIdx: index('message_read_receipt_user_id_idx').on(table.userId),
  threadIdIdx: index('message_read_receipt_thread_id_idx').on(table.threadId),
}));

/**
 * Message Drafts - Unsent messages
 */
export const messageDraft = pgTable('message_draft', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id'),
  threadId: uuid('thread_id'),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  contentHtml: text('content_html'),
  attachments: jsonb('attachments').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type MessageThread = typeof messageThread.$inferSelect;
export type ThreadMessage = typeof threadMessage.$inferSelect;
export type PinnedMessage = typeof pinnedMessage.$inferSelect;
export type MessageReaction = typeof messageReaction.$inferSelect;
export type VoiceMessage = typeof voiceMessage.$inferSelect;
export type MessageSearchIndex = typeof messageSearchIndex.$inferSelect;
export type AiMessageSummary = typeof aiMessageSummary.$inferSelect;
export type MessageReadReceipt = typeof messageReadReceipt.$inferSelect;
export type MessageDraft = typeof messageDraft.$inferSelect;


