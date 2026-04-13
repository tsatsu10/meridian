/**
 * Canonical Drizzle schema for the API (`import … from "@/database/schema"` or `./schema`).
 * The `database/schema/` folder contains legacy or supplemental fragments; prefer this file
 * for new tables and for `PostgresJsDatabase<typeof schema>` typing.
 */
import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  pgEnum,
  jsonb,
  varchar,
  index,
  numeric,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const userRole = pgEnum("user_role", [
  'admin',
  'manager', 
  'member',
  'viewer',
  'workspace-manager',
  'team-lead',
  'project-manager',
  'department-head',
  'project-viewer',
  'guest'
]);
export const priority = pgEnum("priority", ['low', 'medium', 'high', 'urgent']);
export const taskStatus = pgEnum("task_status", ['todo', 'in_progress', 'done']);
export const helpArticleCategory = pgEnum("help_article_category", ['getting-started', 'features', 'integrations', 'troubleshooting', 'best-practices']);
export const helpArticleDifficulty = pgEnum("help_article_difficulty", ['beginner', 'intermediate', 'advanced']);
export const helpContentType = pgEnum("help_content_type", ['article', 'video', 'faq']);
export const eventType = pgEnum("event_type", ['meeting', 'deadline', 'time-off', 'workload', 'milestone', 'other']);
export const eventStatus = pgEnum("event_status", ['scheduled', 'in-progress', 'completed', 'cancelled']);
export const attendeeStatus = pgEnum("attendee_status", ['pending', 'accepted', 'declined', 'maybe']);
export const recurringFrequency = pgEnum("recurring_frequency", ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']);
export const favoriteType = pgEnum("favorite_type", ['user', 'channel', 'project', 'task']);

// Core tables
export const users = pgTable(
  "users",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    password: text("password").notNull(),
    avatar: text("avatar"),
    timezone: text("timezone").default('UTC'),
    language: text("language").default('en'),
    role: userRole().default('member'),
    isEmailVerified: boolean("is_email_verified").default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastSeen: timestamp("last_seen", { withTimezone: true }), // For presence tracking
    // Two-Factor Authentication fields
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: text("two_factor_secret"),
    twoFactorBackupCodes: text("two_factor_backup_codes"), // JSON string array
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Performance index for presence tracking queries
    lastSeenIdx: index("idx_users_last_seen").on(table.lastSeen),
  })
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug"),
  logo: text("logo"),
  settings: jsonb("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  role: userRole().default('member'),
  status: text("status").default('active'),
  permissions: jsonb("permissions").default([]),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  invitedBy: text("invited_by"),
}, (table) => ({
  // ⚡ Performance indexes for workspace member queries
  workspaceIdIdx: index("idx_workspace_members_workspace_id").on(table.workspaceId),
  userIdIdx: index("idx_workspace_members_user_id").on(table.userId),
  userEmailIdx: index("idx_workspace_members_user_email").on(table.userEmail),
  roleIdx: index("idx_workspace_members_role").on(table.role),
  statusIdx: index("idx_workspace_members_status").on(table.status),
  // One membership row per user per workspace (replaces non-unique composite index)
  workspaceUserUnique: uniqueIndex("idx_workspace_members_workspace_user_unique").on(
    table.workspaceId,
    table.userId,
  ),
}));

export const workspaceInvites = pgTable("workspace_invites", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  inviteeEmail: text("invitee_email").notNull(),
  inviterUserId: text("inviter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleToAssign: text("role_to_assign").notNull(),
  token: text("token").notNull().unique(),
  message: text("message"),
  status: text("status").default('pending'), // pending, accepted, rejected, expired
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("idx_workspace_invites_workspace_id").on(table.workspaceId),
  inviteeEmailIdx: index("idx_workspace_invites_email").on(table.inviteeEmail),
  tokenIdx: index("idx_workspace_invites_token").on(table.token),
  statusIdx: index("idx_workspace_invites_status").on(table.status),
}));

export const projects = pgTable("projects", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug"),
  color: text("color").default('#6366f1'),
  icon: text("icon"),
  status: text("status").default('active'),
  priority: priority().default('medium'),
  startDate: timestamp("start_date", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  settings: jsonb("settings").default({}),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  // ⚡ Performance indexes for frequently queried columns
  workspaceIdIdx: index("idx_projects_workspace_id").on(table.workspaceId),
  statusIdx: index("idx_projects_status").on(table.status),
  ownerIdIdx: index("idx_projects_owner_id").on(table.ownerId),
  isArchivedIdx: index("idx_projects_is_archived").on(table.isArchived),
  createdAtIdx: index("idx_projects_created_at").on(table.createdAt),
  // Composite index for common query pattern: workspace + status filtering
  workspaceStatusIdx: index("idx_projects_workspace_status").on(table.workspaceId, table.status),
}));

// Project members table for project-level team assignments
export const projectMembers = pgTable("project_members", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  role: text("role").default("member"),
  permissions: jsonb("permissions").default([]),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  assignedBy: text("assigned_by").references(() => users.id),
  hoursPerWeek: integer("hours_per_week"),
  isActive: boolean("is_active").default(true),
  notificationSettings: jsonb("notification_settings").default({}),
});

// Project settings table for project-specific configurations
export const projectSettings = pgTable("project_settings", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: text("user_email").references(() => users.email, { onDelete: "set null" }),
  status: taskStatus().default('todo'),
  priority: priority().default('medium'),
  position: integer("position").default(0),
  number: integer("number").default(1),
  dueDate: timestamp("due_date", { withTimezone: true }),
  startDate: timestamp("start_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  parentTaskId: text("parent_task_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  // ⚡ Performance indexes for frequently queried columns
  projectIdIdx: index("idx_tasks_project_id").on(table.projectId),
  statusIdx: index("idx_tasks_status").on(table.status),
  assigneeIdIdx: index("idx_tasks_assignee_id").on(table.assigneeId),
  userEmailIdx: index("idx_tasks_user_email").on(table.userEmail),
  dueDateIdx: index("idx_tasks_due_date").on(table.dueDate),
  priorityIdx: index("idx_tasks_priority").on(table.priority),
  createdAtIdx: index("idx_tasks_created_at").on(table.createdAt),
  // Composite indexes for common query patterns
  projectStatusIdx: index("idx_tasks_project_status").on(table.projectId, table.status),
  assigneeStatusIdx: index("idx_tasks_assignee_status").on(table.assigneeId, table.status),
}));

export const activities = pgTable("activities", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content: jsonb("content"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  message: text("message"),
  type: text("type").notNull(),
  isRead: boolean("is_read").default(false),
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
  resourceId: text("resource_id"),
  resourceType: text("resource_type"),
  metadata: jsonb("metadata"),
  // Phase 2: Notification grouping
  groupId: text("group_id"),
  isGrouped: boolean("is_grouped").default(false),
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ⚡ Performance indexes for notification queries
  userIdIdx: index("idx_notifications_user_id").on(table.userId),
  userEmailIdx: index("idx_notifications_user_email").on(table.userEmail),
  isReadIdx: index("idx_notifications_is_read").on(table.isRead),
  isPinnedIdx: index("idx_notifications_is_pinned").on(table.isPinned),
  isArchivedIdx: index("idx_notifications_is_archived").on(table.isArchived),
  typeIdx: index("idx_notifications_type").on(table.type),
  createdAtIdx: index("idx_notifications_created_at").on(table.createdAt),
  // Composite index for user's unread notifications
  userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.isRead),
}));

