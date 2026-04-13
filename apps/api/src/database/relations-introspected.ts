import { relations } from "drizzle-orm/relations";
import { workspaces, projects, users, sessions, tasks, workspaceMembers, channels, channelMembers, messages, teams, notifications, userPresence, workflows, activities, auditLogs } from "./schema";

export const projectsRelations = relations(projects, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [projects.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [projects.ownerId],
		references: [users.id]
	}),
	tasks: many(tasks),
}));

export const workspacesRelations = relations(workspaces, ({one, many}) => ({
	projects: many(projects),
	user: one(users, {
		fields: [workspaces.ownerId],
		references: [users.id]
	}),
	workspaceMembers: many(workspaceMembers),
	channels: many(channels),
	teams: many(teams),
	userPresences: many(userPresence),
	workflows: many(workflows),
	activities: many(activities),
	auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
	sessions: many(sessions),
	workspaces: many(workspaces),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_users_id"
	}),
	tasks_createdBy: many(tasks, {
		relationName: "tasks_createdBy_users_id"
	}),
	workspaceMembers_userId: many(workspaceMembers, {
		relationName: "workspaceMembers_userId_users_id"
	}),
	workspaceMembers_invitedBy: many(workspaceMembers, {
		relationName: "workspaceMembers_invitedBy_users_id"
	}),
	channels: many(channels),
	channelMembers: many(channelMembers),
	messages: many(messages),
	teams: many(teams),
	notifications: many(notifications),
	userPresences: many(userPresence),
	workflows: many(workflows),
	activities: many(activities),
	auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user_assignedTo: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id],
		relationName: "tasks_assignedTo_users_id"
	}),
	user_createdBy: one(users, {
		fields: [tasks.createdBy],
		references: [users.id],
		relationName: "tasks_createdBy_users_id"
	}),
	task: one(tasks, {
		fields: [tasks.parentTaskId],
		references: [tasks.id],
		relationName: "tasks_parentTaskId_tasks_id"
	}),
	tasks: many(tasks, {
		relationName: "tasks_parentTaskId_tasks_id"
	}),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({one}) => ({
	workspace: one(workspaces, {
		fields: [workspaceMembers.workspaceId],
		references: [workspaces.id]
	}),
	user_userId: one(users, {
		fields: [workspaceMembers.userId],
		references: [users.id],
		relationName: "workspaceMembers_userId_users_id"
	}),
	user_invitedBy: one(users, {
		fields: [workspaceMembers.invitedBy],
		references: [users.id],
		relationName: "workspaceMembers_invitedBy_users_id"
	}),
}));

export const channelsRelations = relations(channels, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [channels.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [channels.createdBy],
		references: [users.id]
	}),
	channelMembers: many(channelMembers),
	messages: many(messages),
}));

export const channelMembersRelations = relations(channelMembers, ({one}) => ({
	channel: one(channels, {
		fields: [channelMembers.channelId],
		references: [channels.id]
	}),
	user: one(users, {
		fields: [channelMembers.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	channel: one(channels, {
		fields: [messages.channelId],
		references: [channels.id]
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
	message_threadId: one(messages, {
		fields: [messages.threadId],
		references: [messages.id],
		relationName: "messages_threadId_messages_id"
	}),
	messages_threadId: many(messages, {
		relationName: "messages_threadId_messages_id"
	}),
	message_parentMessageId: one(messages, {
		fields: [messages.parentMessageId],
		references: [messages.id],
		relationName: "messages_parentMessageId_messages_id"
	}),
	messages_parentMessageId: many(messages, {
		relationName: "messages_parentMessageId_messages_id"
	}),
}));

export const teamsRelations = relations(teams, ({one}) => ({
	workspace: one(workspaces, {
		fields: [teams.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [teams.leaderId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const userPresenceRelations = relations(userPresence, ({one}) => ({
	user: one(users, {
		fields: [userPresence.userId],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [userPresence.workspaceId],
		references: [workspaces.id]
	}),
}));

export const workflowsRelations = relations(workflows, ({one}) => ({
	workspace: one(workspaces, {
		fields: [workflows.workspaceId],
		references: [workspaces.id]
	}),
	user: one(users, {
		fields: [workflows.createdBy],
		references: [users.id]
	}),
}));

export const activitiesRelations = relations(activities, ({one}) => ({
	user: one(users, {
		fields: [activities.userId],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [activities.workspaceId],
		references: [workspaces.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [auditLogs.workspaceId],
		references: [workspaces.id]
	}),
}));
