/**
 * Billing Database Schema
 * Stores billing customers, subscriptions, and payment history
 */

import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { workspaces, users } from '../database/schema';

// Billing Customers - Maps workspaces to payment provider customers
export const billingCustomers = pgTable('billing_customers', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }).unique(),
  provider: text('provider').notNull(), // 'stripe' or 'paystack'
  providerCustomerId: text('provider_customer_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Billing Subscriptions - Active subscriptions
export const billingSubscriptions = pgTable('billing_subscriptions', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  customerId: text('customer_id').notNull().references(() => billingCustomers.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerSubscriptionId: text('provider_subscription_id').notNull().unique(),
  planId: text('plan_id').notNull(),
  planName: text('plan_name').notNull(),
  status: text('status').notNull(), // 'active', 'past_due', 'canceled', 'unpaid', 'trialing'
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  amount: integer('amount').notNull(), // In cents
  currency: text('currency').notNull().default('usd'),
  interval: text('interval').notNull(), // 'month' or 'year'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Billing Invoices - Payment history
export const billingInvoices = pgTable('billing_invoices', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  customerId: text('customer_id').notNull().references(() => billingCustomers.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id').references(() => billingSubscriptions.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  providerInvoiceId: text('provider_invoice_id').notNull().unique(),
  number: text('number').notNull(),
  amount: integer('amount').notNull(), // In cents
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull(), // 'draft', 'open', 'paid', 'void', 'uncollectible'
  paidAt: timestamp('paid_at', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  description: text('description'),
  invoiceUrl: text('invoice_url'),
  pdfUrl: text('pdf_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Payment Methods - Stored payment methods (cards, etc.)
export const paymentMethods = pgTable('payment_methods', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  customerId: text('customer_id').notNull().references(() => billingCustomers.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerPaymentMethodId: text('provider_payment_method_id').notNull().unique(),
  type: text('type').notNull(), // 'card', 'bank_account', 'wallet'
  brand: text('brand'), // visa, mastercard, etc.
  last4: text('last4').notNull(),
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  isDefault: boolean('is_default').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Webhook Events - Track processed webhook events
export const billingWebhookEvents = pgTable('billing_webhook_events', {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  provider: text('provider').notNull(),
  providerEventId: text('provider_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type BillingCustomerDB = typeof billingCustomers.$inferSelect;
export type BillingSubscriptionDB = typeof billingSubscriptions.$inferSelect;
export type BillingInvoiceDB = typeof billingInvoices.$inferSelect;
export type PaymentMethodDB = typeof paymentMethods.$inferSelect;
export type BillingWebhookEventDB = typeof billingWebhookEvents.$inferSelect;

