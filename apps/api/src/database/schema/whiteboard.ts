/**
 * Whiteboard Collaboration Schema
 * Phase 4.2 - Whiteboard Collaboration
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Whiteboards - Collaborative canvases
 */
export const whiteboard = pgTable('whiteboard', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id'),
  taskId: uuid('task_id'),
  videoRoomId: uuid('video_room_id'), // Link to video call
  name: text('name').notNull(),
  description: text('description'),
  templateType: text('template_type'), // blank, brainstorm, flowchart, wireframe, kanban
  createdBy: uuid('created_by').notNull(),
  width: integer('width').default(3000), // Canvas width in pixels
  height: integer('height').default(2000), // Canvas height in pixels
  backgroundColor: text('background_color').default('#ffffff'),
  backgroundGrid: boolean('background_grid').default(true),
  isPublic: boolean('is_public').default(false),
  isLocked: boolean('is_locked').default(false), // Prevent editing
  thumbnailUrl: text('thumbnail_url'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Whiteboard Elements - Individual drawing elements
 */
export const whiteboardElement = pgTable('whiteboard_element', {
  id: uuid('id').primaryKey().defaultRandom(),
  whiteboardId: uuid('whiteboard_id').notNull(),
  elementType: text('element_type').notNull(), // path, line, rectangle, circle, ellipse, arrow, text, image, sticky-note
  userId: uuid('user_id').notNull(), // Creator
  x: integer('x').notNull(), // X position
  y: integer('y').notNull(), // Y position
  width: integer('width'),
  height: integer('height'),
  rotation: integer('rotation').default(0), // Degrees
  strokeColor: text('stroke_color').default('#000000'),
  fillColor: text('fill_color'),
  strokeWidth: integer('stroke_width').default(2),
  opacity: integer('opacity').default(100), // 0-100
  zIndex: integer('z_index').default(0), // Layer order
  pathData: text('path_data'), // SVG path data for freehand
  content: text('content'), // Text content or image URL
  fontSize: integer('font_size'),
  fontFamily: text('font_family'),
  properties: jsonb('properties').default({}), // Additional type-specific props
  isLocked: boolean('is_locked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Whiteboard Collaborators - Active users
 */
export const whiteboardCollaborator = pgTable('whiteboard_collaborator', {
  id: uuid('id').primaryKey().defaultRandom(),
  whiteboardId: uuid('whiteboard_id').notNull(),
  userId: uuid('user_id').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').default('editor'), // viewer, editor, admin
  cursorX: integer('cursor_x'),
  cursorY: integer('cursor_y'),
  cursorColor: text('cursor_color').default('#3b82f6'), // User's cursor color
  isActive: boolean('is_active').default(true),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  joinedAt: timestamp('joined_at').defaultNow(),
});

/**
 * Whiteboard History - Change tracking
 */
export const whiteboardHistory = pgTable('whiteboard_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  whiteboardId: uuid('whiteboard_id').notNull(),
  userId: uuid('user_id').notNull(),
  action: text('action').notNull(), // create, update, delete, move, resize
  elementId: uuid('element_id'),
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  timestamp: timestamp('timestamp').defaultNow(),
});

/**
 * Whiteboard Comments - Annotations
 */
export const whiteboardComment = pgTable('whiteboard_comment', {
  id: uuid('id').primaryKey().defaultRandom(),
  whiteboardId: uuid('whiteboard_id').notNull(),
  elementId: uuid('element_id'), // Optional: attach to specific element
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  x: integer('x').notNull(), // Position on canvas
  y: integer('y').notNull(),
  isResolved: boolean('is_resolved').default(false),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Whiteboard Templates - Reusable layouts
 */
export const whiteboardTemplate = pgTable('whiteboard_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // brainstorm, planning, design, retrospective
  thumbnailUrl: text('thumbnail_url'),
  templateData: jsonb('template_data').notNull(), // Serialized elements
  usageCount: integer('usage_count').default(0),
  isPublic: boolean('is_public').default(false), // Available to all workspaces
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Whiteboard Exports - Export history
 */
export const whiteboardExport = pgTable('whiteboard_export', {
  id: uuid('id').primaryKey().defaultRandom(),
  whiteboardId: uuid('whiteboard_id').notNull(),
  userId: uuid('user_id').notNull(),
  format: text('format').notNull(), // png, jpg, pdf, svg
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'), // Bytes
  resolution: text('resolution'), // 1x, 2x, 4x
  exportedAt: timestamp('exported_at').defaultNow(),
});

export type Whiteboard = typeof whiteboard.$inferSelect;
export type WhiteboardElement = typeof whiteboardElement.$inferSelect;
export type WhiteboardCollaborator = typeof whiteboardCollaborator.$inferSelect;
export type WhiteboardHistory = typeof whiteboardHistory.$inferSelect;
export type WhiteboardComment = typeof whiteboardComment.$inferSelect;
export type WhiteboardTemplate = typeof whiteboardTemplate.$inferSelect;
export type WhiteboardExport = typeof whiteboardExport.$inferSelect;


