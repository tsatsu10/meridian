import { pgTable, unique, serial, varchar, timestamp, index, foreignKey, text, jsonb, boolean, integer, bigint, uniqueIndex, date, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const channelType = pgEnum("channel_type", ['public', 'private', 'direct', 'group'])
export const messageType = pgEnum("message_type", ['text', 'file', 'image', 'system', 'announcement'])
export const notificationType = pgEnum("notification_type", ['task', 'message', 'mention', 'system'])
export const presenceStatus = pgEnum("presence_status", ['online', 'away', 'busy', 'offline'])
export const priority = pgEnum("priority", ['low', 'medium', 'high', 'urgent'])
export const taskStatus = pgEnum("task_status", ['todo', 'in_progress', 'done'])
export const userRole = pgEnum("user_role", ['admin', 'manager', 'member', 'viewer'])
export const workflowStatus = pgEnum("workflow_status", ['draft', 'active', 'paused', 'completed', 'failed'])


export const schemaMigrations = pgTable("schema_migrations", {
	id: serial().primaryKey().notNull(),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	executedAt: timestamp("executed_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	checksum: varchar({ length: 64 }),
}, (table) => [
	unique("schema_migrations_migration_name_key").on(table.migrationName),
]);

export const projects = pgTable("projects", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	workspaceId: text("workspace_id").notNull(),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text(),
	color: text().default('#6366f1'),
	icon: text(),
	status: text().default('active'),
	priority: priority().default('medium'),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	settings: jsonb().default({}),
	isArchived: boolean("is_archived").default(false),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_projects_owner_id").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("idx_projects_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "projects_workspace_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "projects_owner_id_fkey"
		}).onDelete("cascade"),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const workspaces = pgTable("workspaces", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text(),
	logo: text(),
	settings: jsonb().default({}),
	isActive: boolean("is_active").default(true),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_workspaces_owner_id").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "workspaces_owner_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	password: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	avatar: text(),
	timezone: text().default('UTC'),
	language: text().default('en'),
	role: userRole().default('member'),
	isEmailVerified: boolean("is_email_verified").default(false),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_key").on(table.email),
]);

export const tasks = pgTable("tasks", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: taskStatus().default('todo').notNull(),
	projectId: text("project_id").notNull(),
	assignedTo: text("assigned_to"),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	priority: priority().default('medium'),
	position: integer().default(0),
	parentTaskId: text("parent_task_id"),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	estimatedHours: integer("estimated_hours"),
	actualHours: integer("actual_hours"),
	tags: jsonb().default([]),
	metadata: jsonb().default({}),
	isArchived: boolean("is_archived").default(false),
}, (table) => [
	index("idx_tasks_assigned_to").using("btree", table.assignedTo.asc().nullsLast().op("text_ops")),
	index("idx_tasks_created_by").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("idx_tasks_project_id").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tasks_assigned_to_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "tasks_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentTaskId],
			foreignColumns: [table.id],
			name: "tasks_parent_task_id_fkey"
		}).onDelete("cascade"),
]);

export const workspaceMembers = pgTable("workspace_members", {
	id: text().default(concat(\'wm_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	workspaceId: text("workspace_id").notNull(),
	userId: text("user_id").notNull(),
	role: userRole().default('member'),
	permissions: jsonb().default([]),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	invitedBy: text("invited_by"),
}, (table) => [
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "workspace_members_workspace_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workspace_members_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "workspace_members_invited_by_fkey"
		}),
	unique("workspace_members_workspace_id_user_id_key").on(table.workspaceId, table.userId),
]);

export const channels = pgTable("channels", {
	id: text().default(concat(\'ch_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	type: channelType().default('public'),
	workspaceId: text("workspace_id").notNull(),
	createdBy: text("created_by").notNull(),
	topic: text(),
	isArchived: boolean("is_archived").default(false),
	isReadOnly: boolean("is_read_only").default(false),
	settings: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_channels_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "channels_workspace_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "channels_created_by_fkey"
		}).onDelete("cascade"),
	unique("channels_workspace_id_slug_key").on(table.slug, table.workspaceId),
]);

