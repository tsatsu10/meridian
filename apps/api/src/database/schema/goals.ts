/**
 * 🎯 Goal Setting & OKR System - Database Schema
 * 
 * Complete schema for goal management including:
 * - Personal and team objectives (OKRs)
 * - Key results tracking
 * - Progress history
 * - Weekly reflections
 * - Personal/team milestones
 * 
 * @epic Goal-Setting
 * @phase Phase-1-Foundation
 * @created October 30, 2025
 */

import { pgTable, text, integer, numeric, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users, workspaces } from "../schema";

// ==========================================
// GOALS TABLE - Core Objectives Storage
// ==========================================

/**
 * Goals Table - Stores objectives, OKRs, and general goals
 * 
 * Supports:
 * - Personal goals (individual user)
 * - Team goals (shared across team)
 * - Organizational goals (workspace-wide)
 * - Hierarchical goals (parent-child relationships)
 * 
 * Goal Types:
 * - 'objective': OKR objective with key results
 * - 'personal': Personal development goal
 * - 'team': Team collaboration goal
 * - 'strategic': High-level organizational goal
 * 
 * Privacy Levels:
 * - 'private': Only visible to owner
 * - 'team': Visible to team members
 * - 'organization': Visible to entire workspace
 */
export const goals = pgTable("goals", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
    
  // Ownership & Scoping
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
    
  // Core Fields
  title: text("title").notNull(), // Max 100 chars (validated in API)
  description: text("description"), // Max 500 chars
  
  // Classification
  type: text("type").notNull(), // 'objective' | 'personal' | 'team' | 'strategic'
  timeframe: text("timeframe").notNull(), // 'Q1 2025' | '2025' | 'custom'
  
  // Dates
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  
  // Status & Progress
  status: text("status").notNull().default("active"), // 'draft' | 'active' | 'completed' | 'abandoned'
  progress: integer("progress").default(0), // 0-100 percentage
  
  // Access Control
  privacy: text("privacy").notNull().default("private"), // 'private' | 'team' | 'organization'
  
  // Hierarchy
  parentGoalId: text("parent_goal_id").references(() => goals.id, { onDelete: "set null" }),
  
  // Priority & Metadata
  priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  metadata: jsonb("metadata").default({}), // Flexible storage for future features
  
  // Audit Fields
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Performance Indexes
  workspaceUserIdx: index("idx_goals_workspace_user").on(table.workspaceId, table.userId),
  statusIdx: index("idx_goals_status").on(table.status),
  endDateIdx: index("idx_goals_end_date").on(table.endDate),
  typeIdx: index("idx_goals_type").on(table.type),
  parentGoalIdx: index("idx_goals_parent").on(table.parentGoalId),
}));

// ==========================================
// KEY RESULTS TABLE - OKR Key Results
// ==========================================

/**
 * Goal Key Results Table - Measurable outcomes for objectives
 * 
 * Each OKR objective should have 3-5 key results that are:
 * - Measurable (target value + current value)
 * - Time-bound (due date)
 * - Specific (clear units)
 * 
 * Unit Types:
 * - '%': Percentage (0-100)
 * - 'count': Integer count
 * - 'currency': Monetary value
 * - 'hours': Time duration
 * - 'custom': User-defined unit
 * 
 * Status:
 * - 'not_started': No progress yet
 * - 'on_track': Progressing as expected
 * - 'at_risk': Behind schedule but recoverable
 * - 'behind': Significantly behind
 * - 'completed': Target achieved
 */
export const goalKeyResults = pgTable("goal_key_results", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
    
  // Parent Goal Reference
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
    
  // Core Fields
  title: text("title").notNull(), // Max 100 chars
  description: text("description"), // Max 500 chars
  
  // Measurement
  targetValue: numeric("target_value", { precision: 10, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }).default("0"),
  unit: text("unit").notNull(), // '%' | 'count' | 'currency' | 'hours' | 'custom'
  
  // Timeline
  dueDate: timestamp("due_date", { withTimezone: true }),
  
  // Status
  status: text("status").notNull().default("not_started"), // 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed'
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Audit Fields
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Performance Indexes
  goalIdIdx: index("idx_key_results_goal").on(table.goalId),
  statusIdx: index("idx_key_results_status").on(table.status),
  dueDateIdx: index("idx_key_results_due_date").on(table.dueDate),
}));

