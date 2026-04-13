// @epic-3.7-task-integration: Messages schema
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users, tasks } from './index';

export const messageTable = pgTable('messages', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  conversationId: text('conversation_id').notNull(), // References either channel or DM conversation
  authorId: text('author_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade',
  }),
  content: text('content').notNull(),
  messageType: text('message_type').notNull().default('text'), // text, file, system
  parentMessageId: text('parent_message_id'),
  mentions: text('mentions'), // JSON array of user IDs
  attachments: text('attachments'), // JSON array of attachment metadata
  reactions: text('reactions'), // JSON object with reaction emoji and user IDs
  deliveryStatus: text('delivery_status').notNull().default('pending'), // pending, delivered, failed
  deliveredAt: timestamp('delivered_at'),
  readBy: text('read_by'), // JSON array of user IDs who have read this message
  isEdited: boolean('is_edited').default(false).notNull(),
  metadata: text('metadata'), // JSON for additional message metadata
  // @epic-3.7-task-integration: Task reference fields
  referencedTaskId: text('referenced_task_id').references(() => tasks.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  isTaskUpdate: boolean('is_task_update').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for common message queries
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
  authorIdIdx: index('messages_author_id_idx').on(table.authorId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  parentMessageIdx: index('messages_parent_message_idx').on(table.parentMessageId),
  referencedTaskIdx: index('messages_referenced_task_idx').on(table.referencedTaskId),
  // Composite index for fetching conversation messages by time
  conversationCreatedIdx: index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  // Index for author-based queries
  authorConversationIdx: index('messages_author_conversation_idx').on(table.authorId, table.conversationId),
}));

// Export types
export type Message = typeof messageTable.$inferSelect;
export type NewMessage = typeof messageTable.$inferInsert; 
