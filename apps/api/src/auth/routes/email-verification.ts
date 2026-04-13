/**
 * Email Verification Routes
 * API endpoints for email verification and password reset
 * Phase 0 - Day 2 Implementation
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { emailVerificationService } from '../email-verification-service';
import logger from '../../utils/logger';

const app = new Hono();

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
app.post(
  '/verify-email',
  zValidator(
    'json',
    z.object({
      token: z.string().min(1, 'Token is required'),
    })
  ),
  async (c) => {
    try {
      const { token } = c.req.valid('json');
      
      const result = await emailVerificationService.verifyEmail(token);
      
      if (result.success) {
        return c.json({
          success: true,
          message: result.message,
          userId: result.userId,
        }, 200);
      } else {
        return c.json({
          success: false,
          error: result.message,
        }, 400);
      }
    } catch (error: any) {
      logger.error('❌ Email verification error:', error);
      return c.json({
        success: false,
        error: 'Email verification failed',
      }, 500);
    }
  }
);

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email with token (alternative GET endpoint for email links)
 */
app.get('/verify-email', async (c) => {
  try {
    const token = c.req.query('token');
    
    if (!token) {
      return c.json({
        success: false,
        error: 'Token is required',
      }, 400);
    }
    
    const result = await emailVerificationService.verifyEmail(token);
    
    if (result.success) {
      // Redirect to frontend success page
      const redirectUrl = `${process.env.FRONTEND_URL}/email-verified?success=true`;
      return c.redirect(redirectUrl);
    } else {
      // Redirect to frontend error page
      const redirectUrl = `${process.env.FRONTEND_URL}/email-verified?success=false&error=${encodeURIComponent(result.message)}`;
      return c.redirect(redirectUrl);
    }
  } catch (error: any) {
    logger.error('❌ Email verification error:', error);
    const redirectUrl = `${process.env.FRONTEND_URL}/email-verified?success=false&error=Verification%20failed`;
    return c.redirect(redirectUrl);
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
app.post(
  '/resend-verification',
  zValidator(
    'json',
    z.object({
      email: z.string().email('Invalid email address'),
    })
  ),
  async (c) => {
    try {
      const { email } = c.req.valid('json');
      
      // Get client info for security tracking
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
      const userAgent = c.req.header('user-agent');
      
      const result = await emailVerificationService.resendVerificationEmail(
        email,
        ipAddress,
        userAgent
      );
      
      // Always return success for security (don't reveal if email exists)
      return c.json({
        success: true,
        message: 'If your email exists and is not verified, a new verification link has been sent',
      }, 200);
    } catch (error: any) {
      logger.error('❌ Resend verification error:', error);
      return c.json({
        success: false,
        error: 'Failed to resend verification email',
      }, 500);
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
app.post(
  '/forgot-password',
  zValidator(
    'json',
    z.object({
      email: z.string().email('Invalid email address'),
    })
  ),
  async (c) => {
    try {
      const { email } = c.req.valid('json');
      
      // Get client info for security tracking
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
      const userAgent = c.req.header('user-agent');
      
      const result = await emailVerificationService.sendPasswordResetEmail(
        email,
        ipAddress,
        userAgent
      );
      
      // Always return success for security (don't reveal if email exists)
      return c.json({
        success: true,
        message: 'If your email exists, a password reset link has been sent',
      }, 200);
    } catch (error: any) {
      logger.error('❌ Forgot password error:', error);
      return c.json({
        success: false,
        error: 'Failed to send password reset email',
      }, 500);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
app.post(
  '/reset-password',
  zValidator(
    'json',
    z.object({
      token: z.string().min(1, 'Token is required'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
  ),
  async (c) => {
    try {
      const { token, password, confirmPassword } = c.req.valid('json');
      
      // Validate passwords match
      if (password !== confirmPassword) {
        return c.json({
          success: false,
          error: 'Passwords do not match',
        }, 400);
      }
      
      const result = await emailVerificationService.resetPassword(token, password);
      
      if (result.success) {
        return c.json({
          success: true,
          message: result.message,
        }, 200);
      } else {
        return c.json({
          success: false,
          error: result.message,
        }, 400);
      }
    } catch (error: any) {
      logger.error('❌ Reset password error:', error);
      return c.json({
        success: false,
        error: 'Password reset failed',
      }, 500);
    }
  }
);

/**
 * POST /api/auth/verify-reset-token
 * Verify if password reset token is valid (before showing reset form)
 */
app.post(
  '/verify-reset-token',
  zValidator(
    'json',
    z.object({
      token: z.string().min(1, 'Token is required'),
    })
  ),
  async (c) => {
    try {
      const { token } = c.req.valid('json');
      
      const result = await emailVerificationService.verifyPasswordResetToken(token);
      
      if (result.success) {
        return c.json({
          success: true,
          message: 'Token is valid',
        }, 200);
      } else {
        return c.json({
          success: false,
          error: result.message,
        }, 400);
      }
    } catch (error: any) {
      logger.error('❌ Verify reset token error:', error);
      return c.json({
        success: false,
        error: 'Token verification failed',
      }, 500);
    }
  }
);

export default app;