export const timeEntries = pgTable("time_entries", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  duration: integer("duration").default(0),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const label = pgTable("label", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
});

export const roleAssignment = pgTable("role_assignment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  projectIds: jsonb("project_ids"),
  isActive: boolean("is_active").default(true),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdBy: text("created_by").references(() => users.id),
  leadId: text("lead_id").references(() => users.id), // Team lead
  color: text("color").default("#3B82F6"), // Team color for UI
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // member, lead, etc.
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  addedBy: text("added_by").references(() => users.id),
});

/**
 * Team Messages Table
 * Stores messages in team channels
 * Schema matches existing database structure from team-messages.ts
 */
export const teamMessages = pgTable("team_messages", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // References
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  
  // Content
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'file', 'announcement', 'system'
  
  // Threading
  replyToId: text("reply_to_id").references((): any => teamMessages.id, { onDelete: "set null" }),
  threadCount: text("thread_count").default("0"), // TEXT not INTEGER!
  
  // Metadata
  mentions: jsonb("mentions").$type<string[]>().default([]),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  
  // Edit/Delete status
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  teamIdIdx: index("team_messages_team_id_idx").on(table.teamId),
  userEmailIdx: index("team_messages_user_email_idx").on(table.userEmail),
  createdAtIdx: index("team_messages_created_at_idx").on(table.createdAt),
  replyToIdx: index("team_messages_reply_to_idx").on(table.replyToId),
  messageTypeIdx: index("team_messages_type_idx").on(table.messageType),
  teamCreatedIdx: index("team_messages_team_created_idx").on(table.teamId, table.createdAt),
}));

/**
 * Team Message Reactions Table
 * Stores emoji reactions to team messages
 * Schema matches existing database structure from team-messages.ts
 */
export const teamMessageReactions = pgTable("team_message_reactions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  messageId: text("message_id")
    .notNull()
    .references(() => teamMessages.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  
  emoji: text("emoji").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("team_reactions_message_id_idx").on(table.messageId),
  userEmailIdx: index("team_reactions_user_email_idx").on(table.userEmail),
  uniqueReactionIdx: index("team_reactions_unique_idx").on(table.messageId, table.userEmail, table.emoji),
}));

/**
 * Team Message Read Status Table  
 * Tracks which team messages have been read by users
 * Schema matches existing database structure from team-messages.ts
 * Uses composite PRIMARY KEY (messageId, userEmail) - NO separate id field!
 */
export const teamMessageReadStatus = pgTable("team_message_read_status", {
  messageId: text("message_id")
    .notNull()
    .references(() => teamMessages.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  
  readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.messageId, table.userEmail] }),
  messageIdIdx: index("team_read_status_message_id_idx").on(table.messageId),
  userEmailIdx: index("team_read_status_user_email_idx").on(table.userEmail),
  messageUserIdx: index("team_read_status_message_user_idx").on(table.messageId, table.userEmail),
}));

