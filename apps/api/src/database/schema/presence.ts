/**
 * 👥 User Presence Schema
 * Real-time user presence tracking for workspace collaboration
 * 
 * Tracks:
 * - Online/offline/away status
 * - Last seen timestamps
 * - Active socket connections
 * - Workspace-specific presence
 */

import { pgTable, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const userPresenceTable = pgTable('user_presence', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  
  // User and workspace identification
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  workspaceId: text('workspace_id').notNull(),
  
  // Presence status
  status: text('status').notNull().default('offline'), // 'online' | 'away' | 'busy' | 'offline'
  customStatus: text('custom_status'), // Optional custom status message
  
  // Connection tracking
  socketId: text('socket_id'), // Current active socket connection ID
  lastSeen: timestamp('last_seen', { withTimezone: true }).defaultNow(),
  
  // Activity tracking
  isActive: boolean('is_active').default(true),
  idleAt: timestamp('idle_at', { withTimezone: true }), // When user went idle
  
  // Additional metadata
  metadata: jsonb('metadata').default({}), // Device info, browser, etc.
  
  // Timestamps
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Performance indexes
  userIdIdx: index('user_presence_user_id_idx').on(table.userId),
  userEmailIdx: index('user_presence_user_email_idx').on(table.userEmail),
  workspaceIdIdx: index('user_presence_workspace_id_idx').on(table.workspaceId),
  statusIdx: index('user_presence_status_idx').on(table.status),
  socketIdIdx: index('user_presence_socket_id_idx').on(table.socketId),
  lastSeenIdx: index('user_presence_last_seen_idx').on(table.lastSeen),
  
  // Composite index for common query pattern
  userWorkspaceIdx: index('user_presence_user_workspace_idx').on(table.userId, table.workspaceId),
}));

// Alias for consistency with other tables
export const userPresence = userPresenceTable;

/**
 * Presence History (Optional - for analytics)
 * Track presence patterns over time
 */
export const presenceHistory = pgTable('presence_history', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  
  // Session tracking
  sessionStart: timestamp('session_start', { withTimezone: true }).notNull(),
  sessionEnd: timestamp('session_end', { withTimezone: true }),
  duration: text('duration'), // Duration in seconds
  
  // Activity summary
  statusChanges: jsonb('status_changes').default([]), // Array of status change events
  totalActiveTime: text('total_active_time'), // Active time in seconds
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('presence_history_user_id_idx').on(table.userId),
  workspaceIdIdx: index('presence_history_workspace_id_idx').on(table.workspaceId),
  sessionStartIdx: index('presence_history_session_start_idx').on(table.sessionStart),
}));


