// @epic-3.7-task-integration: Tasks schema
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  assignedTo: text('assigned_to'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for common queries
  statusIdx: index('tasks_status_idx').on(table.status),
  assignedToIdx: index('tasks_assigned_to_idx').on(table.assignedTo),
  createdByIdx: index('tasks_created_by_idx').on(table.createdBy),
  createdAtIdx: index('tasks_created_at_idx').on(table.createdAt),
  // Composite index for filtering tasks by status and assignee
  statusAssignedIdx: index('tasks_status_assigned_idx').on(table.status, table.assignedTo),
}));

// Export types
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert; 
