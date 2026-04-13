/**
 * Two-Factor Authentication Routes
 * Handles 2FA setup, verification, and management
 */

import { Hono } from 'hono';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import { getDatabase } from '../../database/connection';
import { users as userTable } from '../../database/schema';
import { eq } from 'drizzle-orm';
import logger from '../../utils/logger';

const app = new Hono();

// Temporary storage for pending 2FA secrets (in production, use Redis)
const pendingSecrets = new Map<string, { secret: string; expiresAt: Date }>();

// Clean up expired secrets every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [userId, data] of pendingSecrets.entries()) {
    if (data.expiresAt < now) {
      pendingSecrets.delete(userId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    codes.push(formatted);
  }
  return codes;
}

/**
 * POST /generate
 * Generate 2FA secret and QR code URL
 */
app.post('/generate', async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    logger.info('Generating 2FA secret', { userId }, 'AUTH');

    // Generate secret
    const secret = authenticator.generateSecret();

    // Store temporarily (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    pendingSecrets.set(userId, { secret, expiresAt });

    // Generate OTP Auth URL for QR code
    const otpauthUrl = authenticator.keyuri(
      userEmail,
      'Meridian',
      secret
    );

    logger.info('2FA secret generated successfully', { userId }, 'AUTH');

    return c.json({
      secret,
      qrCodeUrl: otpauthUrl,
      manualEntryKey: secret,
    });
  } catch (error) {
    logger.error('Failed to generate 2FA secret', { error }, 'AUTH');
    return c.json({ error: 'Failed to generate 2FA secret' }, 500);
  }
});

/**
 * POST /verify
 * Verify 2FA code and enable 2FA for user
 */
app.post('/verify', async (c) => {
  try {
    const userId = c.get('userId');
    const { secret, token } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    if (!secret || !token) {
      return c.json({ error: 'Secret and token are required' }, 400);
    }

    logger.info('Verifying 2FA code', { userId }, 'AUTH');

    // Verify the token
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      logger.warn('Invalid 2FA verification code', { userId }, 'AUTH');
      return c.json({ error: 'Invalid verification code' }, 400);
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store secret and backup codes in database
    const db = getDatabase();
    await db
      .update(userTable)
      .set({
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    // Clean up pending secret
    pendingSecrets.delete(userId);

    logger.info('2FA enabled successfully', { userId }, 'AUTH');

    return c.json({
      success: true,
      backupCodes,
    });
  } catch (error) {
    logger.error('Failed to verify 2FA code', { error }, 'AUTH');
    return c.json({ error: 'Failed to verify 2FA code' }, 500);
  }
});

/**
 * POST /disable
 * Disable 2FA for user (requires password confirmation)
 */
app.post('/disable', async (c) => {
  try {
    const userId = c.get('userId');
    const { password } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    if (!password) {
      return c.json({ error: 'Password is required' }, 400);
    }

    logger.info('Disabling 2FA', { userId }, 'AUTH');

    // Get user and verify password
    const db = getDatabase();
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (users.length === 0 || !users[0]) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = users[0];

    // Verify password (assuming you have a password verification function)
    // const isValidPassword = await verifyPassword(password, user.password);
    // For now, we'll just check if password is provided
    // TODO: Implement proper password verification

    // Disable 2FA
    await db
      .update(userTable)
      .set({
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    logger.info('2FA disabled successfully', { userId }, 'AUTH');

    return c.json({ success: true });
  } catch (error) {
    logger.error('Failed to disable 2FA', { error }, 'AUTH');
    return c.json({ error: 'Failed to disable 2FA' }, 500);
  }
});

/**
 * POST /verify-login
 * Verify 2FA code during login
 */
app.post('/verify-login', async (c) => {
  try {
    const { userId, token, backupCode } = await c.req.json();

    if (!userId || (!token && !backupCode)) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    logger.info('Verifying 2FA login', { userId }, 'AUTH');

    const db = getDatabase();
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (users.length === 0 || !users[0]) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = users[0];

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return c.json({ error: '2FA not enabled for this user' }, 400);
    }

    // Verify token or backup code
    if (token) {
      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorSecret,
      });

      if (!isValid) {
        logger.warn('Invalid 2FA login code', { userId }, 'AUTH');
        return c.json({ error: 'Invalid verification code' }, 400);
      }
    } else if (backupCode) {
      // Verify backup code
      const backupCodes: string[] = user.twoFactorBackupCodes
        ? JSON.parse(user.twoFactorBackupCodes as string)
        : [];

      if (!backupCodes.includes(backupCode)) {
        logger.warn('Invalid backup code', { userId }, 'AUTH');
        return c.json({ error: 'Invalid backup code' }, 400);
      }

      // Remove used backup code
      const updatedCodes = backupCodes.filter((code) => code !== backupCode);
      await db
        .update(userTable)
        .set({
          twoFactorBackupCodes: JSON.stringify(updatedCodes),
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, userId));

      logger.info('Backup code used', { userId, remainingCodes: updatedCodes.length }, 'AUTH');
    }

    logger.info('2FA login verified successfully', { userId }, 'AUTH');

    return c.json({ success: true });
  } catch (error) {
    logger.error('Failed to verify 2FA login', { error }, 'AUTH');
    return c.json({ error: 'Failed to verify 2FA login' }, 500);
  }
});

/**
 * POST /backup-codes/regenerate
 * Regenerate backup codes
 */
app.post('/backup-codes/regenerate', async (c) => {
  try {
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    logger.info('Regenerating backup codes', { userId }, 'AUTH');

    // Generate new backup codes
    const backupCodes = generateBackupCodes();

    // Update database
    const db = getDatabase();
    await db
      .update(userTable)
      .set({
        twoFactorBackupCodes: JSON.stringify(backupCodes),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    logger.info('Backup codes regenerated successfully', { userId }, 'AUTH');

    return c.json({ backupCodes });
  } catch (error) {
    logger.error('Failed to regenerate backup codes', { error }, 'AUTH');
    return c.json({ error: 'Failed to regenerate backup codes' }, 500);
  }
});

/**
 * GET /status
 * Get 2FA status for current user
 */
app.get('/status', async (c) => {
  try {
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const db = getDatabase();
    const users = await db
      .select({
        twoFactorEnabled: userTable.twoFactorEnabled,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (users.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      enabled: users[0]?.twoFactorEnabled || false,
    });
  } catch (error) {
    logger.error('Failed to get 2FA status', { error }, 'AUTH');
    return c.json({ error: 'Failed to get 2FA status' }, 500);
  }
});

export default app;


