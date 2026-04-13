/**
 * Reports & Analytics Schema
 * Phase 3.4 - Advanced Analytics & Reporting
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Report Templates - Saved report configurations
 */
export const reportTemplate = pgTable('report_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // task, project, resource, time, custom
  category: text('category'), // productivity, performance, capacity, etc.
  dataSource: text('data_source').notNull(), // tasks, projects, users, etc.
  filters: jsonb('filters').default({}), // Filter configuration
  groupBy: jsonb('group_by').default([]), // Grouping fields
  columns: jsonb('columns').default([]), // Selected columns
  aggregations: jsonb('aggregations').default([]), // Sum, count, avg, etc.
  sortBy: jsonb('sort_by').default([]), // Sorting configuration
  chartType: text('chart_type'), // bar, line, pie, table, etc.
  chartConfig: jsonb('chart_config').default({}), // Chart-specific settings
  isPublic: boolean('is_public').default(false),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Scheduled Reports - Automated report generation
 */
export const scheduledReport = pgTable('scheduled_report', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportTemplateId: uuid('report_template_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  name: text('name').notNull(),
  schedule: text('schedule').notNull(), // daily, weekly, monthly, custom cron
  scheduleConfig: jsonb('schedule_config').default({}), // Time, day, etc.
  format: text('format').default('pdf'), // pdf, excel, csv
  recipients: jsonb('recipients').default([]), // Email addresses
  isActive: boolean('is_active').default(true),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Report Executions - History of generated reports
 */
export const reportExecution = pgTable('report_execution', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportTemplateId: uuid('report_template_id'),
  scheduledReportId: uuid('scheduled_report_id'), // null if manual
  workspaceId: uuid('workspace_id').notNull(),
  status: text('status').notNull(), // success, failed, processing
  format: text('format').notNull(), // pdf, excel, csv
  fileUrl: text('file_url'), // S3/storage URL
  fileSize: integer('file_size'), // Bytes
  rowCount: integer('row_count'), // Number of records
  executionTimeMs: integer('execution_time_ms'),
  error: text('error'),
  generatedBy: uuid('generated_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Report Dashboards - Custom dashboard configurations
 */
export const reportDashboard = pgTable('report_dashboard', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  layout: jsonb('layout').default([]), // Grid layout configuration
  widgets: jsonb('widgets').default([]), // Widget configurations
  refreshInterval: integer('refresh_interval'), // Auto-refresh in seconds
  isDefault: boolean('is_default').default(false),
  isPublic: boolean('is_public').default(false),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type ReportTemplate = typeof reportTemplate.$inferSelect;
export type NewReportTemplate = typeof reportTemplate.$inferInsert;
export type ScheduledReport = typeof scheduledReport.$inferSelect;
export type ReportExecution = typeof reportExecution.$inferSelect;
export type ReportDashboard = typeof reportDashboard.$inferSelect;


