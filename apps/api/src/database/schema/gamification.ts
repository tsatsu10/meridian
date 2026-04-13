/**
 * 🎮 Gamification & Motivation System - Database Schema
 * 
 * Complete schema for gamification including:
 * - Achievement badges and unlocks
 * - Streak tracking (login, tasks, goals, collaboration)
 * - Leaderboards with opt-in privacy
 * - Daily challenges
 * - Team celebrations
 * - Progress rings (Apple Watch style)
 * 
 * @epic Gamification-Motivation
 * @phase Foundation
 * @created October 30, 2025
 */

import { pgTable, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users, workspaces } from "../schema";

// ==========================================
// ACHIEVEMENT DEFINITIONS TABLE
// ==========================================

/**
 * Achievement Definitions - Badge templates
 * 
 * Defines all possible achievements users can unlock.
 * Categories: task, goal, team, streak, special
 * Rarity: common, rare, epic, legendary
 * 
 * Criteria examples:
 * - { type: 'task_count', target: 100 }
 * - { type: 'goal_completion', target: 10 }
 * - { type: 'streak_days', streakType: 'task', target: 30 }
 * - { type: 'kudos_received', target: 25 }
 */
export const achievementDefinitions = pgTable("achievement_definitions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Emoji or Lucide icon name
  criteria: jsonb("criteria").notNull(), // Unlock conditions
  rarity: text("rarity").notNull(), // 'common' | 'rare' | 'epic' | 'legendary'
  points: integer("points").notNull(), // Points awarded on unlock
  category: text("category").notNull(), // 'task' | 'goal' | 'team' | 'streak' | 'special'
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0), // Display order
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  categoryIdx: index("idx_achievements_category").on(table.category),
  rarityIdx: index("idx_achievements_rarity").on(table.rarity),
}));

// ==========================================
// USER ACHIEVEMENTS TABLE
// ==========================================

/**
 * User Achievements - Unlocked badges
 * 
 * Tracks which achievements each user has unlocked.
 * Includes progress tracking for partially completed achievements.
 */
export const userAchievements = pgTable("user_achievements", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  achievementId: text("achievement_id").notNull()
    .references(() => achievementDefinitions.id, { onDelete: "cascade" }),
  progress: integer("progress").default(0), // Current progress (e.g., 7/10 tasks)
  target: integer("target"), // Target from criteria (e.g., 10)
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  notified: boolean("notified").default(false), // Has user been notified?
  sharedAt: timestamp("shared_at", { withTimezone: true }), // When user shared achievement
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index("idx_user_achievements_user").on(table.userId),
  unlockedIdx: index("idx_user_achievements_unlocked").on(table.isUnlocked),
  userUnlockedIdx: index("idx_user_achievements_user_unlocked").on(table.userId, table.isUnlocked),
}));

// ==========================================
// USER STREAKS TABLE
// ==========================================

/**
 * User Streaks - Activity streak tracking
 * 
 * Tracks consecutive day streaks for different activity types.
 * Streak types: login, task, goal, collaboration, learning
 * 
 * Streak Rules:
 * - Activity must occur daily (by midnight in user timezone)
 * - 24-hour grace period for streak continuation
 * - Freezes allow 1-day skip (premium feature)
 */
export const userStreaks = pgTable("user_streaks", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  streakType: text("streak_type").notNull(), // 'login' | 'task' | 'goal' | 'collaboration' | 'learning'
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date", { withTimezone: true }),
  streakStartDate: timestamp("streak_start_date", { withTimezone: true }),
  freezesRemaining: integer("freezes_remaining").default(0), // Premium feature
  totalActiveDays: integer("total_active_days").default(0), // Total days with activity (not consecutive)
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userTypeIdx: index("idx_streaks_user_type").on(table.userId, table.streakType),
  currentStreakIdx: index("idx_streaks_current").on(table.currentStreak),
}));

// ==========================================
// LEADERBOARD SCORES TABLE
// ==========================================

/**
 * Leaderboard Scores - User rankings
 * 
 * Calculated scores and rankings for users.
 * Supports multiple score types and time periods.
 * Privacy-focused with opt-in requirement.
 * 
 * Score calculation:
 * - Task completion (10 points each)
 * - Goal completion (100 points each)
 * - Key results (25 points each)
 * - Kudos given/received (5/10 points)
 * - Streak bonus (2 points per day)
 * - Achievement unlocks (50-500 points)
 */
