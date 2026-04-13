// Team Messages Database Schema
// Real-time team messaging with reactions and threading

import { pgTable, text, timestamp, boolean, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';
import { teams } from '../schema';

/**
 * Team Messages Table
 * Stores all messages sent within team channels
 */
export const teamMessages = pgTable('team_messages', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  
  // References
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email').notNull().references(() => users.email, { onDelete: 'cascade' }),
  
  // Content
  content: text('content').notNull(),
  messageType: text('message_type').notNull().default('text'), // 'text', 'file', 'announcement', 'system'
  
  // Threading
  replyToId: text('reply_to_id').references((): any => teamMessages.id, { onDelete: 'set null' }),
  threadCount: text('thread_count').default('0'),
  
  // Metadata
  mentions: jsonb('mentions').$type<string[]>().default([]),
  attachments: jsonb('attachments'),
  metadata: jsonb('metadata'),
  
  // Edit/Delete status
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  teamIdIdx: index('team_messages_team_id_idx').on(table.teamId),
  userEmailIdx: index('team_messages_user_email_idx').on(table.userEmail),
  createdAtIdx: index('team_messages_created_at_idx').on(table.createdAt),
  replyToIdx: index('team_messages_reply_to_idx').on(table.replyToId),
  messageTypeIdx: index('team_messages_type_idx').on(table.messageType),
  // Composite index for common queries
  teamCreatedIdx: index('team_messages_team_created_idx').on(table.teamId, table.createdAt),
}));

/**
 * Team Message Reactions Table
 * Stores emoji reactions to team messages
 */
export const teamMessageReactions = pgTable('team_message_reactions', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  
  messageId: text('message_id').notNull().references(() => teamMessages.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  userEmail: text('user_email').notNull().references(() => users.email, { onDelete: 'cascade' }),
  
  emoji: text('emoji').notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index('team_reactions_message_id_idx').on(table.messageId),
  userEmailIdx: index('team_reactions_user_email_idx').on(table.userEmail),
  // Composite unique index to prevent duplicate reactions
  uniqueReactionIdx: index('team_reactions_unique_idx').on(table.messageId, table.userEmail, table.emoji),
}));

/**
 * Team Message Read Status Table
 * Tracks which users have read which messages
 */
export const teamMessageReadStatus = pgTable('team_message_read_status', {
  messageId: text('message_id').notNull().references(() => teamMessages.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  userEmail: text('user_email').notNull().references(() => users.email, { onDelete: 'cascade' }),
  
  readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.messageId, table.userEmail] }),
  messageIdIdx: index('team_read_status_message_id_idx').on(table.messageId),
  userEmailIdx: index('team_read_status_user_email_idx').on(table.userEmail),
  // Composite index for unread count queries
  messageUserIdx: index('team_read_status_message_user_idx').on(table.messageId, table.userEmail),
}));

// Export types
export type TeamMessage = typeof teamMessages.$inferSelect;
export type NewTeamMessage = typeof teamMessages.$inferInsert;
export type TeamMessageReaction = typeof teamMessageReactions.$inferSelect;
export type NewTeamMessageReaction = typeof teamMessageReactions.$inferInsert;
export type TeamMessageReadStatus = typeof teamMessageReadStatus.$inferSelect;

