/**
 * Time Tracking & Billing Schema
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import { pgTable, uuid, text, timestamp, numeric, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

/**
 * Time Entries - Enhanced time tracking
 */
export const timeEntry = pgTable('time_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id').notNull(),
  taskId: uuid('task_id'),
  userId: uuid('user_id').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // Minutes
  isBillable: boolean('is_billable').default(true),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  status: text('status').default('active'), // active, paused, stopped, approved, invoiced
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Timesheets - Weekly/monthly timesheet summaries
 */
export const timesheet = pgTable('timesheet', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: uuid('user_id').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  status: text('status').notNull(), // draft, submitted, approved, rejected
  totalHours: numeric('total_hours', { precision: 10, scale: 2 }),
  billableHours: numeric('billable_hours', { precision: 10, scale: 2 }),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }),
  submittedAt: timestamp('submitted_at'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Billing Rates - Project/user-specific billing rates
 */
export const billingRate = pgTable('billing_rate', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id'),
  userId: uuid('user_id'),
  roleId: uuid('role_id'),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),
  isDefault: boolean('is_default').default(false),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Invoices - Client invoicing
 */
export const invoice = pgTable('invoice', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id').notNull(),
  clientId: uuid('client_id'),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: text('status').notNull(), // draft, sent, paid, overdue, cancelled
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  paymentTerms: text('payment_terms'),
  notes: text('notes'),
  paidAt: timestamp('paid_at'),
  sentAt: timestamp('sent_at'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Invoice Line Items - Individual invoice items
 */
export const invoiceLineItem = pgTable('invoice_line_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull(),
  timesheetId: uuid('timesheet_id'),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Expense Entries - Project expenses
 */
export const expenseEntry = pgTable('expense_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id').notNull(),
  userId: uuid('user_id').notNull(),
  category: text('category').notNull(), // travel, meals, supplies, etc.
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  expenseDate: timestamp('expense_date').notNull(),
  receiptUrl: text('receipt_url'),
  isBillable: boolean('is_billable').default(false),
  isReimbursable: boolean('is_reimbursable').default(true),
  status: text('status').default('pending'), // pending, approved, rejected, reimbursed
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Budget Tracking - Project budgets
 */
export const projectBudget = pgTable('project_budget', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().unique(),
  totalBudget: numeric('total_budget', { precision: 10, scale: 2 }),
  hoursBudget: numeric('hours_budget', { precision: 10, scale: 2 }),
  expensesBudget: numeric('expenses_budget', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  alertThreshold: integer('alert_threshold').default(80), // Percentage
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type TimeEntry = typeof timeEntry.$inferSelect;
export type NewTimeEntry = typeof timeEntry.$inferInsert;
export type Timesheet = typeof timesheet.$inferSelect;
export type BillingRate = typeof billingRate.$inferSelect;
export type Invoice = typeof invoice.$inferSelect;
export type InvoiceLineItem = typeof invoiceLineItem.$inferSelect;
export type ExpenseEntry = typeof expenseEntry.$inferSelect;
export type ProjectBudget = typeof projectBudget.$inferSelect;


