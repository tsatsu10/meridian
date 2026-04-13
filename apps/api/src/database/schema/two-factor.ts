/**
 * Two-Factor Authentication Schema
 * Database schema for 2FA settings and backup codes
 * Phase 1 - Two-Factor Authentication
 */

import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from '../schema';

/**
 * Two-Factor Authentication Settings
 */
export const twoFactorAuth = pgTable('two_factor_auth', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // TOTP secret (encrypted)
  secret: text('secret').notNull(),
  
  // Is 2FA enabled?
  enabled: boolean('enabled').default(false).notNull(),
  
  // Backup codes (hashed)
  backupCodes: text('backup_codes').array(),
  
  // Recovery email
  recoveryEmail: text('recovery_email'),
  
  // Last verified
  lastVerifiedAt: timestamp('last_verified_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Two-Factor Backup Codes Usage Log
 */
export const twoFactorBackupCodeUsage = pgTable('two_factor_backup_code_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Which backup code was used (1-10)
  codeNumber: integer('code_number').notNull(),
  
  // When it was used
  usedAt: timestamp('used_at').defaultNow().notNull(),
  
  // IP address
  ipAddress: text('ip_address'),
  
  // User agent
  userAgent: text('user_agent'),
});

/**
 * Two-Factor Authentication Attempts Log
 */
export const twoFactorAttempt = pgTable('two_factor_attempt', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Was the attempt successful?
  success: boolean('success').notNull(),
  
  // Type of authentication used
  type: text('type').notNull(), // 'totp' | 'backup_code' | 'recovery'
  
  // IP address
  ipAddress: text('ip_address'),
  
  // User agent
  userAgent: text('user_agent'),
  
  // Timestamp
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
});

export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;
export type NewTwoFactorAuth = typeof twoFactorAuth.$inferInsert;
export type TwoFactorBackupCodeUsage = typeof twoFactorBackupCodeUsage.$inferSelect;
export type TwoFactorAttempt = typeof twoFactorAttempt.$inferSelect;


