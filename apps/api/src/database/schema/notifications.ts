/**
 * Notifications Database Schema
 * Phase 2.2 - Smart Notifications System
 */

import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Notification Types:
 * - task_assigned: Task assigned to user
 * - task_completed: Task marked as complete
 * - task_overdue: Task is overdue
 * - comment_mention: User mentioned in comment
 * - comment_reply: Reply to user's comment
 * - project_update: Project status changed
 * - deadline_approaching: Deadline within 24h
 * - kudos_received: User received kudos
 * - skill_endorsed: Skill endorsed by teammate
 * - mood_reminder: Daily mood check-in reminder
 * - digest: Daily/weekly digest notification
 * - custom: Custom notification from alert rule
 */

/**
 * Main Notifications Table
 * Stores all user notifications
 */
export const notification = pgTable('notification', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // Recipient
  workspaceId: uuid('workspace_id').notNull(),
  
  // Notification content
  type: text('type').notNull(), // task_assigned, comment_mention, etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  
  // Related entities
  entityType: text('entity_type'), // task, project, comment, etc.
  entityId: uuid('entity_id'), // ID of related entity
  
  // Actor (who triggered the notification)
  actorId: uuid('actor_id'), // User who triggered notification
  actorName: text('actor_name'),
  actorAvatar: text('actor_avatar'),
  
  // Metadata
  metadata: jsonb('metadata'), // Additional data (task name, project name, etc.)
  actionUrl: text('action_url'), // Link to related content
  
  // Status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  
  // Priority
  priority: text('priority').default('normal'), // low, normal, high, urgent
  
  // Grouping
  groupKey: text('group_key'), // For grouping related notifications
  
  // Delivery
  deliveryChannels: jsonb('delivery_channels').default(['in_app']), // in_app, email, slack, teams
  emailSent: boolean('email_sent').default(false),
  emailSentAt: timestamp('email_sent_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Auto-delete after this date
}, (table) => ({
  userIdIdx: index('notification_user_id_idx').on(table.userId),
  workspaceIdIdx: index('notification_workspace_id_idx').on(table.workspaceId),
  typeIdx: index('notification_type_idx').on(table.type),
  isReadIdx: index('notification_is_read_idx').on(table.isRead),
  createdAtIdx: index('notification_created_at_idx').on(table.createdAt),
  groupKeyIdx: index('notification_group_key_idx').on(table.groupKey),
}));

/**
 * Notification Preferences Table
 * User-specific notification settings
 */
export const notificationPreference = pgTable('notification_preference', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  workspaceId: uuid('workspace_id').notNull(),
  
  // Channel preferences
  inAppEnabled: boolean('in_app_enabled').default(true),
  emailEnabled: boolean('email_enabled').default(true),
  slackEnabled: boolean('slack_enabled').default(false),
  teamsEnabled: boolean('teams_enabled').default(false),
  
  // Type-specific preferences (JSONB for flexibility)
  typePreferences: jsonb('type_preferences').default({}), // { task_assigned: { email: true, slack: false }, ... }
  
  // Digest preferences
  dailyDigestEnabled: boolean('daily_digest_enabled').default(true),
  dailyDigestTime: text('daily_digest_time').default('09:00'), // HH:mm format
  weeklyDigestEnabled: boolean('weekly_digest_enabled').default(true),
  weeklyDigestDay: integer('weekly_digest_day').default(1), // 0=Sunday, 1=Monday, etc.
  weeklyDigestTime: text('weekly_digest_time').default('09:00'),
  
  // Quiet hours
  quietHoursEnabled: boolean('quiet_hours_enabled').default(false),
  quietHoursStart: text('quiet_hours_start').default('22:00'),
  quietHoursEnd: text('quiet_hours_end').default('08:00'),
  
  // Grouping preferences
  groupSimilarNotifications: boolean('group_similar_notifications').default(true),
  groupingWindowMinutes: integer('grouping_window_minutes').default(15),
  
  // Priority filtering
  minimumPriority: text('minimum_priority').default('low'), // low, normal, high, urgent
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('notification_preference_user_id_idx').on(table.userId),
}));

/**
 * Notification Rules Table
 * Custom alert rules created by users
 */
export const notificationRule = pgTable('notification_rule', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // Rule creator
  workspaceId: uuid('workspace_id').notNull(),
  
  // Rule details
  name: text('name').notNull(),
  description: text('description'),
  
  // Trigger conditions
  triggerType: text('trigger_type').notNull(), // task_created, task_updated, comment_added, etc.
  conditions: jsonb('conditions').notNull(), // { field: 'status', operator: 'equals', value: 'completed' }
  
  // Actions
  actions: jsonb('actions').notNull(), // [{ type: 'send_notification', channels: ['email', 'slack'], message: '...' }]
  
  // Scope
  projectIds: jsonb('project_ids'), // null = all projects
  
  // Status
  isEnabled: boolean('is_enabled').default(true),
  
  // Execution tracking
  lastTriggeredAt: timestamp('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('notification_rule_user_id_idx').on(table.userId),
  workspaceIdIdx: index('notification_rule_workspace_id_idx').on(table.workspaceId),
  isEnabledIdx: index('notification_rule_is_enabled_idx').on(table.isEnabled),
}));

