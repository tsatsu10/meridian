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

// 1. Profile Views
export const profileViews = pgTable(
  "profile_views",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    profileUserId: text("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewerUserId: text("viewer_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow(),
    source: text("source"), // 'search', 'project', 'team', 'direct', 'notification'
    duration: integer("duration").default(0), // seconds
    sectionsViewed: jsonb("sections_viewed"), // ['overview', 'skills', 'achievements']
    deviceType: text("device_type"), // 'desktop', 'mobile', 'tablet'
    isAnonymous: boolean("is_anonymous").default(false),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    profileIdx: index("idx_profile_views_profile").on(
      table.profileUserId,
      table.viewedAt
    ),
    viewerIdx: index("idx_profile_views_viewer").on(
      table.viewerUserId,
      table.viewedAt
    ),
    sourceIdx: index("idx_profile_views_source").on(table.source),
  })
);

// 2. Profile Suggestions
export const profileSuggestions = pgTable(
  "profile_suggestions",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    suggestionType: text("suggestion_type").notNull(), // 'skill', 'bio', 'picture', etc.
    suggestionText: text("suggestion_text").notNull(),
    priority: text("priority").default("medium"), // 'low', 'medium', 'high'
    impactScore: integer("impact_score"), // 1-100
    isDismissed: boolean("is_dismissed").default(false),
    isCompleted: boolean("is_completed").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    userIdx: index("idx_profile_suggestions_user").on(
      table.userId,
      table.isDismissed,
      table.isCompleted
    ),
    priorityIdx: index("idx_profile_suggestions_priority").on(
      table.userId,
      table.priority,
      table.isDismissed
    ),
  })
);

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

// 6. User Badges
export const userBadges = pgTable(
  "user_badges",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeType: text("badge_type").notNull(), // 'top_performer', 'early_adopter', etc.
    badgeName: text("badge_name").notNull(),
    badgeDescription: text("badge_description"),
    badgeIcon: text("badge_icon"),
    badgeColor: text("badge_color"),
    rarity: text("rarity").default("common"), // 'common', 'rare', 'epic', 'legendary'
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow(),
    criteriaMet: jsonb("criteria_met"),
    isVisible: boolean("is_visible").default(true),
    displayOrder: integer("display_order").default(0),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    userIdx: index("idx_user_badges_user").on(table.userId, table.displayOrder),
    typeIdx: index("idx_user_badges_type").on(table.badgeType),
    rarityIdx: index("idx_user_badges_rarity").on(table.rarity, table.awardedAt),
  })
);

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

// 8. Profile Section Views
export const profileSectionViews = pgTable(
  "profile_section_views",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    profileUserId: text("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sectionName: text("section_name").notNull(), // 'overview', 'skills', 'experience', etc.
    viewCount: integer("view_count").default(0),
    lastViewed: timestamp("last_viewed", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSection: unique().on(table.profileUserId, table.sectionName),
    profileIdx: index("idx_section_views_profile").on(
      table.profileUserId,
      table.viewCount
    ),
  })
);

// Type exports for use in controllers
export type ProfileView = typeof profileViews.$inferSelect;
export type NewProfileView = typeof profileViews.$inferInsert;

export type ProfileSuggestion = typeof profileSuggestions.$inferSelect;
export type NewProfileSuggestion = typeof profileSuggestions.$inferInsert;

export type UserAvailability = typeof userAvailability.$inferSelect;
export type NewUserAvailability = typeof userAvailability.$inferInsert;

export type FrequentCollaborator = typeof frequentCollaborators.$inferSelect;
export type NewFrequentCollaborator = typeof frequentCollaborators.$inferInsert;

export type UserStatistics = typeof userStatistics.$inferSelect;
export type NewUserStatistics = typeof userStatistics.$inferInsert;

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;

export type UserWorkHistory = typeof userWorkHistory.$inferSelect;
export type NewUserWorkHistory = typeof userWorkHistory.$inferInsert;

export type ProfileSectionView = typeof profileSectionViews.$inferSelect;
export type NewProfileSectionView = typeof profileSectionViews.$inferInsert;

