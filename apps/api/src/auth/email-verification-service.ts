/**
 * Email Verification Service
 * Handles email verification, password reset, and email change flows
 * Phase 0 - Day 2 Implementation
 */

import { getDatabase } from '../database/connection';
import { 
  emailVerificationTokens, 
  passwordResetTokens,
  emailChangeRequests,
  type NewEmailVerificationToken,
  type NewPasswordResetToken,
  type NewEmailChangeRequest
} from '../database/schema/email-verification';
import { users } from '../database/schema';
import { eq, and, lt, gt } from 'drizzle-orm';
import { emailService } from '../services/email/email-service';
import crypto from 'crypto';
import logger from '../utils/logger';

export class EmailVerificationService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Generate secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate JWT token for email verification
   * Alternative to random token - more secure, self-contained
   */
  private generateJWTToken(userId: string, email: string, expiryHours: number = 24): string {
    // Using simple signed token - can be upgraded to full JWT later
    const payload = {
      userId,
      email,
      exp: Date.now() + (expiryHours * 60 * 60 * 1000)
    };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
      .update(token)
      .digest('hex');
    return `${token}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  private verifyJWTToken(token: string): { userId: string; email: string } | null {
    try {
      const [payload, signature] = token.split('.');
      if (!payload || !signature) {
        return null;
      }

      const secret = process.env.JWT_SECRET ?? 'fallback-secret';

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        logger.error('❌ Token signature verification failed');
        return null;
      }
      
      // Parse payload
      const data = JSON.parse(Buffer.from(payload, 'base64').toString()) as {
        userId?: string;
        email?: string;
        exp?: number;
      };
      
      // Check expiry
      if (typeof data.exp !== 'number' || data.exp < Date.now()) {
        logger.error('❌ Token expired');
        return null;
      }
      
      if (typeof data.userId !== 'string' || typeof data.email !== 'string') {
        return null;
      }
      return { userId: data.userId, email: data.email };
    } catch (error) {
      logger.error('❌ Token verification error:', error);
      return null;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    userId: string,
    email: string,
    name: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Generate token
      const token = this.generateJWTToken(userId, email, 24); // 24 hour expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Store token in database
      await this.getDb().insert(emailVerificationTokens).values({
        userId,
        userEmail: email,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      });
      
      // Send email
      const sent = await emailService.sendVerificationEmail(email, token, name);
      
      if (sent) {
        logger.debug(`✅ Verification email sent to ${email}`);
        return true;
      } else {
        logger.error(`❌ Failed to send verification email to ${email}`);
        return false;
      }
    } catch (error) {
      logger.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Verify JWT token first
      const tokenData = this.verifyJWTToken(token);
      if (!tokenData) {
        return { success: false, message: 'Invalid or expired token' };
      }
      
      // Check if token exists in database and hasn't been used
      const [tokenRecord] = await this.getDb()
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.token, token),
            eq(emailVerificationTokens.isUsed, false),
            gt(emailVerificationTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!tokenRecord) {
        return { success: false, message: 'Token not found, already used, or expired' };
      }
      
      // Mark token as used
      await this.getDb()
        .update(emailVerificationTokens)
        .set({ 
          isUsed: true, 
          usedAt: new Date() 
        })
        .where(eq(emailVerificationTokens.id, tokenRecord.id));
      
      // Update user as verified
      await this.getDb()
        .update(users)
        .set({ isEmailVerified: true })
        .where(eq(users.id, tokenRecord.userId));
      
      // Get user details for welcome email
      const [user] = await this.getDb()
        .select()
        .from(users)
        .where(eq(users.id, tokenRecord.userId))
        .limit(1);
      
      if (user) {
        // Send welcome email
        await emailService.sendWelcomeEmail(user.email, user.name);
      }
      
      logger.debug(`✅ Email verified for user ${tokenRecord.userId}`);
      return { 
        success: true, 
        message: 'Email verified successfully',
        userId: tokenRecord.userId 
      };
    } catch (error) {
      logger.error('❌ Error verifying email:', error);
      return { success: false, message: 'Verification failed' };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      const [user] = await this.getDb()
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      if (user.isEmailVerified) {
        return { success: false, message: 'Email already verified' };
      }
      
      // Check if a verification email was recently sent (rate limiting)
      const recentTokens = await this.getDb()
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.userId, user.id),
            gt(emailVerificationTokens.createdAt, new Date(Date.now() - 60 * 1000)) // Last 60 seconds
          )
        );
      
      if (recentTokens.length > 0) {
        return { 
          success: false, 
          message: 'Please wait before requesting another verification email' 
        };
      }
      
      // Send new verification email
      const sent = await this.sendVerificationEmail(
        user.id,
        user.email,
        user.name,
        ipAddress,
        userAgent
      );
      
      if (sent) {
        return { success: true, message: 'Verification email sent' };
      } else {
        return { success: false, message: 'Failed to send verification email' };
      }
    } catch (error) {
      logger.error('❌ Error resending verification email:', error);
      return { success: false, message: 'Failed to resend verification email' };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      const [user] = await this.getDb()
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      // Always return success for security (don't reveal if email exists)
      if (!user) {
        logger.debug(`⚠️  Password reset requested for non-existent email: ${email}`);
        return { success: true, message: 'If the email exists, a reset link has been sent' };
      }
      
      // Check if a reset email was recently sent (rate limiting)
      const recentTokens = await this.getDb()
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            gt(passwordResetTokens.createdAt, new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
          )
        );
      
      if (recentTokens.length > 0) {
        logger.debug(`⚠️  Password reset rate limited for: ${email}`);
        return { 
          success: true, // Still return success for security
          message: 'If the email exists, a reset link has been sent' 
        };
      }
      
      // Generate token
      const token = this.generateJWTToken(user.id, user.email, 1); // 1 hour expiry
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
      
      // Store token in database
      await this.getDb().insert(passwordResetTokens).values({
        userId: user.id,
        userEmail: user.email,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      });
      
      // Send email
      await emailService.sendPasswordResetEmail(user.email, token, user.name);
      
      logger.debug(`✅ Password reset email sent to ${email}`);
      return { success: true, message: 'If the email exists, a reset link has been sent' };
    } catch (error) {
      logger.error('❌ Error sending password reset email:', error);
      return { success: false, message: 'Failed to send password reset email' };
    }
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<{ success: boolean; userId?: string; message: string }> {
    try {
      // Verify JWT token first
      const tokenData = this.verifyJWTToken(token);
      if (!tokenData) {
        return { success: false, message: 'Invalid or expired token' };
      }
      
      // Check if token exists in database and hasn't been used
      const [tokenRecord] = await this.getDb()
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.isUsed, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!tokenRecord) {
        return { success: false, message: 'Token not found, already used, or expired' };
      }
      
      return { 
        success: true, 
        userId: tokenRecord.userId,
        message: 'Token valid' 
      };
    } catch (error) {
      logger.error('❌ Error verifying password reset token:', error);
      return { success: false, message: 'Token verification failed' };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify token
      const verification = await this.verifyPasswordResetToken(token);
      if (!verification.success || !verification.userId) {
        return { success: false, message: verification.message };
      }
      
      // Hash new password (assuming bcrypt is used)
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update password
      await this.getDb()
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, verification.userId));
      
      // Mark token as used
      await this.getDb()
        .update(passwordResetTokens)
        .set({ 
          isUsed: true, 
          usedAt: new Date() 
        })
        .where(eq(passwordResetTokens.token, token));
      
      // Invalidate all other password reset tokens for this user
      await this.getDb()
        .update(passwordResetTokens)
        .set({ isUsed: true })
        .where(
          and(
            eq(passwordResetTokens.userId, verification.userId),
            eq(passwordResetTokens.isUsed, false)
          )
        );
      
      logger.debug(`✅ Password reset successful for user ${verification.userId}`);
      return { success: true, message: 'Password reset successful' };
    } catch (error) {
      logger.error('❌ Error resetting password:', error);
      return { success: false, message: 'Password reset failed' };
    }
  }

  /**
   * Clean up expired tokens (run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      
      // Delete expired verification tokens
      const deletedVerification = await this.getDb()
        .delete(emailVerificationTokens)
        .where(lt(emailVerificationTokens.expiresAt, now))
        .returning();
      
      // Delete expired password reset tokens
      const deletedReset = await this.getDb()
        .delete(passwordResetTokens)
        .where(lt(passwordResetTokens.expiresAt, now))
        .returning();
      
      const totalDeleted = deletedVerification.length + deletedReset.length;
      
      if (totalDeleted > 0) {
        logger.debug(`🧹 Cleaned up ${totalDeleted} expired tokens`);
      }
      
      return totalDeleted;
    } catch (error) {
      logger.error('❌ Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const emailVerificationService = new EmailVerificationService();



