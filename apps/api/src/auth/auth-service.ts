// Clean authentication service for PostgreSQL
// Handles user registration, sign-in, and session management

import bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/connection';
import { userTable, sessionTable } from '../database/schema';
import logger from '../utils/logger';
import { ErrorFactory, mapDatabaseError } from '../utils/error-handling';

type UserRow = typeof userTable.$inferSelect;
type NewUserRow = typeof userTable.$inferInsert;
type PublicUser = Omit<UserRow, 'password'>;

// Session configuration
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 12 : 8; // Optimized for development speed

/**
 * Register a new user
 */
export async function registerUser(data: {
  email: string;
  name: string;
  password: string;
}): Promise<{ success: boolean; user?: PublicUser; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, data.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      return { success: false, error: 'Email already registered' };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    // Create user
    const newUser: NewUserRow = {
      email: data.email,
      name: data.name,
      password: hashedPassword,
    };
    
    const [createdUser] = await db
      .insert(userTable)
      .values(newUser)
      .returning();

    if (!createdUser) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }

    logger.info(`✅ User registered: ${createdUser.email}`);

    const { password: _omitPassword, ...userPublic } = createdUser;

    return {
      success: true,
      user: userPublic,
    };

  } catch (error: unknown) {
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined;
    // Handle database constraint violations (e.g., email already exists)
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
      const standardError = ErrorFactory.create('DATABASE_CONSTRAINT_ERROR', {
        details: { field: 'email', value: data.email },
        cause: error instanceof Error ? error : new Error(String(error))
      });
      logger.warn('⚠️ User registration failed - email already exists:', standardError);
      return {
        success: false,
        error: 'An account with this email already exists'
      };
    }

    // Handle other database errors
    const standardError = mapDatabaseError(error);
    logger.error('❌ User registration failed:', standardError);
    return {
      success: false,
      error: 'Registration failed. Please try again.'
    };
  }
}

/**
 * Sign in user with email and password
 */
export async function signInUser(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: PublicUser; sessionId?: string; error?: string }> {
  try {
    const startTime = Date.now();
    logger.info(`🔍 [PERF] Starting sign-in for: ${email}`);
    
    // Get database connection
    let db;
    try {
      const dbStartTime = Date.now();
      db = await getDatabase();
      const dbConnectTime = Date.now() - dbStartTime;
      logger.info(`📊 [PERF] Database connection took: ${dbConnectTime}ms`);
    } catch (dbError) {
      logger.error('❌ Database connection failed:', dbError);
      return { 
        success: false, 
        error: 'Database connection failed. Please try again.' 
      };
    }
    
    // Find user by email
    let user;
    try {
      const queryStartTime = Date.now();
      [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);
      const queryTime = Date.now() - queryStartTime;
      logger.info(`📊 [PERF] User query took: ${queryTime}ms`);
      
      if (!user) {
        logger.warn(`⚠️ No user found for email: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (queryError) {
      logger.error('❌ User query failed:', queryError);
      return { 
        success: false, 
        error: 'Failed to lookup user. Please try again.' 
      };
    }
    
    // Verify password
    let passwordValid = false;
    try {
      const bcryptStartTime = Date.now();
      passwordValid = await bcrypt.compare(password, user.password);
      const bcryptTime = Date.now() - bcryptStartTime;
      logger.info(`📊 [PERF] Bcrypt comparison took: ${bcryptTime}ms`);
      
      if (!passwordValid) {
        logger.warn(`⚠️ Invalid password for user: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (bcryptError) {
      logger.error('❌ Password verification failed:', bcryptError);
      return { 
        success: false, 
        error: 'Password verification failed. Please try again.' 
      };
    }
    
    // Create session
    let sessionId;
    try {
      const sessionStartTime = Date.now();
      sessionId = createId();
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      
      await db
        .insert(sessionTable)
        .values({
          id: sessionId,
          userId: user.id,
          expiresAt,
        });
      const sessionTime = Date.now() - sessionStartTime;
      logger.info(`📊 [PERF] Session creation took: ${sessionTime}ms`);
    } catch (sessionError) {
      logger.error('❌ Session creation failed:', sessionError);
      return { 
        success: false, 
        error: 'Failed to create session. Please try again.' 
      };
    }
    
    const totalTime = Date.now() - startTime;
    logger.info(`✅ [PERF] User signed in: ${user.email} (Total: ${totalTime}ms)`);
    
    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword as PublicUser,
      sessionId
    };
    
  } catch (error) {
    logger.error('❌ Unexpected error during sign-in:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

/**
 * Validate session and get user
 */
export async function validateSession(
  sessionId: string
): Promise<{ valid: boolean; user?: UserRow; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Find session with user
    const result = await db
      .select({
        user: userTable,
        session: sessionTable,
      })
      .from(sessionTable)
      .innerJoin(userTable, eq(userTable.id, sessionTable.userId))
      .where(eq(sessionTable.id, sessionId))
      .limit(1);
    
    const row = result[0];
    if (!row) {
      return { valid: false, error: 'Session not found' };
    }

    const { user, session } = row;
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await db
        .delete(sessionTable)
        .where(eq(sessionTable.id, sessionId));
      
      return { valid: false, error: 'Session expired' };
    }
    
    return { 
      valid: true, 
      user 
    };
    
  } catch (error) {
    logger.error('❌ Session validation failed:', error);
    return { 
      valid: false, 
      error: 'Session validation failed' 
    };
  }
}

/**
 * Sign out user (delete session)
 */
export async function signOutUser(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    await db
      .delete(sessionTable)
      .where(eq(sessionTable.id, sessionId));
    
    logger.info(`✅ User signed out (session: ${sessionId})`);
    
    return { success: true };
    
  } catch (error) {
    logger.error('❌ Sign-out failed:', error);
    return { 
      success: false, 
      error: 'Sign-out failed' 
    };
  }
}

/**
 * Clean up expired sessionTable
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const db = await getDatabase();
    
    const result = await db
      .delete(sessionTable)
      .where(eq(sessionTable.expiresAt, new Date()));
    
    logger.info(`🧹 Cleaned up expired sessionTable`);
    
  } catch (error) {
    logger.error('❌ Session cleanup failed:', error);
  }
}

/**
 * Create admin user if it doesn't exist
 */
export async function ensureAdminUser(): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@meridian.app';
    
    const db = await getDatabase();
    
    // Check if admin user exists
    const [existingAdmin] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, adminEmail))
      .limit(1);
    
    if (existingAdmin) {
      logger.info(`✅ Admin user already exists: ${adminEmail}`);
      return;
    }
    
    // Create admin user
    const result = await registerUser({
      email: adminEmail,
      name: 'Admin User',
      password: 'admin123', // Change this in production!
    });
    
    if (result.success) {
      logger.info(`✅ Admin user created: ${adminEmail}`);
    } else {
      logger.error(`❌ Failed to create admin user: ${result.error}`);
    }
    
  } catch (error) {
    logger.error('❌ Admin user setup failed:', error);
  }
}

