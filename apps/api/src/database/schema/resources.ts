/**
 * Resource Management Schema
 * Phase 3.3 - Resource Management System
 */

import { pgTable, uuid, text, timestamp, integer, decimal, boolean } from 'drizzle-orm/pg-core';

/**
 * Resource Capacity - User capacity and availability
 */
export const resourceCapacity = pgTable('resource_capacity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  hoursPerDay: decimal('hours_per_day', { precision: 4, scale: 2 }).default('8.00'), // Standard work hours per day
  hoursPerWeek: decimal('hours_per_week', { precision: 4, scale: 2 }).default('40.00'), // Standard work hours per week
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'), // null = indefinite
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Resource Allocation - Allocation of users to projects/tasks
 */
export const resourceAllocation = pgTable('resource_allocation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  projectId: uuid('project_id').notNull(),
  taskId: uuid('task_id'), // null = project-level allocation
  allocationPercentage: integer('allocation_percentage').default(100), // 0-100%
  hoursAllocated: decimal('hours_allocated', { precision: 6, scale: 2 }), // Total hours allocated
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  status: text('status').default('active'), // active, completed, cancelled
  notes: text('notes'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Time Off - Vacation, sick leave, etc.
 */
export const timeOff = pgTable('time_off', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(), // vacation, sick, personal, holiday
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  hoursOff: decimal('hours_off', { precision: 6, scale: 2 }).notNull(),
  status: text('status').default('approved'), // pending, approved, denied
  reason: text('reason'),
  approvedBy: uuid('approved_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Resource Utilization - Historical utilization data
 */
export const resourceUtilization = pgTable('resource_utilization', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  weekStartDate: timestamp('week_start_date').notNull(),
  weekEndDate: timestamp('week_end_date').notNull(),
  hoursAvailable: decimal('hours_available', { precision: 6, scale: 2 }).notNull(),
  hoursAllocated: decimal('hours_allocated', { precision: 6, scale: 2 }).notNull(),
  hoursWorked: decimal('hours_worked', { precision: 6, scale: 2 }).default('0.00'),
  utilizationRate: decimal('utilization_rate', { precision: 5, scale: 2 }), // Percentage
  createdAt: timestamp('created_at').defaultNow(),
});

export type ResourceCapacity = typeof resourceCapacity.$inferSelect;
export type NewResourceCapacity = typeof resourceCapacity.$inferInsert;
export type ResourceAllocation = typeof resourceAllocation.$inferSelect;
export type NewResourceAllocation = typeof resourceAllocation.$inferInsert;
export type TimeOff = typeof timeOff.$inferSelect;
export type ResourceUtilization = typeof resourceUtilization.$inferSelect;


