/**
 * Two-Factor Authentication Service
 * 
 * Provides comprehensive 2FA functionality:
 * - TOTP (Time-based One-Time Password) generation and verification
 * - Recovery codes generation and management
 * - QR code generation for authenticator apps
 * - Backup and recovery mechanisms
 * - Integration with user authentication flow
 */

import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import logger from '../utils/logger';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  setupToken: string;
}

export interface TwoFactorValidation {
  valid: boolean;
  error?: string;
  remainingAttempts?: number;
  lockoutUntil?: Date;
}

export interface TwoFactorConfig {
  issuer: string;
  appName: string;
  window: number; // Time window for TOTP validation (default: 1)
  maxAttempts: number; // Max verification attempts before lockout
  lockoutDuration: number; // Lockout duration in seconds
  backupCodeCount: number; // Number of backup codes to generate
  secretLength: number; // Length of the secret
}

export interface UserTwoFactorData {
  userId: string;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  usedBackupCodes: string[];
  verificationAttempts: number;
  lastAttempt: Date | null;
  lockoutUntil: Date | null;
  createdAt: Date;
  lastUsed: Date | null;
}

class TwoFactorAuthService {
  private config: Required<TwoFactorConfig>;
  private userDataStore = new Map<string, UserTwoFactorData>();
  private setupTokens = new Map<string, { userId: string; secret: string; expires: Date }>();

  constructor(config: Partial<TwoFactorConfig> = {}) {
    this.config = {
      issuer: config.issuer || 'Meridian',
      appName: config.appName || 'Meridian Project Management',
      window: config.window || 1,
      maxAttempts: config.maxAttempts || 5,
      lockoutDuration: config.lockoutDuration || 900, // 15 minutes
      backupCodeCount: config.backupCodeCount || 10,
      secretLength: config.secretLength || 32,
    };

    // Configure TOTP library
    authenticator.options = {
      window: this.config.window,
    };

    logger.info('🔐 Two-Factor Authentication Service initialized', {
      issuer: this.config.issuer,
      window: this.config.window,
      maxAttempts: this.config.maxAttempts,
    });
  }

