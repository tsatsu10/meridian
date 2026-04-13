// Clean user routes for authentication
// Simple, focused endpoints for user management

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createId } from "@paralleldrive/cuid2";
import {
  signInUser,
  signOutUser,
  validateSession
} from '../auth/auth-service';
import { getDatabase } from '../database/connection';
import { userTable } from '../database/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const userRouter = new Hono();

/**
 * POST /user/sign-up
 * Register a new user
 */
userRouter.post(
  '/sign-up',
  zValidator('json', signUpSchema),
  async (c) => {
    const db = getDatabase();
    
    try {
      const { email, name, password } = c.req.valid('json');

      // Check if email already exists
      const existingUsers = await db
        .select({
          id: userTable.id,
          email: userTable.email
        })
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);

      if (existingUsers.length > 0) {
        return c.json({ error: 'Email already taken' }, 400);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const insertResult = await db
        .insert(userTable)
        .values({
          id: createId(),
          email,
          name,
          password: hashedPassword
        })
        .returning({
          id: userTable.id,
          email: userTable.email,
          name: userTable.name,
          createdAt: userTable.createdAt
        });

      const user = insertResult[0];

      if (!user) {
        throw new Error('Failed to create user');
      }

      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });

    } catch (error) {
      logger.error('❌ Sign-up endpoint error:', error);
      return c.json({ error: 'Registration failed. Please try again.' }, 400);
    }
  }
);

/**
 * POST /user/sign-in
 * Sign in user and create session
 */
userRouter.post(
  '/sign-in',
  zValidator('json', signInSchema),
  async (c) => {
    try {
      const { email, password } = c.req.valid('json');
      
      const result = await signInUser(email, password);
      
      if (!result.success) {
        return c.json({ error: result.error }, 401);
      }
      
      // Set session cookie with environment-specific settings
      const isProduction = process.env.NODE_ENV === 'production';
      
      setCookie(c, 'session', result.sessionId!, {
        httpOnly: true,
        secure: isProduction, // HTTPS in production, HTTP in development
        sameSite: isProduction ? 'strict' : 'lax', // Strict in prod, lax in dev
        maxAge: 30 * 60, // 30 minutes
        path: '/',
        // Remove domain for development to avoid cross-port issues
        domain: isProduction ? undefined : undefined,
      });
      
      return c.json({
        success: true,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          name: result.user!.name,
          createdAt: result.user!.createdAt,
        },
        // Include session token in response for development fallback
        sessionToken: process.env.NODE_ENV === 'development' ? result.sessionId : undefined,
      });
      
    } catch (error) {
      logger.error('❌ Sign-in endpoint error:', error);
      return c.json({ error: 'Sign-in failed' }, 500);
    }
  }
);

/**
 * POST /user/sign-out
 * Sign out user and clear session
 */
userRouter.post('/sign-out', async (c) => {
  try {
    const sessionId = getCookie(c, 'session');
    
    if (sessionId) {
      await signOutUser(sessionId);
    }
    
    // Clear session cookie
    deleteCookie(c, 'session');
    
    return c.json({ success: true });
    
  } catch (error) {
    logger.error('❌ Sign-out endpoint error:', error);
    return c.json({ error: 'Sign-out failed' }, 500);
  }
});

/**
 * GET /user/me
 * Get current user from session (with demo mode support)
 */
userRouter.get('/me', async (c) => {
  try {
    logger.info('🔍 /user/me endpoint called');

    // Try cookie first (preferred for browser requests)
    let sessionId = getCookie(c, 'session');

    // Fallback to Authorization header (for API clients)
    if (!sessionId) {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7);
      }
    }

    if (!sessionId) {
      logger.warn('❌ No session cookie or Authorization header found');
      return c.json({ error: 'No session found' }, 401);
    }

    // Validate the session
    const result = await validateSession(sessionId);

    if (!result.valid || !result.user) {
      deleteCookie(c, 'session');
      logger.warn('❌ Invalid session token');
      return c.json({ error: result.error || 'Session not found' }, 401);
    }

    logger.info(`✅ Valid session for user: ${result.user.email}`);
    return c.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isEmailVerified: result.user.isEmailVerified || true,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      },
    });

  } catch (error) {
    logger.error('❌ Get user endpoint error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

export default userRouter;