// ==========================================
// PROGRESS TABLE - Historical Tracking
// ==========================================

/**
 * Goal Progress Table - Time-series progress tracking
 * 
 * Records every progress update for goals and key results.
 * Enables:
 * - Historical trend analysis
 * - Progress velocity calculations
 * - Completion predictions
 * - Accountability tracking
 * 
 * Can track progress for:
 * - Goals (via goalId)
 * - Key Results (via keyResultId)
 * - Both (when updating KR also updates goal)
 */
export const goalProgress = pgTable("goal_progress", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
    
  // References (one or both can be set)
  goalId: text("goal_id").references(() => goals.id, { onDelete: "cascade" }),
  keyResultId: text("key_result_id").references(() => goalKeyResults.id, { onDelete: "cascade" }),
  
  // Progress Data
  value: numeric("value", { precision: 10, scale: 2 }).notNull(), // Current value at this point in time
  previousValue: numeric("previous_value", { precision: 10, scale: 2 }), // Previous value for delta calculation
  note: text("note"), // Optional progress note (max 500 chars)
  
  // Audit
  recordedBy: text("recorded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Performance Indexes
  goalIdIdx: index("idx_goal_progress_goal").on(table.goalId),
  keyResultIdIdx: index("idx_goal_progress_key_result").on(table.keyResultId),
  recordedAtIdx: index("idx_goal_progress_recorded_at").on(table.recordedAt),
  recordedByIdx: index("idx_goal_progress_recorded_by").on(table.recordedBy),
}));

// ==========================================
// REFLECTIONS TABLE - Weekly Self-Assessment
// ==========================================

/**
 * Goal Reflections Table - Weekly check-in and self-assessment
 * 
 * Prompts users to reflect on:
 * - What went well this week?
 * - What could be improved?
 * - What did you learn?
 * - What are you grateful for?
 * - What's your top priority next week?
 * 
 * Privacy Levels:
 * - 'private': Only visible to user
 * - 'team': Visible to team lead
 * - 'public': Visible to entire workspace
 * 
 * Scheduled: Friday afternoon (configurable)
 */
export const goalReflections = pgTable("goal_reflections", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
    
  // Ownership & Scoping
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
    
  // Time Period
  weekOf: timestamp("week_of", { withTimezone: true }).notNull(), // Start of week (Monday)
  
  // Reflection Prompts (each max 500 chars)
  wentWell: text("went_well"),
  couldImprove: text("could_improve"),
  learned: text("learned"),
  grateful: text("grateful"),
  nextPriority: text("next_priority"),
  
  // Optional Goal Association
  goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
  
  // Privacy
  privacy: text("privacy").notNull().default("private"), // 'private' | 'team' | 'public'
  
  // Metadata & Tags
  metadata: jsonb("metadata").default({}),
  tags: jsonb("tags").default([]), // Array of tag strings
  
  // Submission
  submittedAt: timestamp("submitted_at", { withTimezone: true }), // Null if draft
  
  // Audit Fields
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Performance Indexes
  userWeekIdx: index("idx_reflections_user_week").on(table.userId, table.weekOf),
  workspaceIdx: index("idx_reflections_workspace").on(table.workspaceId),
  submittedIdx: index("idx_reflections_submitted").on(table.submittedAt),
}));

// ==========================================
// MILESTONES TABLE - Deadline Tracking
// ==========================================

