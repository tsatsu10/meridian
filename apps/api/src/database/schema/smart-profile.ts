/**
 * 🎯 Smart Profile Features Schema
 * 
 * Database schema for enhanced profile features:
 * - Profile views & analytics
 * - Optimization suggestions
 * - User availability
 * - Frequent collaborators
 * - User statistics
 * - Badges & credentials
 * - Work history
 * - Section analytics
 */

import { createId } from "@paralleldrive/cuid2";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  time,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { users, workspaces, projects, teams } from "../schema";
// 3. User Availability
export const userAvailability = pgTable("user_availability", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("available"), // 'available', 'away', 'busy', 'do_not_disturb', 'offline'
  statusMessage: text("status_message"),
  statusEmoji: text("status_emoji"),
  autoStatus: boolean("auto_status").default(true),
  manualStatusUntil: timestamp("manual_status_until", { withTimezone: true }),
  timezone: text("timezone"),
  workingHoursStart: time("working_hours_start"),
  workingHoursEnd: time("working_hours_end"),
  workingDays: jsonb("working_days"), // ['monday', 'tuesday', ...]
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 4. Frequent Collaborators
export const frequentCollaborators = pgTable(
  "frequent_collaborators",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collaboratorId: text("collaborator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collaborationCount: integer("collaboration_count").default(0),
    sharedProjects: jsonb("shared_projects"), // Array of project IDs
    sharedTasks: jsonb("shared_tasks"), // Array of task IDs
    lastCollaboration: timestamp("last_collaboration", { withTimezone: true }),
    collaborationScore: numeric("collaboration_score", { precision: 5, scale: 2 }), // 0-100
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniquePair: unique().on(table.userId, table.collaboratorId),
    userIdx: index("idx_frequent_collaborators_user").on(
      table.userId,
      table.collaborationScore
    ),
    pairIdx: index("idx_frequent_collaborators_pair").on(
      table.userId,
      table.collaboratorId
    ),
  })
);

// 5. User Statistics
export const userStatistics = pgTable("user_statistics", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Task stats
  tasksCompletedWeek: integer("tasks_completed_week").default(0),
  tasksCompletedMonth: integer("tasks_completed_month").default(0),
  tasksCompletedAllTime: integer("tasks_completed_all_time").default(0),
  tasksOverdue: integer("tasks_overdue").default(0),
  avgTaskCompletionDays: numeric("avg_task_completion_days", {
    precision: 5,
    scale: 2,
  }),

  // Project stats
  projectsActive: integer("projects_active").default(0),
  projectsCompleted: integer("projects_completed").default(0),
  projectsTotal: integer("projects_total").default(0),

  // Team stats
  teamsCount: integer("teams_count").default(0),
  teamsLeadCount: integer("teams_lead_count").default(0),

  // Communication stats
  avgResponseTimeMinutes: numeric("avg_response_time_minutes", {
    precision: 7,
    scale: 2,
  }),
  messagesSent: integer("messages_sent").default(0),
  messagesReceived: integer("messages_received").default(0),

  // Contribution score
  contributionScore: numeric("contribution_score", {
    precision: 7,
    scale: 2,
  }).default("0"),

  // Tenure
  workspaceJoinDate: timestamp("workspace_join_date", { withTimezone: true }),
  daysInWorkspace: integer("days_in_workspace").default(0),

  // Last updated
  lastCalculated: timestamp("last_calculated", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 7. Work History
export const userWorkHistory = pgTable(
  "user_work_history",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // 'role_change', 'promotion', 'project_completed', etc.
    eventTitle: text("event_title").notNull(),
    eventDescription: text("event_description"),
    fromValue: text("from_value"), // Old role, old team, etc.
    toValue: text("to_value"), // New role, new team, etc.
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    eventDate: timestamp("event_date", { withTimezone: true }).defaultNow(),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    userIdx: index("idx_work_history_user").on(table.userId, table.eventDate),
    workspaceIdx: index("idx_work_history_workspace").on(
      table.workspaceId,
      table.eventDate
    ),
    typeIdx: index("idx_work_history_type").on(table.eventType, table.eventDate),
  })
);

export type UserAvailability = typeof userAvailability.$inferSelect;
export type NewUserAvailability = typeof userAvailability.$inferInsert;

export type FrequentCollaborator = typeof frequentCollaborators.$inferSelect;
export type NewFrequentCollaborator = typeof frequentCollaborators.$inferInsert;

export type UserStatistics = typeof userStatistics.$inferSelect;
export type NewUserStatistics = typeof userStatistics.$inferInsert;


export type UserWorkHistory = typeof userWorkHistory.$inferSelect;
export type NewUserWorkHistory = typeof userWorkHistory.$inferInsert;
