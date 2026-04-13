/**
 * Project Notes Database Schema
 * Phase 2.6 - Project Notes System
 * 
 * Tables:
 * - note: Project/task notes with rich text content
 * - note_version: Version history for notes
 * - note_comment: Comments on notes
 * - note_collaborator: Real-time collaboration tracking
 * - note_template: Reusable note templates
 */

import { pgTable, text, timestamp, integer, boolean, json, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { projects } from '../schema';
import { tasks } from './tasks';

/**
 * Notes
 * Rich text notes attached to projects or tasks
 */
export const note = pgTable('note', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Ownership & context
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Note content
  title: text('title').notNull(),
  content: json('content').notNull(), // TipTap JSON format
  contentHtml: text('content_html'), // Rendered HTML for search
  contentText: text('content_text'), // Plain text for search
  
  // Metadata
  isPinned: boolean('is_pinned').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  visibility: text('visibility').default('project').notNull(), // 'project', 'team', 'private'
  
  // Collaboration
  currentVersion: integer('current_version').default(1).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  lockedBy: uuid('locked_by').references(() => user.id),
  lockedAt: timestamp('locked_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastEditedBy: uuid('last_edited_by').references(() => user.id).notNull(),
}, (table) => ({
  createdByIdx: index('note_created_by_idx').on(table.createdBy),
  projectIdIdx: index('note_project_id_idx').on(table.projectId),
  taskIdIdx: index('note_task_id_idx').on(table.taskId),
  visibilityIdx: index('note_visibility_idx').on(table.visibility),
  isPinnedIdx: index('note_is_pinned_idx').on(table.isPinned),
}));

/**
 * Note Versions
 * Track all changes to notes for version history
 */
export const noteVersion = pgTable('note_version', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteId: uuid('note_id').references(() => note.id, { onDelete: 'cascade' }).notNull(),
  
  // Version data
  version: integer('version').notNull(),
  content: json('content').notNull(), // Full note content at this version
  contentHtml: text('content_html'),
  
  // Change metadata
  changedBy: uuid('changed_by').references(() => user.id, { onDelete: 'set null' }),
  changeDescription: text('change_description'), // Optional description of changes
  changeType: text('change_type'), // 'create', 'edit', 'restore'
  
  // Diff information
  addedCharacters: integer('added_characters'),
  deletedCharacters: integer('deleted_characters'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  noteIdIdx: index('note_version_note_id_idx').on(table.noteId),
  versionIdx: index('note_version_version_idx').on(table.version),
}));

/**
 * Note Comments
 * Comments and discussions on notes
 */
export const noteComment = pgTable('note_comment', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteId: uuid('note_id').references(() => note.id, { onDelete: 'cascade' }).notNull(),
  
  // Comment data
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  
  // Threading
  parentCommentId: uuid('parent_comment_id').references((): any => noteComment.id, { onDelete: 'cascade' }),
  
  // Selection/highlight (for inline comments)
  selectionStart: integer('selection_start'),
  selectionEnd: integer('selection_end'),
  selectedText: text('selected_text'),
  
  // Metadata
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedBy: uuid('resolved_by').references(() => user.id),
  resolvedAt: timestamp('resolved_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  noteIdIdx: index('note_comment_note_id_idx').on(table.noteId),
  userIdIdx: index('note_comment_user_id_idx').on(table.userId),
  parentCommentIdIdx: index('note_comment_parent_comment_id_idx').on(table.parentCommentId),
}));

/**
 * Note Collaborators
 * Track active users editing a note (for real-time collaboration)
 */
export const noteCollaborator = pgTable('note_collaborator', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteId: uuid('note_id').references(() => note.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  
  // Collaboration state
  cursorPosition: integer('cursor_position'),
  selectionStart: integer('selection_start'),
  selectionEnd: integer('selection_end'),
  color: text('color'), // User's cursor color for visual distinction
  
  // Activity
  isActive: boolean('is_active').default(true).notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  
  // Timestamps
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  noteIdIdx: index('note_collaborator_note_id_idx').on(table.noteId),
  userIdIdx: index('note_collaborator_user_id_idx').on(table.userId),
  isActiveIdx: index('note_collaborator_is_active_idx').on(table.isActive),
}));

/**
 * Note Templates
 * Reusable note templates for common use cases
 */
export const noteTemplate = pgTable('note_template', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Template metadata
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // 'meeting', 'project_brief', 'retrospective', etc.
  
  // Template content
  content: json('content').notNull(), // TipTap JSON format
  contentHtml: text('content_html'),
  
  // Ownership
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'cascade' }),
  isPublic: boolean('is_public').default(false).notNull(), // Available to all users
  isSystem: boolean('is_system').default(false).notNull(), // Built-in template
  
  // Usage tracking
  usageCount: integer('usage_count').default(0).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index('note_template_created_by_idx').on(table.createdBy),
  categoryIdx: index('note_template_category_idx').on(table.category),
  isPublicIdx: index('note_template_is_public_idx').on(table.isPublic),
}));

// Export types
export type Note = typeof note.$inferSelect;
export type NewNote = typeof note.$inferInsert;

export type NoteVersion = typeof noteVersion.$inferSelect;
export type NewNoteVersion = typeof noteVersion.$inferInsert;

export type NoteComment = typeof noteComment.$inferSelect;
export type NewNoteComment = typeof noteComment.$inferInsert;

export type NoteCollaborator = typeof noteCollaborator.$inferSelect;
export type NewNoteCollaborator = typeof noteCollaborator.$inferInsert;

export type NoteTemplate = typeof noteTemplate.$inferSelect;
export type NewNoteTemplate = typeof noteTemplate.$inferInsert;