export const channelMembers = pgTable("channel_members", {
	id: text().default(concat(\'cm_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	channelId: text("channel_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member'),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastReadAt: timestamp("last_read_at", { withTimezone: true, mode: 'string' }),
	notificationSettings: jsonb("notification_settings").default({}),
}, (table) => [
	index("idx_channel_members_channel_id").using("btree", table.channelId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [channels.id],
			name: "channel_members_channel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "channel_members_user_id_fkey"
		}).onDelete("cascade"),
	unique("channel_members_channel_id_user_id_key").on(table.channelId, table.userId),
]);

export const messages = pgTable("messages", {
	id: text().default(concat(\'msg_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	content: text().notNull(),
	type: messageType().default('text'),
	channelId: text("channel_id").notNull(),
	userId: text("user_id").notNull(),
	threadId: text("thread_id"),
	parentMessageId: text("parent_message_id"),
	mentions: jsonb().default([]),
	attachments: jsonb().default([]),
	reactions: jsonb().default({}),
	isPinned: boolean("is_pinned").default(false),
	isEdited: boolean("is_edited").default(false),
	isDeleted: boolean("is_deleted").default(false),
	deliveryStatus: text("delivery_status").default('sent'),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_messages_channel_id").using("btree", table.channelId.asc().nullsLast().op("text_ops")),
	index("idx_messages_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_messages_thread_id").using("btree", table.threadId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [channels.id],
			name: "messages_channel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [table.id],
			name: "messages_thread_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentMessageId],
			foreignColumns: [table.id],
			name: "messages_parent_message_id_fkey"
		}).onDelete("cascade"),
]);

export const teams = pgTable("teams", {
	id: text().default(concat(\'tm_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	workspaceId: text("workspace_id").notNull(),
	leaderId: text("leader_id"),
	color: text().default('#6366f1'),
	settings: jsonb().default({}),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_teams_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "teams_workspace_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leaderId],
			foreignColumns: [users.id],
			name: "teams_leader_id_fkey"
		}).onDelete("set null"),
]);

export const notifications = pgTable("notifications", {
	id: text().default(concat(\'ntf_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: notificationType().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	data: jsonb().default({}),
	isRead: boolean("is_read").default(false),
	priority: priority().default('medium'),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notifications_unread").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.isRead.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(is_read = false)`),
	index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userPresence = pgTable("user_presence", {
	id: text().default(concat(\'prs_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	userId: text("user_id").notNull(),
	workspaceId: text("workspace_id").notNull(),
	status: presenceStatus().default('offline'),
	customStatusMessage: text("custom_status_message"),
	customStatusEmoji: text("custom_status_emoji"),
	statusExpiresAt: timestamp("status_expires_at", { withTimezone: true, mode: 'string' }),
	isStatusVisible: boolean("is_status_visible").default(true),
	lastActivityType: text("last_activity_type"),
	lastActivityDetails: text("last_activity_details"),
	timezone: text().default('UTC'),
	workingHours: jsonb("working_hours"),
	doNotDisturbUntil: timestamp("do_not_disturb_until", { withTimezone: true, mode: 'string' }),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_presence_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(status <> 'offline'::presence_status)`),
	index("idx_user_presence_workspace_status").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_presence_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "user_presence_workspace_id_fkey"
		}).onDelete("cascade"),
	unique("user_presence_user_id_key").on(table.userId),
]);

export const settings = pgTable("settings", {
	id: text().default(concat(\'set_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	key: text().notNull(),
	value: jsonb(),
	type: text().default('user'),
	entityId: text("entity_id"),
	category: text().default('general'),
	isPublic: boolean("is_public").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_settings_entity_key").using("btree", table.entityId.asc().nullsLast().op("text_ops"), table.key.asc().nullsLast().op("text_ops")),
]);

export const workflows = pgTable("workflows", {
	id: text().default(concat(\'wf_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	workspaceId: text("workspace_id").notNull(),
	createdBy: text("created_by").notNull(),
	status: workflowStatus().default('draft'),
	isActive: boolean("is_active").default(true),
	configuration: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_workflows_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "workflows_workspace_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "workflows_created_by_fkey"
		}).onDelete("cascade"),
]);

export const activities = pgTable("activities", {
	id: text().default(concat(\'act_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	userId: text("user_id"),
	workspaceId: text("workspace_id").notNull(),
	type: text().notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: text("entity_id"),
	metadata: jsonb().default({}),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_activities_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_activities_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activities_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "activities_workspace_id_fkey"
		}).onDelete("cascade"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: text().default(concat(\'aud_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	userId: text("user_id"),
	workspaceId: text("workspace_id"),
	action: text().notNull(),
	resource: text().notNull(),
	resourceId: text("resource_id"),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	sessionId: text("session_id"),
	severity: text().default('info'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_audit_logs_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "audit_logs_workspace_id_fkey"
		}).onDelete("set null"),
]);

export const message = pgTable("message", {
	id: text().primaryKey().notNull(),
	content: text().notNull(),
	channelId: text("channel_id"),
	userEmail: text("user_email").notNull(),
	workspaceId: text("workspace_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	senderId: varchar("sender_id"),
}, (table) => [
	index("idx_message_composite").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_message_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_message_sender_id").using("btree", table.senderId.asc().nullsLast().op("text_ops")),
	index("idx_message_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
]);

export const task = pgTable("task", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: text().default('todo'),
	priority: text().default('medium'),
	projectId: text("project_id").notNull(),
	assignedTo: text("assigned_to"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	parentId: varchar("parent_id", { length: 255 }),
	assignedTeamId: varchar("assigned_team_id", { length: 255 }),
	number: integer(),
	position: integer().default(0),
	assigneeEmail: varchar("assignee_email", { length: 255 }),
}, (table) => [
	index("idx_task_assigned_to").using("btree", table.assignedTo.asc().nullsLast().op("text_ops")),
	index("idx_task_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_task_due_date").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_task_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const channel = pgTable("channel", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	workspaceId: text("workspace_id").notNull(),
	isPrivate: boolean("is_private").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: varchar("created_by"),
	isArchived: boolean("is_archived").default(false),
});

export const roleAssignment = pgTable("role_assignment", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	role: text().notNull(),
	workspaceId: text("workspace_id"),
	assignedBy: text("assigned_by"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	projectIds: jsonb("project_ids"),
	departmentIds: jsonb("department_ids"),
	reason: text(),
	restrictions: jsonb(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_role_assignment_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
]);

export const statusColumn = pgTable("status_column", {
	id: text().default(concat(\'col_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	color: text().default('#3b82f6'),
	position: integer().default(0),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const team = pgTable("team", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	workspaceId: text("workspace_id").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	type: text().default('general'),
	projectId: text("project_id"),
	color: text().default('#3B82F6'),
	settings: jsonb().default({}),
	memberCount: integer("member_count").default(0),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("team_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("team_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("team_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
]);

export const activity = pgTable("activity", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	workspaceId: text("workspace_id"),
	projectId: text("project_id"),
	taskId: text("task_id"),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	details: jsonb(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userEmail: varchar("user_email", { length: 255 }),
	type: varchar({ length: 255 }),
	content: text(),
}, (table) => [
	index("idx_activity_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_activity_project_id").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("idx_activity_task_id").using("btree", table.taskId.asc().nullsLast().op("text_ops")),
	index("idx_activity_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
]);

export const timeEntry = pgTable("time_entry", {
	id: text().default(concat(\'te_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	taskId: text("task_id").notNull(),
	userId: text("user_id").notNull(),
	description: text(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	duration: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const notification = pgTable("notification", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	type: text().default('info'),
	read: boolean().default(false),
	priority: text().default('normal'),
	data: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userEmail: varchar("user_email", { length: 255 }),
	digestedAt: timestamp("digested_at", { mode: 'string' }),
	isRead: boolean("is_read").default(false),
	isPinned: boolean("is_pinned").default(false),
	resourceId: text("resource_id"),
	resourceType: text("resource_type"),
}, (table) => [
	index("idx_notification_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_notification_read").using("btree", table.read.asc().nullsLast().op("bool_ops")),
]);

export const workspaceUser = pgTable("workspace_user", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	workspaceId: text("workspace_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member'),
	invitedAt: timestamp("invited_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	joinedAt: timestamp("joined_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	userEmail: varchar("user_email"),
}, (table) => [
	index("idx_workspace_user_composite").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.userEmail.asc().nullsLast().op("text_ops")),
	index("idx_workspace_user_user_email").using("btree", table.userEmail.asc().nullsLast().op("text_ops")),
	unique("workspace_user_workspace_id_user_id_key").on(table.workspaceId, table.userId),
]);

export const label = pgTable("label", {
	id: text().default(concat(\'lbl_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	name: text().notNull(),
	color: text().default('#3b82f6'),
	workspaceId: text("workspace_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_session_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const teamAuditLog = pgTable("team_audit_log", {
	id: text().primaryKey().notNull(),
	teamId: text("team_id"),
	userEmail: text("user_email").notNull(),
	action: text().notNull(),
	changes: text().default('{}').notNull(),
	metadata: text().default('{}').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	timestamp: bigint({ mode: "number" }).notNull(),
	ipAddress: text("ip_address").default('),
	userAgent: text("user_agent").default('),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	resourceType: text("resource_type").default('team').notNull(),
	resourceId: text("resource_id").notNull(),
	oldValue: jsonb("old_value"),
	newValue: jsonb("new_value"),
}, (table) => [
	index("team_audit_log_resource_id_idx").using("btree", table.resourceId.asc().nullsLast().op("text_ops")),
	index("team_audit_log_resource_type_idx").using("btree", table.resourceType.asc().nullsLast().op("text_ops")),
]);

export const auditLog = pgTable("audit_log", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	action: text().notNull(),
	resourceType: text("resource_type"),
	resourceId: text("resource_id"),
	actorId: text("actor_id"),
	actorEmail: text("actor_email").notNull(),
	actorType: text("actor_type").default('user').notNull(),
	workspaceId: text("workspace_id"),
	projectId: text("project_id"),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	changes: jsonb(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	sessionId: text("session_id"),
	requestId: text("request_id"),
	severity: text().default('low').notNull(),
	category: text().default('general').notNull(),
	description: text().notNull(),
	metadata: jsonb(),
	retentionPolicy: text("retention_policy").default('standard').notNull(),
	isSystemGenerated: boolean("is_system_generated").default(false).notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	date: text().notNull(),
});

export const messageDeliveryStatus = pgTable("message_delivery_status", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	messageId: text("message_id").notNull(),
	userId: text("user_id").notNull(),
	status: text().default('sent').notNull(),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const directMessageConversations = pgTable("direct_message_conversations", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	participant1Id: text("participant1_id").notNull(),
	participant2Id: text("participant2_id").notNull(),
	workspaceId: text("workspace_id").notNull(),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
});

export const milestone = pgTable("milestone", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	type: text().notNull(),
	status: text().default('upcoming').notNull(),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }).notNull(),
	completedDate: timestamp("completed_date", { withTimezone: true, mode: 'string' }),
	progress: integer().default(0),
	projectId: text("project_id").notNull(),
	riskLevel: text("risk_level").default('low'),
	riskDescription: text("risk_description"),
	dependencyTaskIds: text("dependency_task_ids"),
	stakeholderIds: text("stakeholder_ids"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_milestone_due_date").using("btree", table.dueDate.asc().nullsLast().op("timestamptz_ops")),
]);

export const teamMembers = pgTable("team_members", {
	id: text().default(concat(\'tmu_\', replace((gen_random_uuid())::text, \'-\'::text, \'::text))).primaryKey().notNull(),
	teamId: text("team_id").notNull(),
	role: text().default('member'),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	permissions: jsonb().default([]),
	userEmail: text("user_email").notNull(),
	status: text().default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	invitedBy: text("invited_by"),
	isActive: boolean("is_active").default(true),
	notificationPreferences: jsonb("notification_preferences").default({}),
}, (table) => [
	index("idx_team_members_team_id").using("btree", table.teamId.asc().nullsLast().op("text_ops")),
	index("idx_team_members_user_email").using("btree", table.userEmail.asc().nullsLast().op("text_ops")),
	index("team_members_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("team_members_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("team_members_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("text_ops")),
	uniqueIndex("team_members_unique").using("btree", table.teamId.asc().nullsLast().op("text_ops"), table.userEmail.asc().nullsLast().op("text_ops")),
	index("team_members_user_email_idx").using("btree", table.userEmail.asc().nullsLast().op("text_ops")),
]);

export const channelMembership = pgTable("channel_membership", {
	id: text().primaryKey().notNull(),
	channelId: text("channel_id").notNull(),
	userEmail: text("user_email").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userId: varchar("user_id"),
}, (table) => [
	index("idx_channel_membership_composite").using("btree", table.channelId.asc().nullsLast().op("text_ops"), table.userEmail.asc().nullsLast().op("text_ops")),
	index("idx_channel_membership_user_email").using("btree", table.userEmail.asc().nullsLast().op("text_ops")),
	unique("channel_membership_channel_id_user_email_key").on(table.channelId, table.userEmail),
]);

export const attachment = pgTable("attachment", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	fileName: varchar("file_name").notNull(),
	fileSize: integer("file_size").notNull(),
	fileType: varchar("file_type").notNull(),
	fileUrl: varchar("file_url").notNull(),
	taskId: varchar("task_id"),
	projectId: varchar("project_id"),
	workspaceId: varchar("workspace_id"),
	uploadedBy: varchar("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_attachment_task_id").using("btree", table.taskId.asc().nullsLast().op("text_ops")),
	index("idx_attachment_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
]);

export const profile = pgTable("profile", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	bio: text(),
	location: varchar(),
	website: varchar(),
	githubUsername: varchar("github_username"),
	linkedinUrl: varchar("linkedin_url"),
	twitterHandle: varchar("twitter_handle"),
	avatarUrl: varchar("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_profile_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("profile_user_id_key").on(table.userId),
]);

export const userSkills = pgTable("user_skills", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	skillName: varchar("skill_name").notNull(),
	proficiencyLevel: varchar("proficiency_level").default('beginner'),
	yearsOfExperience: integer("years_of_experience").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_skills_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const userExperience = pgTable("user_experience", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	company: varchar().notNull(),
	position: varchar().notNull(),
	description: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	isCurrent: boolean("is_current").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_experience_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const userEducation = pgTable("user_education", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	institution: varchar().notNull(),
	degree: varchar().notNull(),
	fieldOfStudy: varchar("field_of_study"),
	startDate: date("start_date"),
	endDate: date("end_date"),
	grade: varchar(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_education_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const userConnections = pgTable("user_connections", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	connectedUserId: varchar("connected_user_id").notNull(),
	status: varchar().default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_connections_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const timeEntries = pgTable("time_entries", {
	id: text().primaryKey().notNull(),
	taskId: text("task_id").notNull(),
	userEmail: text("user_email").notNull(),
	description: text().default('),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	duration: integer().default(0),
	isActive: boolean("is_active").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_time_entries_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_time_entries_start_time").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("idx_time_entries_task_id").using("btree", table.taskId.asc().nullsLast().op("text_ops")),
	index("idx_time_entries_user_email").using("btree", table.userEmail.asc().nullsLast().op("text_ops")),
]);

export const taskLabel = pgTable("task_label", {
	taskId: text("task_id").notNull(),
	labelId: text("label_id").notNull(),
}, (table) => [
	primaryKey({ columns: [table.taskId, table.labelId], name: "task_label_pkey"}),
]);