export const leaderboardScores = pgTable("leaderboard_scores", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  scoreType: text("score_type").notNull(), // 'total' | 'tasks' | 'goals' | 'kudos' | 'quality' | 'collaboration'
  score: integer("score").notNull().default(0),
  rank: integer("rank"), // Calculated rank within scope
  period: text("period").notNull(), // 'daily' | 'weekly' | 'monthly' | 'all_time'
  isOptedIn: boolean("is_opted_in").default(false), // Privacy: must opt-in
  isAnonymous: boolean("is_anonymous").default(false), // Show as "User #123"
  lastCalculated: timestamp("last_calculated", { withTimezone: true }).defaultNow(),
  metadata: jsonb("metadata").default({}), // Score breakdown
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  workspacePeriodIdx: index("idx_leaderboard_workspace_period").on(table.workspaceId, table.period),
  rankIdx: index("idx_leaderboard_rank").on(table.rank),
  userIdx: index("idx_leaderboard_user").on(table.userId),
  optInIdx: index("idx_leaderboard_opted_in").on(table.isOptedIn),
}));

// ==========================================
// DAILY CHALLENGES TABLE
// ==========================================

/**
 * Daily Challenges - Challenge definitions
 * 
 * Generated daily challenges for users.
 * Rotates every 24 hours.
 * Difficulty-based rewards.
 * 
 * Challenge types:
 * - Task-based: Complete X tasks
 * - Goal-based: Update Y key results
 * - Collaboration: Give Z kudos
 * - Quality: Zero overdue tasks
 */
export const dailyChallenges = pgTable("daily_challenges", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" }),
  challengeType: text("challenge_type").notNull(), // 'task' | 'goal' | 'collaboration' | 'quality'
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(), // 'easy' | 'medium' | 'hard' | 'legendary'
  target: integer("target").notNull(), // e.g., complete 5 tasks
  points: integer("points").notNull(), // Reward points
  validDate: timestamp("valid_date", { withTimezone: true }).notNull(), // Date this challenge is active
  isActive: boolean("is_active").default(true),
  icon: text("icon"), // Challenge icon/emoji
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  validDateIdx: index("idx_challenges_valid_date").on(table.validDate),
  workspaceIdx: index("idx_challenges_workspace").on(table.workspaceId),
}));

// ==========================================
// USER CHALLENGE PROGRESS TABLE
// ==========================================

/**
 * User Challenge Progress - User's challenge status
 * 
 * Tracks user progress on daily challenges.
 * One row per user per challenge.
 */
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  challengeId: text("challenge_id").notNull()
    .references(() => dailyChallenges.id, { onDelete: "cascade" }),
  progress: integer("progress").default(0), // Current progress (e.g., completed 3/5 tasks)
  target: integer("target").notNull(), // Target from challenge
  isAccepted: boolean("is_accepted").default(true), // User accepted challenge
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  pointsEarned: integer("points_earned"),
  wasRerolled: boolean("was_rerolled").default(false), // Did user reroll this?
  metadata: jsonb("metadata").default({}),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userChallengeIdx: index("idx_user_challenge_progress").on(table.userId, table.challengeId),
  completedIdx: index("idx_user_challenge_completed").on(table.isCompleted),
}));

// ==========================================
// CELEBRATION EVENTS TABLE
// ==========================================

/**
 * Celebration Events - Team celebration history
 * 
 * Logs celebration events for team awareness.
 * Used for celebration feed and notifications.
 */
export const celebrationEvents = pgTable("celebration_events", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id").notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  triggerUserId: text("trigger_user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  celebrationType: text("celebration_type").notNull(), // 'confetti' | 'fireworks' | 'modal' | 'toast'
  reason: text("reason").notNull(), // 'project_complete' | 'achievement_unlock' | 'streak_milestone' | 'goal_complete'
  title: text("title").notNull(),
  description: text("description"),
  entityType: text("entity_type"), // 'project' | 'goal' | 'achievement' | 'streak'
  entityId: text("entity_id"),
  teamMemberIds: jsonb("team_member_ids").default([]), // Users who should see this
  reactions: jsonb("reactions").default({}), // { '🎉': ['userId1'], '👏': ['userId2'] }
  wasDisplayed: boolean("was_displayed").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  workspaceIdx: index("idx_celebrations_workspace").on(table.workspaceId),
  triggerUserIdx: index("idx_celebrations_trigger_user").on(table.triggerUserId),
  createdIdx: index("idx_celebrations_created").on(table.createdAt),
}));

