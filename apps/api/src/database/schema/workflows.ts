/**
 * Workflow Automation Schema
 * Phase 3.1 - Workflow Automation Engine
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Workflows - Main workflow definitions
 */
export const workflow = pgTable('workflow', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(true),
  triggerType: text('trigger_type').notNull(), // task_created, task_updated, etc.
  triggerConfig: jsonb('trigger_config').default({}), // Trigger-specific configuration
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastExecutedAt: timestamp('last_executed_at'),
  executionCount: integer('execution_count').default(0),
});

/**
 * Workflow Conditions - AND logic between conditions
 */
export const workflowCondition = pgTable('workflow_condition', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(),
  field: text('field').notNull(), // status, priority, assignee, etc.
  operator: text('operator').notNull(), // equals, not_equals, contains, greater_than, etc.
  value: text('value').notNull(), // Expected value
  order: integer('order').default(0), // Execution order
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Workflow Actions - Sequential execution
 */
export const workflowAction = pgTable('workflow_action', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(),
  actionType: text('action_type').notNull(), // update_field, send_notification, create_task, etc.
  actionConfig: jsonb('action_config').notNull(), // Action-specific configuration
  order: integer('order').default(0), // Execution order
  delaySeconds: integer('delay_seconds').default(0), // Delay before execution
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Workflow Executions - Audit log of workflow runs
 */
export const workflowExecution = pgTable('workflow_execution', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(),
  triggeredBy: text('triggered_by').notNull(), // Event that triggered the workflow
  triggeredEntityId: uuid('triggered_entity_id'), // ID of the entity that triggered (task, project, etc.)
  status: text('status').notNull(), // success, failed, partial
  error: text('error'), // Error message if failed
  executionTimeMs: integer('execution_time_ms'), // Execution duration
  actionsExecuted: integer('actions_executed').default(0),
  actionsSucceeded: integer('actions_succeeded').default(0),
  actionsFailed: integer('actions_failed').default(0),
  executionLog: jsonb('execution_log').default([]), // Detailed execution log
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Workflow Templates - Pre-built workflow templates
 */
export const workflowTemplate = pgTable('workflow_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // task_automation, notifications, integrations, etc.
  icon: text('icon'),
  triggerType: text('trigger_type').notNull(),
  triggerConfig: jsonb('trigger_config').default({}),
  conditions: jsonb('conditions').default([]),
  actions: jsonb('actions').default([]),
  isPublic: boolean('is_public').default(true),
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Workflow Variables - Store variables during execution
 */
export const workflowVariable = pgTable('workflow_variable', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // string, number, boolean, object
  defaultValue: text('default_value'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Workflow = typeof workflow.$inferSelect;
export type NewWorkflow = typeof workflow.$inferInsert;
export type WorkflowCondition = typeof workflowCondition.$inferSelect;
export type WorkflowAction = typeof workflowAction.$inferSelect;
export type WorkflowExecution = typeof workflowExecution.$inferSelect;
export type WorkflowTemplate = typeof workflowTemplate.$inferSelect;
export type WorkflowVariable = typeof workflowVariable.$inferSelect;


