// @epic-3.7-task-integration: Task integration schema
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const taskChannels = pgTable('task_channels', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  taskId: text('task_id').notNull(),
  channelId: text('channel_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskComments = pgTable('task_comments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  taskId: text('task_id').notNull(),
  messageId: text('message_id').notNull(),
  parentCommentId: text('parent_comment_id'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export types
export type TaskChannel = typeof taskChannels.$inferSelect;
export type NewTaskChannel = typeof taskChannels.$inferInsert;

export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert; 
