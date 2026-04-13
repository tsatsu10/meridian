/**
 * Two-Factor Authentication API Routes
 * Endpoints for 2FA setup, verification, and management
 * Phase 1 - Two-Factor Authentication
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TwoFactorService } from '../services/auth/two-factor-service';
import { endpointRateLimit } from '../middlewares/global-rate-limit';
import logger from '../utils/logger';

const twoFactor = new Hono();

/**
 * Validation schemas
 */
const setupSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
});

const enableSchema = z.object({
  userId: z.string(),
  secret: z.string(),
  verificationCode: z.string().length(6),
  backupCodes: z.array(z.string()).length(10),
});

const verifySchema = z.object({
  userId: z.string(),
  code: z.string().min(6).max(8),
});

const disableSchema = z.object({
  userId: z.string(),
  password: z.string(),
});

/**
 * POST /api/2fa/setup
 * Generate 2FA setup data (QR code, secret, backup codes)
 */
twoFactor.post(
  '/setup',
  endpointRateLimit('moderate'),
  zValidator('json', setupSchema),
  async (c) => {
    try {
      const { userId, email } = c.req.valid('json');

      // TODO: Add authentication check - ensure user is logged in
      // const currentUser = c.get('user');
      // if (!currentUser || currentUser.id !== userId) {
      //   return c.json({ error: 'Unauthorized' }, 401);
      // }

      // Check if 2FA is already enabled
      const isEnabled = await TwoFactorService.isEnabled(userId);
      if (isEnabled) {
        return c.json(
          {
            success: false,
            error: '2FA is already enabled. Disable it first to set up again.',
          },
          400
        );
      }

      // Generate setup data
      const setup = await TwoFactorService.generateSetup(userId, email);

      return c.json({
        success: true,
        data: {
          qrCodeUrl: setup.qrCodeUrl,
          manualEntryKey: setup.manualEntryKey,
          backupCodes: setup.backupCodes,
          secret: setup.secret, // Store this temporarily on client for next step
        },
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      });
    } catch (error: any) {
      logger.error('❌ 2FA setup error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to generate 2FA setup',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * POST /api/2fa/enable
 * Enable 2FA after verifying setup
 */
twoFactor.post(
  '/enable',
  endpointRateLimit('strict'),
  zValidator('json', enableSchema),
  async (c) => {
    try {
      const { userId, secret, verificationCode, backupCodes } = c.req.valid('json');

      // TODO: Add authentication check
      // const currentUser = c.get('user');
      // if (!currentUser || currentUser.id !== userId) {
      //   return c.json({ error: 'Unauthorized' }, 401);
      // }

      // Enable 2FA
      const enabled = await TwoFactorService.enableTwoFactor(
        userId,
        secret,
        verificationCode,
        backupCodes
      );

      if (!enabled) {
        return c.json(
          {
            success: false,
            error: 'Invalid verification code. Please try again.',
          },
          400
        );
      }

      return c.json({
        success: true,
        message: '2FA enabled successfully! Make sure to save your backup codes.',
      });
    } catch (error: any) {
      logger.error('❌ 2FA enable error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to enable 2FA',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * POST /api/2fa/verify
 * Verify 2FA code during login
 */
twoFactor.post(
  '/verify',
  endpointRateLimit('strict'),
  zValidator('json', verifySchema),
  async (c) => {
    try {
      const { userId, code } = c.req.valid('json');

      // Get IP and user agent for logging
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
      const userAgent = c.req.header('user-agent');

      // Verify code
      const result = await TwoFactorService.verifyCode(
        userId,
        code,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.message,
          },
          401
        );
      }

      return c.json({
        success: true,
        message: result.message,
        usedBackupCode: result.usedBackupCode,
      });
    } catch (error: any) {
      logger.error('❌ 2FA verify error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to verify 2FA code',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * POST /api/2fa/disable
 * Disable 2FA for user
 */
twoFactor.post(
  '/disable',
  endpointRateLimit('moderate'),
  zValidator('json', disableSchema),
  async (c) => {
    try {
      const { userId, password } = c.req.valid('json');

      // TODO: Add authentication check
      // TODO: Verify password before disabling

      // Disable 2FA
      const disabled = await TwoFactorService.disableTwoFactor(userId);

      if (!disabled) {
        return c.json(
          {
            success: false,
            error: 'Failed to disable 2FA',
          },
          400
        );
      }

      return c.json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error: any) {
      logger.error('❌ 2FA disable error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to disable 2FA',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * GET /api/2fa/status/:userId
 * Get 2FA status and settings
 */
twoFactor.get('/status/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    // TODO: Add authentication check
    // const currentUser = c.get('user');
    // if (!currentUser || currentUser.id !== userId) {
    //   return c.json({ error: 'Unauthorized' }, 401);
    // }

    const settings = await TwoFactorService.getSettings(userId);

    if (!settings) {
      return c.json({
        success: true,
        enabled: false,
        message: '2FA not configured',
      });
    }

    return c.json({
      success: true,
      enabled: settings.enabled,
      backupCodesRemaining: settings.backupCodesRemaining,
      lastVerifiedAt: settings.lastVerifiedAt,
      createdAt: settings.createdAt,
    });
  } catch (error: any) {
    logger.error('❌ 2FA status error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get 2FA status',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * Generate new backup codes
 */
twoFactor.post(
  '/regenerate-backup-codes',
  endpointRateLimit('moderate'),
  zValidator('json', z.object({ userId: z.string() })),
  async (c) => {
    try {
      const { userId } = c.req.valid('json');

      // TODO: Add authentication check
      // const currentUser = c.get('user');
      // if (!currentUser || currentUser.id !== userId) {
      //   return c.json({ error: 'Unauthorized' }, 401);
      // }

      // Check if 2FA is enabled
      const isEnabled = await TwoFactorService.isEnabled(userId);
      if (!isEnabled) {
        return c.json(
          {
            success: false,
            error: '2FA is not enabled',
          },
          400
        );
      }

      // Generate new codes
      const newCodes = await TwoFactorService.regenerateBackupCodes(userId);

      return c.json({
        success: true,
        backupCodes: newCodes,
        message: 'New backup codes generated. Save them securely!',
      });
    } catch (error: any) {
      logger.error('❌ Regenerate backup codes error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to regenerate backup codes',
          message: error.message,
        },
        500
      );
    }
  }
);

/**
 * GET /api/2fa/recent-attempts/:userId
 * Get recent authentication attempts
 */
twoFactor.get('/recent-attempts/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = parseInt(c.req.query('limit') || '10');

    // TODO: Add authentication check
    // const currentUser = c.get('user');
    // if (!currentUser || currentUser.id !== userId) {
    //   return c.json({ error: 'Unauthorized' }, 401);
    // }

    const attempts = await TwoFactorService.getRecentAttempts(userId, limit);

    return c.json({
      success: true,
      attempts,
    });
  } catch (error: any) {
    logger.error('❌ Get recent attempts error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get recent attempts',
        message: error.message,
      },
      500
    );
  }
});

export default twoFactor;