/**
 * Notification Templates Table
 * Reusable notification message templates
 */
export const notificationTemplate = pgTable('notification_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  
  // Template details
  type: text('type').notNull().unique(), // task_assigned, comment_mention, etc.
  name: text('name').notNull(),
  
  // Template content
  titleTemplate: text('title_template').notNull(), // "{{actor}} assigned you a task"
  messageTemplate: text('message_template').notNull(), // "{{actor}} assigned you to {{taskName}}"
  
  // Email template
  emailSubjectTemplate: text('email_subject_template'),
  emailBodyTemplate: text('email_body_template'), // HTML template
  
  // Customization
  isCustom: boolean('is_custom').default(false), // true = workspace-specific, false = system default
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  typeIdx: index('notification_template_type_idx').on(table.type),
  workspaceIdIdx: index('notification_template_workspace_id_idx').on(table.workspaceId),
}));

/**
 * Notification Digest Table
 * Tracks digest generation and sending
 */
export const notificationDigest = pgTable('notification_digest', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  
  // Digest details
  type: text('type').notNull(), // daily, weekly
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Content
  notificationCount: integer('notification_count').default(0),
  summary: jsonb('summary'), // { tasks_assigned: 5, comments: 3, kudos: 2, ... }
  
  // Delivery
  emailSent: boolean('email_sent').default(false),
  emailSentAt: timestamp('email_sent_at'),
  emailError: text('email_error'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('notification_digest_user_id_idx').on(table.userId),
  typeIdx: index('notification_digest_type_idx').on(table.type),
  createdAtIdx: index('notification_digest_created_at_idx').on(table.createdAt),
}));

/**
 * Integration Webhooks Table
 * External integration configurations (Slack, Teams, Discord)
 */
export const integrationWebhook = pgTable('integration_webhook', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: uuid('user_id').notNull(), // User who created the integration
  
  // Integration details
  provider: text('provider').notNull(), // slack, teams, discord, custom
  name: text('name').notNull(),
  description: text('description'),
  
  // Webhook configuration
  webhookUrl: text('webhook_url').notNull(),
  authToken: text('auth_token'), // For authenticated webhooks
  
  // Filtering
  notificationTypes: jsonb('notification_types'), // null = all types, or specific types
  projectIds: jsonb('project_ids'), // null = all projects
  
  // Status
  isEnabled: boolean('is_enabled').default(true),
  
  // Health tracking
  lastSuccessAt: timestamp('last_success_at'),
  lastErrorAt: timestamp('last_error_at'),
  lastError: text('last_error'),
  failureCount: integer('failure_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  workspaceIdIdx: index('integration_webhook_workspace_id_idx').on(table.workspaceId),
  providerIdx: index('integration_webhook_provider_idx').on(table.provider),
  isEnabledIdx: index('integration_webhook_is_enabled_idx').on(table.isEnabled),
}));

/**
 * Notification Read Receipts Table (for analytics)
 * Track when notifications are read
 */
export const notificationReceipt = pgTable('notification_receipt', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  // Action tracking
  action: text('action').notNull(), // viewed, clicked, dismissed
  
  // Context
  device: text('device'), // web, mobile, email
  userAgent: text('user_agent'),
  
  // Timestamp
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  notificationIdIdx: index('notification_receipt_notification_id_idx').on(table.notificationId),
  userIdIdx: index('notification_receipt_user_id_idx').on(table.userId),
  actionIdx: index('notification_receipt_action_idx').on(table.action),
}));

// Relations
export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(notification, {
    fields: [notification.userId],
    references: [notification.id],
  }),
}));

export const notificationPreferenceRelations = relations(notificationPreference, ({ one }) => ({
  user: one(notificationPreference, {
    fields: [notificationPreference.userId],
    references: [notificationPreference.id],
  }),
}));

// Type exports
export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;

export type NotificationPreference = typeof notificationPreference.$inferSelect;
export type NewNotificationPreference = typeof notificationPreference.$inferInsert;

export type NotificationRule = typeof notificationRule.$inferSelect;
export type NewNotificationRule = typeof notificationRule.$inferInsert;

export type NotificationTemplate = typeof notificationTemplate.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplate.$inferInsert;

export type NotificationDigest = typeof notificationDigest.$inferSelect;
export type NewNotificationDigest = typeof notificationDigest.$inferInsert;

export type IntegrationWebhook = typeof integrationWebhook.$inferSelect;
export type NewIntegrationWebhook = typeof integrationWebhook.$inferInsert;

export type NotificationReceipt = typeof notificationReceipt.$inferSelect;
export type NewNotificationReceipt = typeof notificationReceipt.$inferInsert;