/**
 * Goal Milestones Table - Personal and team milestone tracking
 * 
 * Different from project milestones:
 * - Can be personal (individual achievement)
 * - Can span multiple projects
 * - Can link to multiple goals
 * - Focused on outcomes, not deliverables
 * 
 * Priority Levels:
 * - 'low': Nice to have
 * - 'medium': Important but flexible
 * - 'high': Critical to success
 * - 'critical': Must not miss
 * 
 * Status:
 * - 'pending': Not yet reached due date
 * - 'in_progress': Work actively happening
 * - 'completed': Successfully achieved
 * - 'missed': Passed due date without completion
 * - 'cancelled': No longer relevant
 */
export const goalMilestones = pgTable("goal_milestones", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
    
  // Ownership & Scoping
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
    
  // Core Fields
  title: text("title").notNull(), // Max 100 chars
  description: text("description"), // Max 500 chars
  
  // Timeline
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  
  // Associations
  goalIds: jsonb("goal_ids").default([]), // Array of linked goal IDs
  taskIds: jsonb("task_ids").default([]), // Array of linked task IDs (from projects)
  
  // Priority & Status
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  status: text("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'completed' | 'missed' | 'cancelled'
  
  // Completion
  completedAt: timestamp("completed_at", { withTimezone: true }),
  
  // Stakeholders & Criteria
  stakeholders: jsonb("stakeholders").default([]), // Array of user IDs
  successCriteria: jsonb("success_criteria").default([]), // Array of criteria strings
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Audit Fields
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Performance Indexes
  dueDateIdx: index("idx_milestones_due_date").on(table.dueDate),
  userStatusIdx: index("idx_milestones_user_status").on(table.userId, table.status),
  workspaceIdx: index("idx_milestones_workspace").on(table.workspaceId),
  priorityIdx: index("idx_milestones_priority").on(table.priority),
}));

// ==========================================
// TypeScript Types for Application Use
// ==========================================

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type GoalKeyResult = typeof goalKeyResults.$inferSelect;
export type NewGoalKeyResult = typeof goalKeyResults.$inferInsert;

export type GoalProgress = typeof goalProgress.$inferSelect;
export type NewGoalProgress = typeof goalProgress.$inferInsert;

export type GoalReflection = typeof goalReflections.$inferSelect;
export type NewGoalReflection = typeof goalReflections.$inferInsert;

export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type NewGoalMilestone = typeof goalMilestones.$inferInsert;

// ==========================================
// Table Relations (for Drizzle Query API)
// ==========================================

import { relations } from "drizzle-orm";

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [goals.workspaceId],
    references: [workspaces.id],
  }),
  parentGoal: one(goals, {
    fields: [goals.parentGoalId],
    references: [goals.id],
  }),
  childGoals: many(goals),
  keyResults: many(goalKeyResults),
  progressEntries: many(goalProgress),
  reflections: many(goalReflections),
}));

export const goalKeyResultsRelations = relations(goalKeyResults, ({ one, many }) => ({
  goal: one(goals, {
    fields: [goalKeyResults.goalId],
    references: [goals.id],
  }),
  progressEntries: many(goalProgress),
}));

export const goalProgressRelations = relations(goalProgress, ({ one }) => ({
  goal: one(goals, {
    fields: [goalProgress.goalId],
    references: [goals.id],
  }),
  keyResult: one(goalKeyResults, {
    fields: [goalProgress.keyResultId],
    references: [goalKeyResults.id],
  }),
  recordedByUser: one(users, {
    fields: [goalProgress.recordedBy],
    references: [users.id],
  }),
}));

export const goalReflectionsRelations = relations(goalReflections, ({ one }) => ({
  user: one(users, {
    fields: [goalReflections.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [goalReflections.workspaceId],
    references: [workspaces.id],
  }),
  goal: one(goals, {
    fields: [goalReflections.goalId],
    references: [goals.id],
  }),
}));

export const goalMilestonesRelations = relations(goalMilestones, ({ one }) => ({
  user: one(users, {
    fields: [goalMilestones.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [goalMilestones.workspaceId],
    references: [workspaces.id],
  }),
}));