  /**
   * Generate 2FA setup for a user
   */
  async generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    try {
      // Generate secret
      const secret = authenticator.generateSecret(this.config.secretLength);

      // Generate service name for QR code
      const serviceName = `${this.config.issuer}:${userEmail}`;

      // Generate QR code URL
      const qrCodeUrl = authenticator.keyuri(
        userEmail,
        this.config.issuer,
        secret
      );

      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(this.config.backupCodeCount);

      // Generate setup token for verification
      const setupToken = this.generateSetupToken();
      const expires = new Date(Date.now() + 600000); // 10 minutes

      this.setupTokens.set(setupToken, {
        userId,
        secret,
        expires,
      });

      logger.info('🎫 2FA setup generated', {
        userId,
        userEmail,
        setupToken: setupToken.substring(0, 8) + '...',
      });

      return {
        secret,
        qrCodeUrl,
        qrCodeDataUrl,
        backupCodes,
        setupToken,
      };

    } catch (error) {
      logger.error('❌ Failed to generate 2FA setup:', error);
      throw new Error('Failed to generate 2FA setup');
    }
  }

  /**
   * Verify setup and enable 2FA for user
   */
  async enableTwoFactor(
    setupToken: string,
    verificationCode: string,
    backupCodes: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const setupData = this.setupTokens.get(setupToken);

      if (!setupData) {
        return { success: false, error: 'Invalid or expired setup token' };
      }

      if (setupData.expires < new Date()) {
        this.setupTokens.delete(setupToken);
        return { success: false, error: 'Setup token expired' };
      }

      // Verify the provided code
      const isValid = authenticator.verify({
        token: verificationCode,
        secret: setupData.secret,
      });

      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Hash backup codes for storage
      const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

      // Create user 2FA data
      const userData: UserTwoFactorData = {
        userId: setupData.userId,
        secret: setupData.secret,
        enabled: true,
        backupCodes: hashedBackupCodes,
        usedBackupCodes: [],
        verificationAttempts: 0,
        lastAttempt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      this.userDataStore.set(setupData.userId, userData);
      this.setupTokens.delete(setupToken);

      logger.info('✅ 2FA enabled for user', {
        userId: setupData.userId,
        backupCodeCount: backupCodes.length,
      });

      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to enable 2FA:', error);
      return { success: false, error: 'Failed to enable 2FA' };
    }
  }

  /**
   * Verify 2FA code for user
   */
  async verifyCode(
    userId: string,
    code: string,
    isBackupCode = false
  ): Promise<TwoFactorValidation> {
    try {
      const userData = this.userDataStore.get(userId);

      if (!userData || !userData.enabled) {
        return { valid: false, error: '2FA not enabled' };
      }

      // Check if user is locked out
      if (userData.lockoutUntil && userData.lockoutUntil > new Date()) {
        const remainingLockout = Math.ceil(
          (userData.lockoutUntil.getTime() - Date.now()) / 1000
        );
        return {
          valid: false,
          error: `Account locked. Try again in ${remainingLockout} seconds`,
          lockoutUntil: userData.lockoutUntil,
        };
      }

      // Reset lockout if expired
      if (userData.lockoutUntil && userData.lockoutUntil <= new Date()) {
        userData.lockoutUntil = null;
        userData.verificationAttempts = 0;
      }

      let isValid = false;

      if (isBackupCode) {
        isValid = this.verifyBackupCode(userData, code);
      } else {
        isValid = authenticator.verify({
          token: code,
          secret: userData.secret,
        });
      }

      if (isValid) {
        // Reset attempts on successful verification
        userData.verificationAttempts = 0;
        userData.lastAttempt = new Date();
        userData.lastUsed = new Date();
        userData.lockoutUntil = null;

        logger.info('✅ 2FA verification successful', {
          userId,
          method: isBackupCode ? 'backup-code' : 'totp',
        });

        return { valid: true };
      } else {
        // Increment failed attempts
        userData.verificationAttempts++;
        userData.lastAttempt = new Date();

        const remainingAttempts = this.config.maxAttempts - userData.verificationAttempts;

        // Lock account if max attempts reached
        if (userData.verificationAttempts >= this.config.maxAttempts) {
          userData.lockoutUntil = new Date(
            Date.now() + this.config.lockoutDuration * 1000
          );

          logger.warn('🚨 2FA account locked due to failed attempts', {
            userId,
            attempts: userData.verificationAttempts,
            lockoutUntil: userData.lockoutUntil,
          });

          return {
            valid: false,
            error: 'Too many failed attempts. Account locked.',
            lockoutUntil: userData.lockoutUntil,
          };
        }

        logger.warn('❌ 2FA verification failed', {
          userId,
          attempts: userData.verificationAttempts,
          remainingAttempts,
        });

        return {
          valid: false,
          error: 'Invalid verification code',
          remainingAttempts,
        };
      }

    } catch (error) {
      logger.error('❌ 2FA verification error:', error);
      return { valid: false, error: 'Verification failed' };
    }
  }

  /**
   * Disable 2FA for user
   */
  async disableTwoFactor(userId: string, verificationCode: string): Promise<boolean> {
    try {
      const validation = await this.verifyCode(userId, verificationCode);

      if (!validation.valid) {
        return false;
      }

      this.userDataStore.delete(userId);

      logger.info('🔓 2FA disabled for user', { userId });
      return true;

    } catch (error) {
      logger.error('❌ Failed to disable 2FA:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    verificationCode: string
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      const validation = await this.verifyCode(userId, verificationCode);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const userData = this.userDataStore.get(userId);
      if (!userData) {
        return { success: false, error: '2FA not enabled' };
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes(this.config.backupCodeCount);
      const hashedBackupCodes = newBackupCodes.map(code => this.hashBackupCode(code));

      // Update user data
      userData.backupCodes = hashedBackupCodes;
      userData.usedBackupCodes = [];

      logger.info('🔄 Backup codes regenerated', {
        userId,
        codeCount: newBackupCodes.length,
      });

      return { success: true, backupCodes: newBackupCodes };

    } catch (error) {
      logger.error('❌ Failed to regenerate backup codes:', error);
      return { success: false, error: 'Failed to regenerate backup codes' };
    }
  }

  /**
   * Get user 2FA status
   */
  getTwoFactorStatus(userId: string): {
    enabled: boolean;
    lastUsed: Date | null;
    backupCodesRemaining: number;
    isLocked: boolean;
  } {
    const userData = this.userDataStore.get(userId);

    if (!userData) {
      return {
        enabled: false,
        lastUsed: null,
        backupCodesRemaining: 0,
        isLocked: false,
      };
    }

    const isLocked = userData.lockoutUntil ? userData.lockoutUntil > new Date() : false;
    const backupCodesRemaining = userData.backupCodes.length - userData.usedBackupCodes.length;

    return {
      enabled: userData.enabled,
      lastUsed: userData.lastUsed,
      backupCodesRemaining,
      isLocked,
    };
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Generate setup token
   */
  private generateSetupToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash backup code for secure storage
   */
  private hashBackupCode(code: string): string {
    return createHash('sha256').update(code.toLowerCase()).digest('hex');
  }

  /**
   * Verify backup code
   */
  private verifyBackupCode(userData: UserTwoFactorData, code: string): boolean {
    const hashedCode = this.hashBackupCode(code);

    // Check if code exists and hasn't been used
    const codeIndex = userData.backupCodes.indexOf(hashedCode);
    if (codeIndex === -1 || userData.usedBackupCodes.includes(hashedCode)) {
      return false;
    }

    // Mark code as used
    userData.usedBackupCodes.push(hashedCode);

    return true;
  }

  /**
   * Clean up expired setup tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.setupTokens.entries()) {
      if (data.expires < now) {
        this.setupTokens.delete(token);
      }
    }
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalUsers: number;
    enabledUsers: number;
    activeSetups: number;
    lockedUsers: number;
    averageBackupCodesUsed: number;
  } {
    const enabledUsers = Array.from(this.userDataStore.values()).filter(u => u.enabled);
    const lockedUsers = enabledUsers.filter(u => 
      u.lockoutUntil && u.lockoutUntil > new Date()
    );

    const totalBackupCodesUsed = enabledUsers.reduce(
      (sum, user) => sum + user.usedBackupCodes.length,
      0
    );

    return {
      totalUsers: this.userDataStore.size,
      enabledUsers: enabledUsers.length,
      activeSetups: this.setupTokens.size,
      lockedUsers: lockedUsers.length,
      averageBackupCodesUsed: enabledUsers.length > 0 
        ? totalBackupCodesUsed / enabledUsers.length 
        : 0,
    };
  }
}

// Singleton instance
let twoFactorService: TwoFactorAuthService | null = null;

/**
 * Get singleton 2FA service instance
 */
export function getTwoFactorService(config?: Partial<TwoFactorConfig>): TwoFactorAuthService {
  if (!twoFactorService) {
    twoFactorService = new TwoFactorAuthService(config);
  }
  return twoFactorService;
}

/**
 * Initialize 2FA service with custom configuration
 */
export function initializeTwoFactorService(config: Partial<TwoFactorConfig>): TwoFactorAuthService {
  twoFactorService = new TwoFactorAuthService(config);
  return twoFactorService;
}

export default TwoFactorAuthService;