export const statusColumns = pgTable("status_columns", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color").default("#6b7280"),
  position: integer("position").notNull().default(0),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const roleHistory = pgTable("role_history", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  projectIds: jsonb("project_ids"),
  departmentIds: jsonb("department_ids"),
  action: text("action").notNull(), // 'assigned' | 'removed' | 'modified'
  performedBy: text("performed_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskDependencies = pgTable("task_dependencies", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  dependentTaskId: text("dependent_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  requiredTaskId: text("required_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("blocks"), // 'blocks' | 'blocked_by'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customPermissions = pgTable("custom_permissions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  granted: boolean("granted").notNull().default(true),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  reason: text("reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const departments = pgTable("departments", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  headId: text("head_id").references(() => users.id, { onDelete: "set null" }),
  parentDepartmentId: text("parent_department_id"),
  settings: jsonb("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"), // Optional description/message with file
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  commentId: text("comment_id"),
  messageId: text("message_id").references(() => messagesTable.id, { onDelete: "cascade" }), // For chat attachments
  channelId: text("channel_id").references(() => channelTable.id, { onDelete: "cascade" }), // For chat context
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-1.3-milestones: Project milestones for tracking key deliverables
export const milestone = pgTable("milestone", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'phase', 'deadline', 'review', 'release', etc.
  status: text("status").notNull().default("not_started"), // 'not_started', 'in_progress', 'completed', 'blocked'
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  riskLevel: text("risk_level").default("low"), // 'low', 'medium', 'high', 'critical'
  riskDescription: text("risk_description"),
  dependencyTaskIds: text("dependency_task_ids"), // JSON array of task IDs
  stakeholderIds: text("stakeholder_ids"), // JSON array of user IDs
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.2-integrations: Third-party integration connections
export const integrationConnection = pgTable("integration_connection", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'github', 'slack', 'jira', 'discord', etc.
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  config: jsonb("config").notNull(), // Provider-specific configuration
  credentials: jsonb("credentials"), // Encrypted credentials
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'error'
  lastSync: timestamp("last_sync", { withTimezone: true }),
  syncStatus: text("sync_status"), // 'success', 'failed', 'pending'
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.2-integrations: Webhook endpoints for integration events
export const webhookEndpoint = pgTable("webhook_endpoint", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  url: text("url").notNull(),
  secret: text("secret"), // Webhook signing secret
  provider: text("provider"), // Optional: which provider this webhook is for
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  integrationId: text("integration_id").references(() => integrationConnection.id, { onDelete: "cascade" }),
  events: jsonb("events").notNull(), // Array of event types to subscribe to
  isActive: boolean("is_active").default(true),
  lastTriggered: timestamp("last_triggered", { withTimezone: true }),
  failureCount: integer("failure_count").default(0),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.2-integrations: API keys for integration authentication
export const apiKey = pgTable("api_key", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(), // The actual API key (hashed)
  provider: text("provider"), // Which service this key is for
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  integrationId: text("integration_id").references(() => integrationConnection.id, { onDelete: "cascade" }),
  scopes: jsonb("scopes"), // Permissions/scopes for this key
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastUsed: timestamp("last_used", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.1-automation-engine: Automation rules for workflow triggers
export const automationRule = pgTable("automation_rule", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  trigger: jsonb("trigger").notNull(), // Trigger configuration
  conditions: jsonb("conditions"), // Conditions that must be met
  actions: jsonb("actions").notNull(), // Actions to execute
  isActive: boolean("is_active").default(true),
  executionCount: integer("execution_count").default(0),
  lastExecuted: timestamp("last_executed", { withTimezone: true }),
  priority: integer("priority").default(0),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.1-automation-engine: Workflow templates for reusable automation
export const workflowTemplate = pgTable("workflow_template", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'task_automation', 'notification', 'integration', etc.
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  triggerConfig: text("trigger_config").notNull(), // JSON string of triggers
  actionConfig: text("action_config").notNull(), // JSON string of actions
  conditionConfig: text("condition_config"), // JSON string of conditions
  isActive: boolean("is_active").default(true),
  isGlobal: boolean("is_global").default(false), // Available to all workspaces
  usageCount: integer("usage_count").default(0),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.1-automation-engine: Workflow instances for active workflows
export const workflowInstance = pgTable("workflow_instance", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  templateId: text("template_id").references(() => workflowTemplate.id, { onDelete: "set null" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  currentStep: integer("current_step").default(0),
  totalSteps: integer("total_steps").default(0),
  config: jsonb("config"), // Instance-specific configuration
  executionData: jsonb("execution_data"), // Runtime data and results
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.1-automation-engine: Workflow execution history
export const workflowExecution = pgTable("workflow_execution", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  instanceId: text("instance_id")
    .notNull()
    .references(() => workflowInstance.id, { onDelete: "cascade" }),
  templateId: text("template_id").references(() => workflowTemplate.id, { onDelete: "set null" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'success', 'failed', 'skipped'
  stepNumber: integer("step_number").notNull(),
  stepName: text("step_name"),
  actionType: text("action_type"), // Type of action executed
  input: jsonb("input"), // Input data for the step
  output: jsonb("output"), // Output/result data
  error: text("error"),
  duration: integer("duration"), // Execution time in milliseconds
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// @epic-3.1-automation-engine: Visual workflow builder workflows
export const visualWorkflow = pgTable("visual_workflow", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").notNull(), // Array of visual workflow nodes
  edges: jsonb("edges").notNull(), // Array of connections between nodes
  layout: jsonb("layout"), // Canvas layout and positioning
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.1-automation-engine: Visual workflow templates
export const visualWorkflowTemplate = pgTable("visual_workflow_template", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  nodes: jsonb("nodes").notNull(),
  edges: jsonb("edges").notNull(),
  layout: jsonb("layout"),
  isPublic: boolean("is_public").default(false),
  usageCount: integer("usage_count").default(0),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-3.1-automation-engine: Visual workflow execution logs
export const visualWorkflowExecution = pgTable("visual_workflow_execution", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => visualWorkflow.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'running', 'completed', 'failed', 'cancelled'
  currentNodeId: text("current_node_id"),
  executionPath: jsonb("execution_path"), // Array of executed node IDs
  results: jsonb("results"), // Results from each node
  error: text("error"),
  duration: integer("duration"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Visual workflow builder: registry of draggable node types (built-in + custom)
export const workflowNodeTypes = pgTable("workflow_node_types", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  color: text("color"),
  configSchema: text("config_schema").notNull(),
  outputSchema: text("output_schema"),
  requiredIntegrations: text("required_integrations"),
  isBuiltIn: boolean("is_built_in").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// @epic-3.2-integrations: Email templates for notifications
export const emailTemplates = pgTable("email_templates", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  category: text("category").notNull(), // 'notification', 'marketing', 'transactional', etc.
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  isGlobal: boolean("is_global").default(false),
  variables: jsonb("variables"), // Template variable definitions
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// General audit log table for security/operations auditing
export const auditLogTable = pgTable("audit_log", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  actorType: text("actor_type").default("user"),
  workspaceId: text("workspace_id"),
  projectId: text("project_id"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  changes: text("changes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  requestId: text("request_id"),
  severity: text("severity").default("info"),
  category: text("category"),
  description: text("description"),
  metadata: text("metadata"),
  retentionPolicy: text("retention_policy").default("standard"),
  isSystemGenerated: boolean("is_system_generated").default(false),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  date: text("date"),
});

// Settings audit log for tracking settings changes
export const settingsAuditLog = pgTable("settings_audit_log", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  section: text("section").notNull(), // Which settings section was modified
  action: text("action").notNull(), // 'update', 'reset', 'import', 'export'
  oldValue: text("old_value"), // Previous value (JSON string)
  newValue: text("new_value"), // New value (JSON string)
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// User settings storage
export const userSettings = pgTable("user_settings", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  section: text("section").notNull(), // 'general', 'notifications', 'appearance', etc.
  settings: text("settings").notNull(), // JSON string of settings
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Settings presets for quick configuration
export const settingsPreset = pgTable("settings_preset", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'user', 'workspace', 'project'
  settings: text("settings").notNull(), // JSON string of preset settings
  isPublic: boolean("is_public").default(false),
  isDefault: boolean("is_default").default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User profiles for extended user information
export const userProfile = pgTable("user_profile", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Basic info
  bio: text("bio"),
  jobTitle: text("job_title"),
  company: text("company"),
  industry: text("industry"),
  headline: text("headline"),
  location: text("location"),
  timezone: text("timezone"),
  language: text("language"),
  
  // Contact info
  phone: text("phone"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  twitterUrl: text("twitter_url"),
  
  // Media
  profilePicture: text("profile_picture"),
  coverImage: text("cover_image"),
  
  // Privacy settings
  isPublic: boolean("is_public").default(true),
  allowDirectMessages: boolean("allow_direct_messages").default(true),
  showOnlineStatus: boolean("show_online_status").default(true),
  showEmail: boolean("show_email").default(false),
  showPhone: boolean("show_phone").default(false),
  
  // Verification
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  profileVerified: boolean("profile_verified").default(false),
  
  // Stats
  viewCount: integer("view_count").default(0),
  connectionCount: integer("connection_count").default(0),
  endorsementCount: integer("endorsement_count").default(0),
  completenessScore: integer("completeness_score").default(0),
  
  // Legacy fields from original schema (JSONB in database)
  socialLinks: jsonb("social_links"),
  skills: jsonb("skills"),
  metadata: jsonb("metadata"),
  
  // Legacy fields from original schema (TEXT)
  title: text("title"),
  department: text("department"),
  phoneNumber: text("phone_number"),
  avatar: text("avatar"),
  
  // Timestamps
  lastProfileUpdate: timestamp("last_profile_update", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User work experience
export const userExperience = pgTable("user_experience", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  description: text("description"),
  startDate: text("start_date").notNull(), // YYYY-MM format
  endDate: text("end_date"), // YYYY-MM format, null means current
  isCurrent: boolean("is_current").default(false),
  skills: jsonb("skills"), // JSONB array of skills (already parsed by postgres driver)
  achievements: text("achievements"), // JSON string of achievements array
  companyLogo: text("company_logo"),
  order: integer("order").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User education
export const userEducation = pgTable("user_education", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  degree: text("degree").notNull(), // "Bachelor's", "Master's", etc.
  fieldOfStudy: text("field_of_study"),
  school: text("school").notNull(),
  location: text("location"),
  description: text("description"),
  startDate: text("start_date").notNull(), // YYYY-MM format
  endDate: text("end_date"), // YYYY-MM format, null means current
  isCurrent: boolean("is_current").default(false),
  grade: text("grade"), // GPA or final grade
  activities: text("activities"), // JSON string of activities array
  schoolLogo: text("school_logo"),
  order: integer("order").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User skills and expertise
export const userSkill = pgTable("user_skill", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // "technical", "soft", "language", "tool", "other"
  proficiency: text("proficiency"), // Legacy field: "beginner", "intermediate", "advanced", "expert", "master"
  level: integer("level").default(1), // 1-5 (preferred over proficiency)
  yearsOfExperience: integer("years_of_experience").default(0),
  endorsements: integer("endorsements").default(0),
  verified: boolean("verified").default(false),
  order: integer("order").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User connections/network
export const userConnection = pgTable("user_connection", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  followerId: text("follower_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  followingId: text("following_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "blocked"
  note: text("note"),
  // Legacy fields from original schema
  userId: text("user_id"),
  connectedUserId: text("connected_user_id"),
  connectionType: text("connection_type"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Direct message conversations
export const directMessageConversations = pgTable("direct_message_conversations", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  participant1Id: text("participant1_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  participant2Id: text("participant2_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  isArchived: boolean("is_archived").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Custom themes for workspace branding
export const customThemes = pgTable("custom_themes", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  isGlobal: boolean("is_global").default(false), // Available to all workspaces
  colors: jsonb("colors").notNull(), // Theme color palette
  fonts: jsonb("fonts"), // Font settings
  components: jsonb("components"), // Component styling overrides
  isActive: boolean("is_active").default(true),
  isDark: boolean("is_dark").default(false), // Dark or light theme
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.6-dashboard-templates: Dashboard Templates for personalized layouts
export const dashboardTemplates = pgTable("dashboard_templates", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  isGlobal: boolean("is_global").default(false), // Available to all workspaces
  isPublic: boolean("is_public").default(false), // Publicly available in marketplace
  
  // Layout configuration
  layout: jsonb("layout").notNull(), // Widget positions, sizes, and configurations
  widgets: jsonb("widgets").notNull(), // Array of widget IDs and their settings
  gridConfig: jsonb("grid_config"), // Grid system configuration (columns, rows, gaps)
  
  // Metadata
  category: text("category"), // e.g., "Project Management", "Analytics", "Team Overview"
  tags: jsonb("tags"), // Array of tags for filtering
  thumbnail: text("thumbnail"), // Preview image URL or base64
  usageCount: integer("usage_count").default(0), // Track popularity
  isActive: boolean("is_active").default(true),
  
  // Ownership
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.7-widget-library: Dashboard Widgets for customizable dashboards
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // e.g., "chart", "table", "metric", "list", "calendar", "timeline"
  category: text("category").notNull(), // e.g., "Analytics", "Tasks", "Team", "Files"
  
  // Widget Configuration
  component: text("component").notNull(), // React component identifier
  defaultConfig: jsonb("default_config").notNull(), // Default widget settings
  configSchema: jsonb("config_schema"), // JSON schema for widget configuration
  dataSource: text("data_source"), // API endpoint or data source identifier
  refreshInterval: integer("refresh_interval"), // Auto-refresh interval in seconds
  
  // Display properties
  defaultSize: jsonb("default_size"), // { width: 4, height: 2 } in grid units
  minSize: jsonb("min_size"), // Minimum allowed size
  maxSize: jsonb("max_size"), // Maximum allowed size
  thumbnail: text("thumbnail"), // Preview image
  icon: text("icon"), // Icon identifier
  
  // Marketplace & Sharing
  isGlobal: boolean("is_global").default(false), // System-provided widget
  isPublic: boolean("is_public").default(false), // Publicly available in marketplace
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  usageCount: integer("usage_count").default(0),
  rating: numeric("rating", { precision: 3, scale: 2 }), // Average rating
  
  // Metadata
  tags: jsonb("tags"), // Array of tags for filtering
  version: text("version").default("1.0.0"),
  isActive: boolean("is_active").default(true),
  isPremium: boolean("is_premium").default(false), // Requires subscription
  
  // Ownership
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.7-widget-library: User Widget Instances (widgets added to dashboards)
export const userWidgetInstances = pgTable("user_widget_instances", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  widgetId: text("widget_id")
    .notNull()
    .references(() => dashboardWidgets.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  dashboardId: text("dashboard_id"), // Optional: which dashboard this widget is on
  
  // Position & Size
  position: jsonb("position").notNull(), // { x: 0, y: 0 } in grid coordinates
  size: jsonb("size").notNull(), // { width: 4, height: 2 } in grid units
  
  // Custom Configuration
  config: jsonb("config"), // User-specific widget configuration
  filters: jsonb("filters"), // Data filtering options
  
  // State
  isVisible: boolean("is_visible").default(true),
  isPinned: boolean("is_pinned").default(false),
  order: integer("order").default(0), // Display order
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userDashboards = pgTable("user_dashboards", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  isDefault: boolean("is_default").default(false),
  layout: jsonb("layout"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.7-widget-library: Widget Ratings
export const widgetRatings = pgTable("widget_ratings", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  widgetId: text("widget_id")
    .notNull()
    .references(() => dashboardWidgets.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.7-widget-library: Widget Reviews
export const widgetReviews = pgTable("widget_reviews", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  widgetId: text("widget_id")
    .notNull()
    .references(() => dashboardWidgets.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  rating: integer("rating").notNull(), // 1-5
  helpfulCount: integer("helpful_count").default(0),
  isVerifiedInstall: boolean("is_verified_install").default(false), // User has actually installed the widget
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.7-widget-library: Widget Analytics
export const widgetAnalytics = pgTable("widget_analytics", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  widgetId: text("widget_id")
    .notNull()
    .references(() => dashboardWidgets.id, { onDelete: "cascade" }),
  userEmail: text("user_email").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'view', 'install', 'uninstall', 'configure', 'error', 'render'
  metadata: jsonb("metadata"), // Event-specific data
  performanceMs: integer("performance_ms"), // Render time in milliseconds
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

// @epic-4.7-widget-library: Widget Versions
export const widgetVersions = pgTable("widget_versions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  widgetId: text("widget_id")
    .notNull()
    .references(() => dashboardWidgets.id, { onDelete: "cascade" }),
  version: text("version").notNull(), // Semantic versioning (e.g., "1.2.3")
  changelog: text("changelog"), // What's new in this version
  config: jsonb("config"), // Widget configuration for this version
  componentCode: text("component_code"), // Serialized component code (for custom widgets)
  isStable: boolean("is_stable").default(true),
  isBeta: boolean("is_beta").default(false),
  isDeprecated: boolean("is_deprecated").default(false),
  releaseNotes: text("release_notes"),
  breakingChanges: text("breaking_changes"),
  releaseDate: timestamp("release_date", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// @epic-4.7-widget-library: Widget Collections (Bundles)
export const widgetCollections = pgTable("widget_collections", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  widgetIds: jsonb("widget_ids").notNull(), // Array of widget IDs
  isGlobal: boolean("is_global").default(false), // System collection
  isPublic: boolean("is_public").default(false), // Publicly available
  category: text("category"), // "Starter Pack", "Analytics Suite", "Team Collaboration"
  thumbnail: text("thumbnail"),
  installCount: integer("install_count").default(0),
  tags: jsonb("tags"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-4.7-widget-library: Review Helpfulness Tracking
export const reviewHelpfulness = pgTable("review_helpfulness", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  reviewId: text("review_id")
    .notNull()
    .references(() => widgetReviews.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  isHelpful: boolean("is_helpful").notNull(), // true = helpful, false = not helpful
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// @epic-5.1-project-notes: Project Notes for collaborative documentation
export const projectNotes = pgTable("project_notes", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"), // Rich text JSON (TipTap/ProseMirror format)
  
  // Metadata
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  lastEditedBy: text("last_edited_by")
    .references(() => users.id, { onDelete: "set null" }),
  
  // Organization
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
  tags: jsonb("tags"), // Array of tag strings
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-5.1-project-notes: Note Version History for tracking changes
export const noteVersions = pgTable("note_versions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  noteId: text("note_id")
    .notNull()
    .references(() => projectNotes.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // Snapshot of content at this version
  editedBy: text("edited_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  versionNumber: integer("version_number").notNull(),
  changeDescription: text("change_description"), // Optional description of what changed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// @epic-5.1-project-notes: Note Comments for discussions
export const noteComments = pgTable("note_comments", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  noteId: text("note_id")
    .notNull()
    .references(() => projectNotes.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 🎨 Backlog Themes Table - For organizing backlog tasks by theme/category
export const backlogThemes = pgTable("backlog_themes", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // Relations
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  
  // Theme Info
  name: text("name").notNull(), // e.g., "User Authentication", "Payment Integration"
  description: text("description"), // Optional description
  color: text("color").default("#6366f1"), // Hex color code
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Workspace theme policies for enforcing branding
export const workspaceThemePolicies = pgTable("workspace_theme_policies", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  enforceTheme: boolean("enforce_theme").default(false), // Force users to use workspace theme
  allowedThemeIds: jsonb("allowed_theme_ids"), // Array of theme IDs users can choose from
  defaultThemeId: text("default_theme_id").references(() => customThemes.id),
  allowUserThemes: boolean("allow_user_themes").default(true), // Users can create custom themes
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Theme usage analytics
export const themeUsageAnalytics = pgTable("theme_usage_analytics", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  themeId: text("theme_id")
    .notNull()
    .references(() => customThemes.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activeTime: integer("active_time").default(0), // Time in milliseconds
  lastUsed: timestamp("last_used", { withTimezone: true }).defaultNow(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Phase 1: Team Awareness - User Activity Sessions
export const userActivitySessions = pgTable("user_activity_sessions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  currentTaskId: text("current_task_id")
    .references(() => tasks.id, { onDelete: "set null" }),
  currentProjectId: text("current_project_id")
    .references(() => projects.id, { onDelete: "set null" }),
  activityType: text("activity_type"), // 'editing', 'viewing', 'commenting'
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  lastActive: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Phase 1: Team Status Board
export const userStatus = pgTable("user_status", {
  userEmail: text("user_email")
    .primaryKey()
    .references(() => users.email, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'available', 'in_meeting', 'focus_mode', 'away'
  statusMessage: text("status_message"),
  emoji: text("emoji"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Phase 1: Kudos/Recognition System
export const kudos = pgTable("kudos", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  fromUserEmail: text("from_user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  toUserEmail: text("to_user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  emoji: text("emoji"),
  category: text("category"), // 'helpful', 'great_work', 'team_player', 'creative', 'leadership'
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Phase 1: Team Mood Tracker
export const moodCheckins = pgTable("mood_checkins", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  mood: text("mood").notNull(), // 'great', 'good', 'okay', 'bad', 'stressed'
  notes: text("notes"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const moodAnalytics = pgTable("mood_analytics", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  moodDistribution: jsonb("mood_distribution").notNull(), // { great: 5, good: 10, okay: 3, bad: 1, stressed: 2 }
  averageScore: numeric("average_score", { precision: 3, scale: 2 }), // 1.00 to 5.00
  totalCheckins: integer("total_checkins").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Phase 1: Skill Matrix
export const userSkills = pgTable("user_skills", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  proficiencyLevel: integer("proficiency_level").notNull(), // 1-5 scale
  isVerified: boolean("is_verified").default(false).notNull(),
  endorsedBy: jsonb("endorsed_by").$type<string[]>().default([]), // Array of user emails
  yearsOfExperience: integer("years_of_experience"),
  lastUsed: timestamp("last_used", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Phase 2: Smart Notifications - Digest System
export const digestSettings = pgTable("digest_settings", {
  userEmail: text("user_email")
    .primaryKey()
    .references(() => users.email, { onDelete: "cascade" }),
  dailyEnabled: boolean("daily_enabled").default(true).notNull(),
  dailyTime: text("daily_time").default("09:00"), // HH:MM format
  weeklyEnabled: boolean("weekly_enabled").default(true).notNull(),
  weeklyDay: integer("weekly_day").default(1), // 0=Sunday, 1=Monday, etc.
  digestSections: jsonb("digest_sections").$type<string[]>().default(["tasks", "mentions", "comments", "kudos"]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const digestMetrics = pgTable("digest_metrics", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  commentsReceived: integer("comments_received").default(0),
  mentionsCount: integer("mentions_count").default(0),
  kudosReceived: integer("kudos_received").default(0),
  content: jsonb("content"), // Full digest content
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Phase 2: Smart Notifications - Alert Rules
export const alertRules = pgTable("alert_rules", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  name: text("name").notNull(),
  conditionType: text("condition_type").notNull(), // 'project_progress', 'task_overdue', 'mention', 'keyword'
  conditionConfig: jsonb("condition_config").notNull(), // Condition parameters
  notificationChannels: jsonb("notification_channels").$type<string[]>().default(["in_app"]), // ['in_app', 'email', 'slack', 'teams']
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Phase 2: Smart Notifications - External Integrations
export const integrations = pgTable("integrations", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  integrationType: text("integration_type").notNull(), // 'slack', 'teams', 'discord'
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  channelId: text("channel_id"),
  channelName: text("channel_name"),
  webhookUrl: text("webhook_url"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// @epic-2.2-realtime: User presence tracking for real-time collaboration
export const userPresence = pgTable("user_presence", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("offline"), // 'online' | 'offline' | 'away' | 'busy'
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  currentPage: text("current_page"),
  socketId: text("socket_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Help & Documentation System
export const helpArticles = pgTable("help_articles", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  content: text("content").notNull(), // Markdown content
  category: helpArticleCategory().notNull(),
  difficulty: helpArticleDifficulty().default('beginner'),
  contentType: helpContentType().default('article'),
  readTime: integer("read_time").default(5), // in minutes
  rating: integer("rating").default(0), // average rating * 10 (e.g., 45 = 4.5)
  ratingCount: integer("rating_count").default(0),
  views: integer("views").default(0),
  helpful: integer("helpful").default(0), // count of helpful votes
  notHelpful: integer("not_helpful").default(0),
  tags: jsonb("tags").default([]), // array of tag strings
  metadata: jsonb("metadata").default({}), // additional data like video URL, thumbnail, etc.
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const helpFAQs = pgTable("help_faqs", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(), // Markdown supported
  category: text("category").notNull(),
  helpful: integer("helpful").default(0),
  notHelpful: integer("not_helpful").default(0),
  tags: jsonb("tags").default([]),
  relatedArticleIds: jsonb("related_article_ids").default([]), // array of article IDs
  isPublished: boolean("is_published").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const helpArticleViews = pgTable("help_article_views", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  articleId: text("article_id")
    .notNull()
    .references(() => helpArticles.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"), // for anonymous tracking
  viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
  timeSpent: integer("time_spent").default(0), // in seconds
  completed: boolean("completed").default(false), // read to end
});

export const helpSearchQueries = pgTable("help_search_queries", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  query: text("query").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  resultsCount: integer("results_count").default(0),
  clickedArticleId: text("clicked_article_id").references(() => helpArticles.id, { onDelete: "set null" }),
  searchedAt: timestamp("searched_at", { withTimezone: true }).defaultNow().notNull(),
});

export const helpArticleComments = pgTable("help_article_comments", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  articleId: text("article_id")
    .notNull()
    .references(() => helpArticles.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: text("parent_id").references(() => helpArticleComments.id, { onDelete: "cascade" }), // For nested comments
  helpful: integer("helpful").default(0),
  notHelpful: integer("not_helpful").default(0),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Channel tables (from introspected database schema)
const channel = pgTable("channel", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id").notNull(),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  createdBy: varchar("created_by"),
  isArchived: boolean("is_archived").default(false),
}, (table) => ({
  // ⚡ Performance indexes for channel queries
  workspaceIdIdx: index("idx_channel_workspace_id").on(table.workspaceId),
  isArchivedIdx: index("idx_channel_is_archived").on(table.isArchived),
  createdByIdx: index("idx_channel_created_by").on(table.createdBy),
}));

const channelMembership = pgTable("channel_membership", {
  id: text("id").primaryKey().notNull(),
  channelId: text("channel_id").notNull(),
  userEmail: text("user_email").notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  userId: varchar("user_id"),
}, (table) => ({
  // ⚡ Performance indexes for channel membership queries
  channelIdIdx: index("idx_channel_membership_channel_id").on(table.channelId),
  userEmailIdx: index("idx_channel_membership_user_email").on(table.userEmail),
  userIdIdx: index("idx_channel_membership_user_id").on(table.userId),
  // Composite index for membership checks
  channelUserIdx: index("idx_channel_membership_channel_user").on(table.channelId, table.userEmail),
}));

export const favorites = pgTable("favorites", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: favoriteType().default("user").notNull(),
  favoriteUserId: text("favorite_user_id").references(() => users.id, { onDelete: "cascade" }),
  favoriteChannelId: text("favorite_channel_id").references(() => channel.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index("idx_favorites_user_id").on(table.userId),
  favoriteUserIdx: index("idx_favorites_favorite_user_id").on(table.favoriteUserId),
  favoriteChannelIdx: index("idx_favorites_favorite_channel_id").on(table.favoriteChannelId),
}));

// Health System Tables - Phase 2.3.8
export const projectHealthTable = pgTable("project_health", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(50), // 0-100
  status: text("status").notNull().default("good"), // excellent | good | fair | critical
  trend: text("trend").notNull().default("stable"), // improving | stable | declining
  completionRate: integer("completion_rate").default(0),
  timelineHealth: integer("timeline_health").default(0),
  taskHealth: integer("task_health").default(0),
  resourceAllocation: integer("resource_allocation").default(0),
  riskLevel: integer("risk_level").default(0),
  metadata: jsonb("metadata").default({}), // additional metrics
  cachedAt: timestamp("cached_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const healthHistoryTable = pgTable("health_history", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  status: text("status").notNull(),
  completionRate: integer("completion_rate"),
  timelineHealth: integer("timeline_health"),
  taskHealth: integer("task_health"),
  resourceAllocation: integer("resource_allocation"),
  riskLevel: integer("risk_level"),
  metadata: jsonb("metadata").default({}),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const healthRecommendationsTable = pgTable("health_recommendations", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(), // high | medium | low
  category: text("category").notNull(), // performance | timeline | resources | quality | risk
  actionItems: jsonb("action_items").default([]),
  estimatedImpact: integer("estimated_impact"), // 0-100
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const healthAlertsTable = pgTable("health_alerts", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // warning | critical | info
  message: text("message").notNull(),
  category: text("category").notNull(),
  severity: integer("severity").default(1), // 1-5
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================================
// COLLABORATION TABLES - Phase 2.4
// ============================================================================

/**
 * Conversations Table
 * Stores conversation/chat room records
 * Supports general team chats, task-specific discussions, and direct messages
 */
export const conversationsTable = pgTable("conversations", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // Relations
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .references(() => users.id, { onDelete: "set null" }),
  
  // Content
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("general"), // general | task-specific | direct
  
  // Metadata
  isArchived: boolean("is_archived").default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Messages Table
 * Stores all messages in conversations
 * Supports edit history via editedAt timestamp
 */
export const messagesTable = pgTable(
  "messages",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    
    // Relations
    channelId: text("channel_id")
      .notNull()
      .references(() => channelTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: text("thread_id"),
    parentMessageId: text("parent_message_id"),
    
    // Content
    content: text("content").notNull(),
    messageType: text("message_type").default("text").notNull(),
    mentions: jsonb("mentions").$type<string[]>().default([]),
    attachments: jsonb("attachments").default([]),
    reactions: jsonb("reactions").default({}),
    
    // Metadata
    isPinned: boolean("is_pinned").default(false),
    isEdited: boolean("is_edited").default(false),
    isDeleted: boolean("is_deleted").default(false),
    deliveryStatus: text("delivery_status").default("sent"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    channelIdx: index("idx_messages_channel_id").on(table.channelId),
    createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
    threadIdx: index("idx_messages_thread_id").on(table.threadId),
  }),
);

/**
 * Mentions Table
 * Stores user mentions in messages
 * Triggers notifications when user is mentioned
 */
export const mentionsTable = pgTable(
  "mentions",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    
    // Relations
    messageId: text("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    mentionedUserId: text("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Metadata
    readAt: timestamp("read_at", { withTimezone: true }),
    
    // Timestamps
    mentionedAt: timestamp("mentioned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: sql`create index mentions_user_idx on mentions(mentioned_user_id)`,
    messageIdx: sql`create index mentions_message_idx on mentions(message_id)`,
  })
);

/**
 * Read Receipts Table
 * Tracks which users have read which messages
 * Used for read status indicators in chat
 */
export const readReceiptsTable = pgTable(
  "read_receipts",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    
    // Relations
    messageId: text("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userEmail: text("user_email")
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    
    // Timestamps
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    messageUserIdx: sql`create unique index read_receipts_message_user_idx on read_receipts(message_id, user_id)`,
    userIdx: sql`create index read_receipts_user_idx on read_receipts(user_id)`,
    messageIdx: sql`create index read_receipts_message_idx on read_receipts(message_id)`,
  })
);

/**
 * Reactions Table
 * Stores emoji reactions to messages
 * Unique constraint prevents duplicate reactions from same user
 */
export const reactionsTable = pgTable(
  "reactions",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    
    // Relations
    messageId: text("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Content
    emoji: text("emoji").notNull(),
    
    // Timestamps
    reactedAt: timestamp("reacted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueReaction: sql`unique(message_id, user_id, emoji)`,
    messageIdx: sql`create index reactions_message_idx on reactions(message_id)`,
    userIdx: sql`create index reactions_user_idx on reactions(user_id)`,
  })
);

/**
 * Notification Preferences Table
 * Stores user notification settings
 * Supports quiet hours and frequency preferences
 */
export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    
    // Relations
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Message notifications
    mentionsEnabled: boolean("mentions_enabled").default(true).notNull(),
    directMessagesEnabled: boolean("direct_messages_enabled").default(true).notNull(),
    conversationUpdatesEnabled: boolean("conversation_updates_enabled").default(false).notNull(),
    
    // Activity notifications
    activityEnabled: boolean("activity_enabled").default(true).notNull(),
    dailyDigestEnabled: boolean("daily_digest_enabled").default(true).notNull(),
    
    // Frequency settings
    notificationFrequency: text("notification_frequency")
      .default("instant")
      .notNull(), // instant | daily | weekly | never
    
    // Quiet hours (HH:MM format, 24-hour)
    quietHoursStart: text("quiet_hours_start"), // e.g., "22:00"
    quietHoursEnd: text("quiet_hours_end"), // e.g., "08:00"
    
    // Timestamps
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: sql`create index notification_pref_user_idx on notification_preferences(user_id)`,
  })
);

// Compatibility aliases
export const userTable = users;
export const sessionTable = sessions;
export const workspaceTable = workspaces;
export const workspaceUserTable = workspaceMembers;
export const workspaceInvitationTable = workspaceInvites; // Alias for workspace invitations
export const projectTable = projects;
export const taskTable = tasks;
export const activityTable = activities;
export const notificationTable = notifications;
export const timeEntryTable = timeEntries;
export const labelTable = label;
export const roleAssignmentTable = roleAssignment;
export const teamTable = teams;
export const teamMemberTable = teamMembers;
export const teamMessagesTable = teamMessages;
export const teamMessageReactionsTable = teamMessageReactions;
export const teamMessageReadStatusTable = teamMessageReadStatus;
export const statusColumnTable = statusColumns;
export const roleHistoryTable = roleHistory;
export const taskDependencyTable = taskDependencies;
export const customPermissionTable = customPermissions;
export const departmentTable = departments;
export const attachmentTable = attachments;
export const userPresenceTable = userPresence;
export const channelTable = channel;
export const channelMembershipTable = channelMembership;
export const favoritesTable = favorites;
export const projectHealthTable_alias = projectHealthTable;
export const healthHistoryTable_alias = healthHistoryTable;
export const healthRecommendationsTable_alias = healthRecommendationsTable;
export const healthAlertsTable_alias = healthAlertsTable;
export const backlogThemesTable = backlogThemes;

// Phase 1.3: Milestones & Automation Aliases
export const milestoneTable = milestone;
export const integrationConnectionTable = integrationConnection;
export const webhookEndpointTable = webhookEndpoint;
export const apiKeyTable = apiKey;
export const automationRuleTable = automationRule;
export const workflowTemplateTable = workflowTemplate;
export const workflowInstanceTable = workflowInstance;
export const workflowExecutionTable = workflowExecution;
export const visualWorkflowTable = visualWorkflow;
export const visualWorkflowTemplateTable = visualWorkflowTemplate;
export const visualWorkflowExecutionTable = visualWorkflowExecution;
export const workflowNodeTypeTable = workflowNodeTypes;
export const emailTemplatesTable = emailTemplates;
export const settingsAuditLogTable = settingsAuditLog;
export const userSettingsTable = userSettings;
export const settingsPresetTable = settingsPreset;
export const userProfileTable = userProfile;
export const userExperienceTable = userExperience;
export const userEducationTable = userEducation;
export const userSkillTable = userSkill;
export const userConnectionTable = userConnection;
export const directMessageConversationsTable = directMessageConversations;
export const customThemesTable = customThemes;
export const dashboardTemplatesTable = dashboardTemplates;
export const dashboardWidgetsTable = dashboardWidgets;
export const userWidgetInstancesTable = userWidgetInstances;
export const userDashboardsTable = userDashboards;
export const widgetRatingsTable = widgetRatings;
export const widgetReviewsTable = widgetReviews;
export const widgetAnalyticsTable = widgetAnalytics;
export const widgetVersionsTable = widgetVersions;
export const widgetCollectionsTable = widgetCollections;
export const reviewHelpfulnessTable = reviewHelpfulness;
export const projectNotesTable = projectNotes;
export const noteVersionsTable = noteVersions;
export const noteCommentsTable = noteComments;
export const workspaceThemePoliciesTable = workspaceThemePolicies;
export const themeUsageAnalyticsTable = themeUsageAnalytics;

// Phase 2.4: Collaboration Aliases
export const conversationTable = conversationsTable;
export const messageTable = messagesTable;
export const mentionTable = mentionsTable;
export const reactionTable = reactionsTable;
export const notificationPreferenceTable = notificationPreferencesTable;

// ============================================================================
// PROJECT TEMPLATES - For profession-based project scaffolding
// ============================================================================

/**
 * Project Templates Table
 * Stores reusable project templates for different professions and industries
 */
export const projectTemplates = pgTable("project_templates", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // Template Info
  name: text("name").notNull(),
  description: text("description").notNull(),
  profession: text("profession").notNull(), // e.g., "Software Engineer", "Marketing Manager"
  industry: text("industry").notNull(), // e.g., "Technology & Software Development", "Marketing & Communications"
  category: text("category"), // For grouping related templates
  
  // Template Configuration
  icon: text("icon"), // Icon identifier for UI
  color: text("color").default('#6366f1'),
  estimatedDuration: integer("estimated_duration"), // in days
  difficulty: text("difficulty").default('intermediate'), // beginner | intermediate | advanced
  
  // Usage & Popularity
  usageCount: integer("usage_count").default(0),
  rating: integer("rating").default(0), // average rating * 10 (e.g., 45 = 4.5)
  ratingCount: integer("rating_count").default(0),
  
  // Metadata
  tags: jsonb("tags").default([]), // array of tag strings for search/filtering
  settings: jsonb("settings").default({}), // template-specific settings
  isPublic: boolean("is_public").default(true),
  isOfficial: boolean("is_official").default(false), // created by Meridian team
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Template Tasks Table
 * Stores tasks that belong to project templates
 */
export const templateTasks = pgTable("template_tasks", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // Relations
  templateId: text("template_id")
    .notNull()
    .references(() => projectTemplates.id, { onDelete: "cascade" }),
  
  // Task Info
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").default(0).notNull(), // order in the template
  
  // Task Configuration
  priority: priority().default('medium'),
  estimatedHours: integer("estimated_hours"),
  suggestedAssigneeRole: text("suggested_assignee_role"), // e.g., "Team Lead", "Member"
  
  // Timing (relative to project start)
  relativeStartDay: integer("relative_start_day"), // days after project start
  relativeDueDay: integer("relative_due_day"), // days after project start
  
  // Metadata
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Template Subtasks Table
 * Stores subtasks that belong to template tasks
 */
export const templateSubtasks = pgTable("template_subtasks", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // Relations
  templateTaskId: text("template_task_id")
    .notNull()
    .references(() => templateTasks.id, { onDelete: "cascade" }),
  
  // Subtask Info
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").default(0).notNull(), // order within parent task
  
  // Subtask Configuration
  estimatedHours: integer("estimated_hours"),
  suggestedAssigneeRole: text("suggested_assignee_role"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Template Dependencies Table
 * Stores task dependencies within templates
 */
export const templateDependencies = pgTable("template_dependencies", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // Relations
  dependentTaskId: text("dependent_task_id")
    .notNull()
    .references(() => templateTasks.id, { onDelete: "cascade" }),
  requiredTaskId: text("required_task_id")
    .notNull()
    .references(() => templateTasks.id, { onDelete: "cascade" }),
  
  // Dependency Configuration
  type: text("type").notNull().default("blocks"), // 'blocks' | 'blocked_by'
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Template Aliases
export const projectTemplateTable = projectTemplates;
export const templateTaskTable = templateTasks;
export const templateSubtaskTable = templateSubtasks;
export const templateDependencyTable = templateDependencies;
export const projectMemberTable = projectMembers;
export const projectSettingsTable = projectSettings;
// userPreferencesExtendedTable export moved below after definition

// Message and Thread Tables
export const threadNotificationTable = pgTable('thread_notification', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  threadId: text('thread_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: text('message_id').references(() => messagesTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const threadParticipantTable = pgTable('thread_participant', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  threadId: text('thread_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
});

export const messageBookmarkTable = pgTable('message_bookmark', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  messageId: text('message_id').notNull().references(() => messagesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Channel Tables
export const channelAuditLogTable = pgTable('channel_audit_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  channelId: text('channel_id').notNull().references(() => channelTable.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  actorId: text('actor_id').references(() => users.id),
  targetId: text('target_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const channelInvitationTable = pgTable('channel_invitation', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  channelId: text('channel_id').notNull().references(() => channelTable.id, { onDelete: 'cascade' }),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  invitedUserId: text('invited_user_id').references(() => users.id),
  invitedEmail: text('invited_email'),
  status: text('status').default('pending').notNull(), // pending, accepted, declined, expired
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  declinedAt: timestamp('declined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/** Legacy `/api/call` scheduling rows (simple voice/video-style calls). */
export const callTable = pgTable("calls", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description").default(""),
  organizerId: text("organizer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true, mode: "date" }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true, mode: "date" }),
  roomId: text("room_id").notNull(),
  participants: jsonb("participants").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// User Preferences Table - Store user-specific settings like pinned projects
export const userPreferencesTable = pgTable('user_preferences', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  pinnedProjects: jsonb('pinned_projects').default([]), // Array of project IDs
  dashboardLayout: jsonb('dashboard_layout').default({}), // User's custom dashboard layout
  theme: text('theme').default('system'), // light, dark, system
  notifications: jsonb('notifications').default({}), // Notification preferences
  settings: jsonb('settings').default({}), // Other user settings
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Extended User Preferences Table - Store additional user preferences by type
export const userPreferencesExtended = pgTable('user_preferences_extended', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  preferenceType: text('preference_type').notNull(), // 'calendar', 'notification-channels', 'quiet-hours', 'work-schedule', etc.
  preferenceData: text('preference_data').notNull(), // JSON string of preference data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userPreferenceIdx: index("user_preferences_extended_user_preference_idx").on(table.userId, table.preferenceType),
}));

// Export alias for userPreferencesExtended
export const userPreferencesExtendedTable = userPreferencesExtended;

// @epic-3.4-teams: Calendar Events Table
export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  type: eventType().notNull().default('meeting'),
  status: eventStatus().notNull().default('scheduled'),
  
  // Timing
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  allDay: boolean('all_day').default(false),
  timezone: text('timezone').default('UTC'),
  
  // Relationships
  teamId: text('team_id'), // Optional: link to team/project
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Event details
  priority: priority().default('medium'),
  location: text('location'), // Physical or virtual location
  meetingLink: text('meeting_link'), // Video conference link
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours'),
  
  // Metadata
  color: text('color').default('#3b82f6'),
  attachments: jsonb('attachments').default([]), // File attachments
  metadata: jsonb('metadata').default({}), // Additional custom data
  
  // Recurring
  isRecurring: boolean('is_recurring').default(false),
  recurringEventId: text('recurring_event_id'), // Link to parent recurring event
  
  // Reminders
  reminderMinutes: integer('reminder_minutes').default(15), // Minutes before event to remind
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
});

// @epic-3.4-teams: Event Attendees (Many-to-Many)
export const eventAttendees = pgTable('event_attendees', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  eventId: text('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Attendee status
  status: attendeeStatus().notNull().default('pending'),
  isOrganizer: boolean('is_organizer').default(false),
  isOptional: boolean('is_optional').default(false),
  
  // Notifications
  notified: boolean('notified').default(false),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  
  // Response tracking
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  responseNote: text('response_note'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// @epic-3.4-teams: Recurring Event Patterns
export const recurringPatterns = pgTable('recurring_patterns', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  eventId: text('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }).unique(),
  
  // Pattern configuration
  frequency: recurringFrequency().notNull().default('weekly'),
  interval: integer('interval').default(1), // Every N days/weeks/months
  
  // End conditions
  endDate: timestamp('end_date', { withTimezone: true }),
  occurrences: integer('occurrences'), // Total number of occurrences
  
  // Weekly specific
  weekdays: jsonb('weekdays').default([]), // Array of weekday numbers (0-6, Sunday=0)
  
  // Monthly specific
  dayOfMonth: integer('day_of_month'), // Specific day of month (1-31)
  weekOfMonth: integer('week_of_month'), // First, second, third, fourth, last week
  
  // Custom pattern
  customPattern: jsonb('custom_pattern').default({}), // For custom recurring patterns
  
  // Exceptions
  exceptionDates: jsonb('exception_dates').default([]), // Dates to skip
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Export all feature tables (Security, Executive, Automation)
export * from "./schema-features";

// Export RBAC unified tables
export * from "./schema/rbac-unified";

// Export file management tables
export * from "./schema/files";

// Export goal setting & OKR tables
export * from "./schema/goals";

// Export gamification & motivation tables
export * from "./schema/gamification";

// Export billing tables
export * from "../billing/schema";

// Export team awareness tables
export * from "./schema/team-awareness";

// Smart profile (views, suggestions, availability, collaborators, statistics)
export * from "./schema/smart-profile";