// ==========================================
// PROGRESS RING DATA TABLE
// ==========================================

/**
 * Progress Ring Data - Apple Watch-style activity rings
 * 
 * Tracks daily/weekly/monthly progress for activity rings.
 * Three rings: Tasks (blue), Goals (green), Milestones (red)
 */
export const progressRingData = pgTable("progress_ring_data", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(), // Date for this ring data
  
  // Ring 1: Daily Tasks (Blue)
  tasksTarget: integer("tasks_target").notNull().default(5),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksProgress: integer("tasks_progress").default(0), // 0-100 percentage
  
  // Ring 2: Weekly Goals (Green)
  goalsTarget: integer("goals_target").notNull().default(3),
  goalsUpdated: integer("goals_updated").default(0),
  goalsProgress: integer("goals_progress").default(0), // 0-100 percentage
  
  // Ring 3: Monthly Milestones (Red)
  milestonesTarget: integer("milestones_target").notNull().default(2),
  milestonesCompleted: integer("milestones_completed").default(0),
  milestonesProgress: integer("milestones_progress").default(0), // 0-100 percentage
  
  // Ring completion status
  allRingsClosed: boolean("all_rings_closed").default(false),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userDateIdx: index("idx_progress_rings_user_date").on(table.userId, table.date),
  allClosedIdx: index("idx_progress_rings_all_closed").on(table.allRingsClosed),
}));

// ==========================================
// TypeScript Types
// ==========================================

export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;
export type NewAchievementDefinition = typeof achievementDefinitions.$inferInsert;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

export type UserStreak = typeof userStreaks.$inferSelect;
export type NewUserStreak = typeof userStreaks.$inferInsert;

export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
export type NewLeaderboardScore = typeof leaderboardScores.$inferInsert;

export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type NewDailyChallenge = typeof dailyChallenges.$inferInsert;

export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;
export type NewUserChallengeProgress = typeof userChallengeProgress.$inferInsert;

export type CelebrationEvent = typeof celebrationEvents.$inferSelect;
export type NewCelebrationEvent = typeof celebrationEvents.$inferInsert;

export type ProgressRingData = typeof progressRingData.$inferSelect;
export type NewProgressRingData = typeof progressRingData.$inferInsert;

// ==========================================
// Table Relations
// ==========================================

import { relations } from "drizzle-orm";

export const achievementDefinitionsRelations = relations(achievementDefinitions, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievementDefinitions, {
    fields: [userAchievements.achievementId],
    references: [achievementDefinitions.id],
  }),
}));

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(users, {
    fields: [userStreaks.userId],
    references: [users.id],
  }),
}));

export const leaderboardScoresRelations = relations(leaderboardScores, ({ one }) => ({
  user: one(users, {
    fields: [leaderboardScores.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [leaderboardScores.workspaceId],
    references: [workspaces.id],
  }),
}));

export const dailyChallengesRelations = relations(dailyChallenges, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [dailyChallenges.workspaceId],
    references: [workspaces.id],
  }),
  userProgress: many(userChallengeProgress),
}));

export const userChallengeProgressRelations = relations(userChallengeProgress, ({ one }) => ({
  user: one(users, {
    fields: [userChallengeProgress.userId],
    references: [users.id],
  }),
  challenge: one(dailyChallenges, {
    fields: [userChallengeProgress.challengeId],
    references: [dailyChallenges.id],
  }),
}));

export const celebrationEventsRelations = relations(celebrationEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [celebrationEvents.workspaceId],
    references: [workspaces.id],
  }),
  triggerUser: one(users, {
    fields: [celebrationEvents.triggerUserId],
    references: [users.id],
  }),
}));

export const progressRingDataRelations = relations(progressRingData, ({ one }) => ({
  user: one(users, {
    fields: [progressRingData.userId],
    references: [users.id],
  }),
}));


