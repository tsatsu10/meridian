/**
 * Two-Factor Authentication Middleware
 * 
 * Middleware for enforcing 2FA requirements:
 * - 2FA setup flow
 * - 2FA verification during login
 * - 2FA requirements for sensitive operations
 * - Recovery code handling
 */

import { Context, Next } from 'hono';
import { getTwoFactorService } from '../services/two-factor-auth';
import { getSecurityLoggingService } from '../services/security-logging';
import logger from '../utils/logger';

export interface TwoFactorMiddlewareOptions {
  enforceFor?: string[]; // User roles that require 2FA
  gracePeriod?: number; // Grace period in seconds for new users
  skipPaths?: string[]; // Paths to skip 2FA check
}

/**
 * Middleware to enforce 2FA for protected operations
 */
export const requireTwoFactor = (options: TwoFactorMiddlewareOptions = {}) => {
  const twoFactorService = getTwoFactorService();
  const securityLogger = getSecurityLoggingService();

  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const sessionId = c.get('sessionId');
    const path = c.req.path;
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    // Skip if no user or session
    if (!user || !sessionId) {
      await next();
      return;
    }

    // Skip for configured paths
    if (options.skipPaths?.some(skipPath => path.startsWith(skipPath))) {
      await next();
      return;
    }

    // Check if 2FA is required for this user role
    const requiresEnforcement = options.enforceFor?.includes(user.role) || false;

    try {
      const twoFactorStatus = twoFactorService.getTwoFactorStatus(user.id);

      // If 2FA is not enabled and enforcement is required
      if (requiresEnforcement && !twoFactorStatus.enabled) {
        // Check grace period for new accounts
        if (options.gracePeriod) {
          const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / 1000;
          if (accountAge < options.gracePeriod) {
            await next();
            return;
          }
        }

        securityLogger.logEvent({
          type: 'authorization',
          severity: 'medium',
          userId: user.id,
          sessionId,
          ip,
          resource: path,
          action: '2fa_required',
          details: {
            userRole: user.role,
            enforcementRequired: true,
          },
          blocked: true,
        });

        return c.json({
          error: 'Two-factor authentication required',
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Your account requires two-factor authentication to be enabled for this operation',
        }, 403);
      }

      // If 2FA is enabled, check session 2FA verification
      if (twoFactorStatus.enabled) {
        const sessionData = c.get('sessionData');
        const twoFactorVerified = sessionData?.twoFactorVerified || false;
        const verificationTime = sessionData?.twoFactorVerificationTime;

        // Check if 2FA verification is required (not verified or verification expired)
        const verificationExpiry = 3600; // 1 hour
        const isVerificationExpired = verificationTime &&
          (Date.now() - verificationTime) / 1000 > verificationExpiry;

        if (!twoFactorVerified || isVerificationExpired) {
          securityLogger.logEvent({
            type: 'authentication',
            severity: 'medium',
            userId: user.id,
            sessionId,
            ip,
            details: {
              reason: !twoFactorVerified ? '2fa_not_verified' : '2fa_verification_expired',
              verificationTime,
            },
            blocked: true,
          });

          return c.json({
            error: 'Two-factor authentication verification required',
            code: 'TWO_FACTOR_VERIFICATION_REQUIRED',
            message: 'Please verify your two-factor authentication code',
          }, 401);
        }
      }

      await next();

    } catch (error) {
      logger.error('❌ 2FA middleware error:', error);

      securityLogger.logEvent({
        type: 'authentication',
        severity: 'high',
        userId: user.id,
        sessionId,
        ip,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          middleware: '2fa_check',
        },
        blocked: true,
      });

      return c.json({
        error: 'Authentication verification failed',
        code: 'TWO_FACTOR_ERROR',
      }, 500);
    }
  };
};

/**
 * Middleware to handle 2FA verification during login
 */
export const twoFactorVerificationMiddleware = () => {
  const twoFactorService = getTwoFactorService();
  const securityLogger = getSecurityLoggingService();

  return async (c: Context, next: Next) => {
    const { code, isBackupCode } = await c.req.json();
    const user = c.get('user');
    const sessionId = c.get('sessionId');
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    if (!user || !sessionId) {
      return c.json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      }, 401);
    }

    if (!code) {
      return c.json({
        error: 'Verification code required',
        code: 'CODE_REQUIRED',
      }, 400);
    }

    try {
      const verification = await twoFactorService.verifyCode(
        user.id,
        code,
        isBackupCode || false
      );

      if (verification.valid) {
        // Mark session as 2FA verified
        const sessionData = c.get('sessionData') || {};
        sessionData.twoFactorVerified = true;
        sessionData.twoFactorVerificationTime = Date.now();
        c.set('sessionData', sessionData);

        securityLogger.logAuthenticationEvent(
          'login_success',
          user.id,
          ip,
          {
            method: '2fa_verification',
            codeType: isBackupCode ? 'backup' : 'totp',
          }
        );

        logger.info('✅ 2FA verification successful', {
          userId: user.id,
          method: isBackupCode ? 'backup' : 'totp',
        });

        return c.json({
          success: true,
          message: 'Two-factor authentication verified successfully',
        });
      } else {
        securityLogger.logAuthenticationEvent(
          'login_failure',
          user.id,
          ip,
          {
            method: '2fa_verification',
            error: verification.error,
            remainingAttempts: verification.remainingAttempts,
          }
        );

        const response: any = {
          error: verification.error || 'Invalid verification code',
          code: 'VERIFICATION_FAILED',
        };

        if (verification.remainingAttempts !== undefined) {
          response.remainingAttempts = verification.remainingAttempts;
        }

        if (verification.lockoutUntil) {
          response.lockoutUntil = verification.lockoutUntil;
        }

        return c.json(response, 400);
      }

    } catch (error) {
      logger.error('❌ 2FA verification error:', error);

      securityLogger.logEvent({
        type: 'authentication',
        severity: 'high',
        userId: user.id,
        sessionId,
        ip,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          action: '2fa_verification',
        },
        blocked: true,
      });

      return c.json({
        error: 'Verification failed',
        code: 'VERIFICATION_ERROR',
      }, 500);
    }
  };
};

/**
 * Middleware to check if user has 2FA enabled
 */
export const twoFactorStatusMiddleware = () => {
  const twoFactorService = getTwoFactorService();

  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      }, 401);
    }

    try {
      const status = twoFactorService.getTwoFactorStatus(user.id);
      c.set('twoFactorStatus', status);
      await next();

    } catch (error) {
      logger.error('❌ 2FA status check error:', error);
      return c.json({
        error: 'Failed to check 2FA status',
        code: 'STATUS_CHECK_ERROR',
      }, 500);
    }
  };
};

export default {
  requireTwoFactor,
  twoFactorVerificationMiddleware,
  twoFactorStatusMiddleware,
};

