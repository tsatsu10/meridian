/**
 * Email Verification & Password Reset Tokens Schema
 * Phase 0 - Email System Implementation
 */

import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Email Verification Tokens
 * Stores tokens for email verification during registration
 */
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // User relation
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  
  // Token data
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  
  // Usage tracking
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  
  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Password Reset Tokens
 * Stores tokens for password reset functionality
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // User relation
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email")
    .notNull()
    .references(() => users.email, { onDelete: "cascade" }),
  
  // Token data
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  
  // Usage tracking
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  
  // Security tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Email Change Requests
 * Tracks email change requests with verification
 */
export const emailChangeRequests = pgTable("email_change_requests", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // User relation
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Email data
  oldEmail: text("old_email").notNull(),
  newEmail: text("new_email").notNull(),
  
  // Verification tokens
  oldEmailToken: text("old_email_token").notNull().unique(), // Verify old email
  newEmailToken: text("new_email_token").notNull().unique(), // Verify new email
  
  // Status
  oldEmailVerified: boolean("old_email_verified").default(false).notNull(),
  newEmailVerified: boolean("new_email_verified").default(false).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  
  // Expiry
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Type exports for TypeScript
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type EmailChangeRequest = typeof emailChangeRequests.$inferSelect;
export type NewEmailChangeRequest = typeof emailChangeRequests.$inferInsert;


