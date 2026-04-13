/**
 * Third-Party Integrations Schema
 * Phase 3.6 - Third-Party Integrations
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Integration Connections - OAuth and API connections
 */
export const integrationConnection = pgTable('integration_connection', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: uuid('user_id').notNull(), // User who connected
  provider: text('provider').notNull(), // github, gitlab, slack, google, jira, etc.
  accountId: text('account_id'), // External account ID
  accountName: text('account_name'), // Display name
  accountEmail: text('account_email'),
  accountAvatar: text('account_avatar'),
  accessToken: text('access_token'), // Encrypted
  refreshToken: text('refresh_token'), // Encrypted
  expiresAt: timestamp('expires_at'),
  scopes: jsonb('scopes').default([]),
  metadata: jsonb('metadata').default({}), // Provider-specific data
  isActive: boolean('is_active').default(true),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Integration Syncs - Sync configurations
 */
export const integrationSync = pgTable('integration_sync', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id'), // Optional project-specific sync
  syncType: text('sync_type').notNull(), // commits, issues, pull_requests, calendar_events, etc.
  direction: text('direction').default('bidirectional'), // inbound, outbound, bidirectional
  externalId: text('external_id'), // External resource ID (repo, calendar, board, etc.)
  externalName: text('external_name'),
  config: jsonb('config').default({}), // Sync-specific configuration
  isActive: boolean('is_active').default(true),
  syncFrequency: text('sync_frequency').default('realtime'), // realtime, hourly, daily
  lastSyncedAt: timestamp('last_synced_at'),
  nextSyncAt: timestamp('next_sync_at'),
  syncStatus: text('sync_status').default('active'), // active, paused, error
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Integration Mappings - Entity mappings between Meridian and external systems
 */
export const integrationMapping = pgTable('integration_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncId: uuid('sync_id').notNull(),
  entityType: text('entity_type').notNull(), // task, project, user, milestone, etc.
  meridianId: uuid('meridian_id').notNull(), // Internal Meridian entity ID
  externalId: text('external_id').notNull(), // External system entity ID
  externalType: text('external_type'), // issue, card, ticket, event, etc.
  metadata: jsonb('metadata').default({}), // Additional mapping data
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: text('sync_status').default('synced'), // synced, pending, error, conflict
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Integration Events - Webhook events and sync logs
 */
export const integrationEvent = pgTable('integration_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id'),
  syncId: uuid('sync_id'),
  workspaceId: uuid('workspace_id').notNull(),
  eventType: text('event_type').notNull(), // webhook, sync, manual
  provider: text('provider').notNull(),
  action: text('action').notNull(), // create, update, delete, sync_start, sync_complete, etc.
  externalId: text('external_id'),
  entityType: text('entity_type'),
  payload: jsonb('payload').default({}),
  status: text('status').default('pending'), // pending, processing, completed, failed
  error: text('error'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * GitHub/GitLab Commits - Linked commits
 */
export const gitCommit = pgTable('git_commit', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull(),
  projectId: uuid('project_id'),
  taskId: uuid('task_id'),
  commitSha: text('commit_sha').notNull(),
  repository: text('repository').notNull(),
  branch: text('branch'),
  message: text('message').notNull(),
  author: text('author').notNull(),
  authorEmail: text('author_email'),
  committedAt: timestamp('committed_at').notNull(),
  url: text('url'),
  additions: integer('additions'),
  deletions: integer('deletions'),
  filesChanged: integer('files_changed'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Pull Requests / Merge Requests
 */
export const pullRequest = pgTable('pull_request', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull(),
  projectId: uuid('project_id'),
  taskId: uuid('task_id'),
  prNumber: integer('pr_number').notNull(),
  repository: text('repository').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  author: text('author').notNull(),
  status: text('status').notNull(), // open, closed, merged
  sourceBranch: text('source_branch'),
  targetBranch: text('target_branch'),
  url: text('url'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  mergedAt: timestamp('merged_at'),
  closedAt: timestamp('closed_at'),
});

/**
 * Calendar Events - Google Calendar sync
 */
export const calendarEvent = pgTable('calendar_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id'),
  taskId: uuid('task_id'),
  milestoneId: uuid('milestone_id'),
  externalId: text('external_id').notNull(), // Google Calendar event ID
  calendarId: text('calendar_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isAllDay: boolean('is_all_day').default(false),
  attendees: jsonb('attendees').default([]),
  url: text('url'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Zapier Webhooks - Automation hooks
 */
export const zapierWebhook = pgTable('zapier_webhook', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  name: text('name').notNull(),
  triggerEvent: text('trigger_event').notNull(), // task.created, project.updated, etc.
  webhookUrl: text('webhook_url').notNull(),
  secret: text('secret'), // Webhook verification secret
  filters: jsonb('filters').default({}), // Event filters
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type IntegrationConnection = typeof integrationConnection.$inferSelect;
export type IntegrationSync = typeof integrationSync.$inferSelect;
export type IntegrationMapping = typeof integrationMapping.$inferSelect;
export type IntegrationEvent = typeof integrationEvent.$inferSelect;
export type GitCommit = typeof gitCommit.$inferSelect;
export type PullRequest = typeof pullRequest.$inferSelect;
export type CalendarEvent = typeof calendarEvent.$inferSelect;
export type ZapierWebhook = typeof zapierWebhook.$inferSelect;


