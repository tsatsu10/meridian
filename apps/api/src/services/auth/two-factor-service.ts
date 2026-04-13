/**
 * Two-Factor Authentication Service
 * TOTP-based 2FA with backup codes and recovery
 * Phase 1 - Two-Factor Authentication
 */

import { authenticator } from 'otplib';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { getDatabase } from '../../database/connection';
import { twoFactorAuth, twoFactorBackupCodeUsage, twoFactorAttempt } from '../../database/schema/two-factor';
import { user } from '../../database/schema';
import { eq } from 'drizzle-orm';
import logger from '../../utils/logger';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface VerifyResult {
  success: boolean;
  message: string;
  usedBackupCode?: boolean;
}

export class TwoFactorService {
  /**
   * Generate 2FA secret and setup data
   */
  static async generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    try {
      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Generate OTP auth URL for QR code
      const otpAuthUrl = authenticator.keyuri(
        userEmail,
        'Meridian',
        secret
      );
      
      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Format secret for manual entry (more readable)
      const manualEntryKey = secret.match(/.{1,4}/g)?.join('-') || secret;
      
      return {
        secret,
        qrCodeUrl,
        backupCodes,
        manualEntryKey,
      };
    } catch (error) {
      logger.error('❌ Failed to generate 2FA setup:', error);
      throw new Error('Failed to generate 2FA setup');
    }
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  static hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.toLowerCase())
      .digest('hex');
  }

  /**
   * Enable 2FA for user
   */
  static async enableTwoFactor(
    userId: string,
    secret: string,
    verificationCode: string,
    backupCodes: string[]
  ): Promise<boolean> {
    try {
      const db = getDatabase();
      // Verify the code before enabling
      const isValid = authenticator.verify({
        token: verificationCode,
        secret,
      });

      if (!isValid) {
        logger.warn('⚠️  Invalid verification code during 2FA setup');
        return false;
      }

      // Hash backup codes
      const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

      // Check if 2FA settings already exist
      const existing = await db
        .select()
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(twoFactorAuth)
          .set({
            secret,
            enabled: true,
            backupCodes: hashedBackupCodes,
            lastVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(twoFactorAuth.userId, userId));
      } else {
        // Create new
        await db.insert(twoFactorAuth).values({
          id: createId(),
          userId,
          secret,
          enabled: true,
          backupCodes: hashedBackupCodes,
          lastVerifiedAt: new Date(),
        });
      }

      // Log successful setup
      await this.logAttempt(userId, true, 'totp', null, null);

      logger.debug(`✅ 2FA enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to enable 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  /**
   * Disable 2FA for user
   */
  static async disableTwoFactor(userId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      await db
        .update(twoFactorAuth)
        .set({
          enabled: false,
          updatedAt: new Date(),
        })
        .where(eq(twoFactorAuth.userId, userId));

      logger.debug(`✅ 2FA disabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to disable 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  /**
   * Verify TOTP code
   */
  static async verifyCode(
    userId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VerifyResult> {
    try {
      const db = getDatabase();
      // Get user's 2FA settings
      const settings = await db
        .select()
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, userId))
        .limit(1);

      if (settings.length === 0 || !settings[0].enabled) {
        return {
          success: false,
          message: '2FA not enabled for this user',
        };
      }

      const twoFactor = settings[0];

      // Try TOTP first
      const isValidTOTP = authenticator.verify({
        token: code,
        secret: twoFactor.secret,
      });

      if (isValidTOTP) {
        // Update last verified
        await db
          .update(twoFactorAuth)
          .set({ lastVerifiedAt: new Date() })
          .where(eq(twoFactorAuth.userId, userId));

        // Log successful attempt
        await this.logAttempt(userId, true, 'totp', ipAddress, userAgent);

        return {
          success: true,
          message: '2FA code verified successfully',
        };
      }

      // Try backup codes
      const hashedCode = this.hashBackupCode(code);
      const backupCodes = twoFactor.backupCodes || [];

      if (backupCodes.includes(hashedCode)) {
        // Find which backup code was used
        const codeIndex = backupCodes.indexOf(hashedCode);

        // Remove used backup code
        const newBackupCodes = backupCodes.filter((c) => c !== hashedCode);
        await db
          .update(twoFactorAuth)
          .set({
            backupCodes: newBackupCodes,
            lastVerifiedAt: new Date(),
          })
          .where(eq(twoFactorAuth.userId, userId));

        // Log backup code usage
        await db.insert(twoFactorBackupCodeUsage).values({
          id: createId(),
          userId,
          codeNumber: codeIndex + 1,
          ipAddress,
          userAgent,
        });

        // Log successful attempt
        await this.logAttempt(userId, true, 'backup_code', ipAddress, userAgent);

        // Warn if running low on backup codes
        const remainingCodes = newBackupCodes.length;
        const warning = remainingCodes <= 2 ? ` Warning: Only ${remainingCodes} backup codes remaining!` : '';

        return {
          success: true,
          message: `Backup code verified successfully.${warning}`,
          usedBackupCode: true,
        };
      }

      // Invalid code
      await this.logAttempt(userId, false, 'totp', ipAddress, userAgent);

      return {
        success: false,
        message: 'Invalid 2FA code',
      };
    } catch (error) {
      logger.error('❌ Failed to verify 2FA code:', error);
      throw new Error('Failed to verify 2FA code');
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  static async isEnabled(userId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      const settings = await db
        .select()
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, userId))
        .limit(1);

      return settings.length > 0 && settings[0].enabled;
    } catch (error) {
      logger.error('❌ Failed to check 2FA status:', error);
      return false;
    }
  }

  /**
   * Get user's 2FA settings
   */
  static async getSettings(userId: string) {
    try {
      const db = getDatabase();
      const settings = await db
        .select({
          enabled: twoFactorAuth.enabled,
          backupCodesCount: twoFactorAuth.backupCodes,
          lastVerifiedAt: twoFactorAuth.lastVerifiedAt,
          createdAt: twoFactorAuth.createdAt,
        })
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, userId))
        .limit(1);

      if (settings.length === 0) {
        return null;
      }

      const setting = settings[0];
      
      return {
        enabled: setting.enabled,
        backupCodesRemaining: setting.backupCodesCount?.length || 0,
        lastVerifiedAt: setting.lastVerifiedAt,
        createdAt: setting.createdAt,
      };
    } catch (error) {
      logger.error('❌ Failed to get 2FA settings:', error);
      return null;
    }
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const db = getDatabase();
      // Generate new codes
      const newCodes = this.generateBackupCodes();
      const hashedCodes = newCodes.map(code => this.hashBackupCode(code));

      // Update in database
      await db
        .update(twoFactorAuth)
        .set({
          backupCodes: hashedCodes,
          updatedAt: new Date(),
        })
        .where(eq(twoFactorAuth.userId, userId));

      logger.debug(`✅ Regenerated backup codes for user ${userId}`);
      return newCodes;
    } catch (error) {
      logger.error('❌ Failed to regenerate backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Log authentication attempt
   */
  private static async logAttempt(
    userId: string,
    success: boolean,
    type: 'totp' | 'backup_code' | 'recovery',
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    try {
      const db = getDatabase();
      await db.insert(twoFactorAttempt).values({
        id: createId(),
        userId,
        success,
        type,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      logger.error('❌ Failed to log 2FA attempt:', error);
      // Don't throw - logging failure shouldn't break auth flow
    }
  }

  /**
   * Get recent authentication attempts
   */
  static async getRecentAttempts(userId: string, limit: number = 10) {
    try {
      const db = getDatabase();
      const attempts = await db
        .select()
        .from(twoFactorAttempt)
        .where(eq(twoFactorAttempt.userId, userId))
        .orderBy(twoFactorAttempt.attemptedAt)
        .limit(limit);

      return attempts;
    } catch (error) {
      logger.error('❌ Failed to get recent attempts:', error);
      return [];
    }
  }
}



