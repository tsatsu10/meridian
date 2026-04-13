/**
 * Team Awareness Database Schema
 * Activity tracking, status, kudos, mood, and skill matrix
 * Phase 2 - Team Awareness Features
 */

import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users, workspaces, projects } from '../schema';

/**
 * User Activity Log
 * Track all user activities for team awareness
 */
export const userActivity = pgTable('user_activity', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  
  // Activity details
  action: text('action').notNull(), // 'created', 'updated', 'deleted', 'commented', 'completed'
  entityType: text('entity_type').notNull(), // 'task', 'project', 'comment', 'file', 'message'
  entityId: text('entity_id'),
  entityTitle: text('entity_title'),
  
  // Additional context
  description: text('description'), // Human-readable description
  metadata: jsonb('metadata'), // Additional data (old values, new values, etc.)
  
  // Visibility
  isPublic: boolean('is_public').default(true), // Can others see this activity?
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * User Status
 * Real-time user availability status
 */
export const userStatus = pgTable('user_status', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Status information
  status: text('status').notNull().default('offline'), // 'online', 'away', 'busy', 'offline', 'in-meeting', 'focus'
  statusMessage: text('status_message'), // Custom status text
  statusEmoji: text('status_emoji'), // Optional emoji
  
  // Auto-clear settings
  clearAt: timestamp('clear_at'), // When to auto-clear custom status
  
  // Activity tracking
  lastSeenAt: timestamp('last_seen_at'),
  lastActivityAt: timestamp('last_activity_at'),
  
  // Current context
  currentProjectId: text('current_project_id').references(() => projects.id, { onDelete: 'set null' }),
  currentTaskId: text('current_task_id'), // Reference to tasks table
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Kudos
 * Team recognition and appreciation
 */
export const kudos = pgTable('kudos', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  
  // Participants
  giverId: text('giver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Kudos details
  type: text('type').notNull(), // 'great-work', 'helpful', 'creative', 'teamwork', 'leadership', 'problem-solving'
  message: text('message').notNull(),
  
  // Recognition context
  relatedEntityType: text('related_entity_type'), // 'task', 'project', 'sprint'
  relatedEntityId: text('related_entity_id'),
  
  // Visibility
  isPublic: boolean('is_public').default(true),
  
  // Reactions
  reactions: jsonb('reactions'), // { '👏': ['userId1', 'userId2'], '❤️': ['userId3'] }
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Mood Tracker
 * Track team morale and sentiment
 */
export const moodLog = pgTable('mood_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  
  // Mood data
  mood: text('mood').notNull(), // 'great', 'good', 'okay', 'stressed', 'overwhelmed', 'frustrated'
  moodScore: integer('mood_score').notNull(), // 1-5 numeric representation
  
  // Optional context
  note: text('note'), // Optional private note
  tags: jsonb('tags'), // ['workload', 'deadlines', 'team-dynamics']
  
  // Context
  workloadLevel: text('workload_level'), // 'light', 'balanced', 'heavy', 'overloaded'
  
  // Anonymity
  isAnonymous: boolean('is_anonymous').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * User Skills
 * Team member skills and expertise
 */
export const userSkills = pgTable('user_skills', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Skill information
  skillName: text('skill_name').notNull(), // 'React', 'Python', 'UI Design', 'Project Management'
  skillCategory: text('skill_category'), // 'frontend', 'backend', 'design', 'management', 'other'
  
  // Proficiency
  proficiencyLevel: text('proficiency_level').notNull(), // 'beginner', 'intermediate', 'advanced', 'expert'
  proficiencyScore: integer('proficiency_score').notNull(), // 1-5
  
  // Validation
  yearsOfExperience: integer('years_of_experience'),
  isVerified: boolean('is_verified').default(false), // Verified by team lead/manager
  verifiedBy: text('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  
  // Endorsements
  endorsements: jsonb('endorsements'), // [{ userId: 'x', comment: 'Great React developer!' }]
  endorsementCount: integer('endorsement_count').default(0),
  
  // Visibility
  isPublic: boolean('is_public').default(true),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Team Availability Calendar
 * Track team member availability and time off
 */
export const teamAvailability = pgTable('team_availability', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Availability details
  type: text('type').notNull(), // 'vacation', 'sick-leave', 'personal', 'meeting', 'focus-time', 'unavailable'
  title: text('title').notNull(),
  description: text('description'),
  
  // Time range
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isAllDay: boolean('is_all_day').default(false),
  
  // Recurrence
  recurrence: jsonb('recurrence'), // { pattern: 'weekly', days: ['monday', 'wednesday'] }
  
  // Status
  status: text('status').default('confirmed'), // 'pending', 'confirmed', 'cancelled'
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Activity Feed Settings
 * User preferences for activity feed
 */
export const activityFeedSettings = pgTable('activity_feed_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Notification preferences
  notifyOnKudos: boolean('notify_on_kudos').default(true),
  notifyOnMentions: boolean('notify_on_mentions').default(true),
  notifyOnUpdates: boolean('notify_on_updates').default(true),
  
  // Feed preferences
  showOwnActivity: boolean('show_own_activity').default(false),
  showSystemActivity: boolean('show_system_activity').default(true),
  
  // Activity filters
  mutedUsers: jsonb('muted_users'), // ['userId1', 'userId2']
  mutedProjects: jsonb('muted_projects'), // ['projectId1', 'projectId2']
  
  // Mood settings
  moodReminderEnabled: boolean('mood_reminder_enabled').default(true),
  moodReminderTime: text('mood_reminder_time').default('09:00'), // Time of day for mood check-in
  moodReminderDays: jsonb('mood_reminder_days').default(['monday', 'wednesday', 'friday']),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserActivity = typeof userActivity.$inferSelect;
export type NewUserActivity = typeof userActivity.$inferInsert;

export type UserStatus = typeof userStatus.$inferSelect;
export type NewUserStatus = typeof userStatus.$inferInsert;

export type Kudos = typeof kudos.$inferSelect;
export type NewKudos = typeof kudos.$inferInsert;

export type MoodLog = typeof moodLog.$inferSelect;
export type NewMoodLog = typeof moodLog.$inferInsert;

export type UserSkills = typeof userSkills.$inferSelect;
export type NewUserSkills = typeof userSkills.$inferInsert;

export type TeamAvailability = typeof teamAvailability.$inferSelect;
export type NewTeamAvailability = typeof teamAvailability.$inferInsert;

export type ActivityFeedSettings = typeof activityFeedSettings.$inferSelect;
export type NewActivityFeedSettings = typeof activityFeedSettings.$inferInsert;


