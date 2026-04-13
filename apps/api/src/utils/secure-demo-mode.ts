/**
 * 🔒 Secure Demo Mode Implementation
 * Provides demo functionality WITHOUT bypassing authentication
 */

import { logger } from './logger';
import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { validateSessionToken } from '../user/utils/validate-session-token';

export interface DemoModeConfig {
  enabled: boolean;
  allowedEmails: string[];
  sessionDuration: number; // in milliseconds
  maxConcurrentUsers: number;
  restrictedOperations: string[];
}

export class SecureDemoMode {
  private config: DemoModeConfig;
  private activeSessions: Map<string, { userId: string; loginTime: Date; lastActivity: Date }> = new Map();
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  constructor(config: DemoModeConfig) {
    this.config = config;
    
    if (config.enabled) {
      logger.warn('🎭 Secure Demo Mode Enabled');
      logger.info(`Demo users allowed: ${config.allowedEmails.join(', ')}`);
      logger.info(`Session duration: ${config.sessionDuration / 1000 / 60} minutes`);
      
      // Cleanup expired sessions periodically
      setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
    }
  }

  /**
   * Check if demo mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Validate demo mode environment
   */
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.enabled) {
      return { isValid: true, errors: [] };
    }

    // Prevent demo mode in production
    if (process.env.NODE_ENV === 'production') {
      errors.push('Demo mode is not allowed in production environment');
    }

    // Check for production-like indicators
    const productionIndicators = [
      process.env.DATABASE_URL?.includes('prod'),
      process.env.DATABASE_URL?.includes('production'),
      process.env.APP_URL?.includes('meridian.com'),
      process.env.DOMAIN?.includes('meridian.com'),
      process.env.JWT_SECRET?.length && process.env.JWT_SECRET.length > 50,
    ];

    if (productionIndicators.some(indicator => indicator)) {
      errors.push('Production-like configuration detected - demo mode is not safe');
    }

    // Validate demo configuration
    if (this.config.allowedEmails.length === 0) {
      errors.push('No demo users configured');
    }

    if (this.config.sessionDuration < 300000) { // Less than 5 minutes
      errors.push('Demo session duration too short (minimum 5 minutes)');
    }

    if (this.config.maxConcurrentUsers > 50) {
      errors.push('Too many concurrent demo users allowed (maximum 50)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Authenticate request in demo mode (still requires valid session)
   */
  async authenticateRequest(c: Context): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return { success: false, error: 'Demo mode not enabled' };
    }

    try {
      // Still require session token
      const session = getCookie(c, 'session');
      if (!session) {
        return { success: false, error: 'No session token provided' };
      }

      // Validate session token normally
      const { session: validSession, user } = await validateSessionToken(session);
      if (!validSession || !user) {
        return { success: false, error: 'Invalid or expired session' };
      }

      // Check if user is allowed in demo mode
      const userEmail = (user as any)?.email;
      if (!this.config.allowedEmails.includes(userEmail)) {
        logger.warn('Demo mode access denied for user:', userEmail);
        return { success: false, error: 'User not authorized for demo mode' };
      }

      // Track active session
      this.trackActiveSession(userEmail, (user as any)?.id);

      // Check concurrent user limit
      if (this.activeSessions.size > this.config.maxConcurrentUsers) {
        logger.warn('Demo mode concurrent user limit exceeded');
        return { success: false, error: 'Demo mode user limit reached' };
      }

      return { success: true, user };
    } catch (error) {
      logger.error('Demo mode authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Track active demo session
   */
  private trackActiveSession(userEmail: string, userId: string): void {
    this.activeSessions.set(userEmail, {
      userId,
      loginTime: new Date(),
      lastActivity: new Date()
    });
  }

  /**
   * Update last activity for session
   */
  updateActivity(userEmail: string): void {
    const session = this.activeSessions.get(userEmail);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Check if operation is restricted in demo mode
   */
  isOperationRestricted(operation: string): boolean {
    return this.config.restrictedOperations.includes(operation);
  }

  /**
   * Middleware for restricted operations
   */
  restrictOperation(operation: string) {
    return async (c: Context, next: () => Promise<void>) => {
      if (this.config.enabled && this.isOperationRestricted(operation)) {
        logger.warn(`Demo mode: Restricted operation attempted: ${operation}`);
        return c.json({ 
          error: 'Operation not allowed in demo mode',
          operation,
          message: 'This operation is restricted for security in demo mode'
        }, 403);
      }
      await next();
    };
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [userEmail, session] of this.activeSessions.entries()) {
      const sessionAge = now.getTime() - session.lastActivity.getTime();
      if (sessionAge > this.config.sessionDuration) {
        expiredSessions.push(userEmail);
      }
    }

    for (const userEmail of expiredSessions) {
      this.activeSessions.delete(userEmail);
      logger.info(`Demo session expired for user: ${userEmail}`);
    }

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired demo sessions`);
    }
  }

  /**
   * Get demo mode statistics
   */
  getStats() {
    return {
      enabled: this.config.enabled,
      activeSessions: this.activeSessions.size,
      maxConcurrentUsers: this.config.maxConcurrentUsers,
      allowedUsers: this.config.allowedEmails.length,
      restrictedOperations: this.config.restrictedOperations.length,
      sessionDurationMinutes: this.config.sessionDuration / 1000 / 60,
      sessionsData: Array.from(this.activeSessions.entries()).map(([email, session]) => ({
        email,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        userId: session.userId
      }))
    };
  }

  /**
   * Force logout all demo users
   */
  logoutAllUsers(): number {
    const count = this.activeSessions.size;
    this.activeSessions.clear();
    logger.info(`Logged out ${count} demo users`);
    return count;
  }

  /**
   * Force logout specific user
   */
  logoutUser(userEmail: string): boolean {
    const existed = this.activeSessions.has(userEmail);
    this.activeSessions.delete(userEmail);
    if (existed) {
      logger.info(`Demo user logged out: ${userEmail}`);
    }
    return existed;
  }
}

// Create demo mode configuration
const demoConfig: DemoModeConfig = {
  enabled: process.env.DEMO_MODE === 'true',
  allowedEmails: [
    'demo@meridian.app',
    'admin@meridian.app',
    'test@meridian.app',
    ...(process.env.DEMO_ALLOWED_EMAILS?.split(',') || [])
  ].filter(Boolean),
  sessionDuration: parseInt(process.env.DEMO_SESSION_DURATION || '1800000'), // 30 minutes default
  maxConcurrentUsers: parseInt(process.env.DEMO_MAX_CONCURRENT_USERS || '10'),
  restrictedOperations: [
    'delete_workspace',
    'delete_user',
    'update_billing',
    'export_data',
    'admin_settings',
    ...(process.env.DEMO_RESTRICTED_OPERATIONS?.split(',') || [])
  ].filter(Boolean)
};

export const secureDemoMode = new SecureDemoMode(demoConfig);
export default secureDemoMode;

