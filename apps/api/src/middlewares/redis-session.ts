/**
 * Redis Session Middleware
 * 
 * Provides session management using Redis for scalability:
 * - Automatic session creation and validation
 * - Session refresh on activity
 * - Secure session handling
 * - User context injection
 */

import { Context, Next } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { getSessionStore, SessionData } from '../services/redis-session-store'
import logger from '../utils/logger'

const SESSION_COOKIE_NAME = 'meridian_session'
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 86400, // 24 hours
  path: '/',
}

export interface SessionUser {
  id: string
  email: string
  role: string
  workspaceId: string
  permissions?: string[]
  sessionId: string
  lastActivity: number
}

// Extend Hono's Context type to include session data
declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser | null
    sessionId: string | null
    /** Set by secure-auth after session validation */
    userId?: string
    userEmail?: string
  }
}

/**
 * Session middleware for Redis-based session management
 */
export const sessionMiddleware = () => {
  const sessionStore = getSessionStore()

  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME)
    
    // Initialize session variables
    c.set('user', null)
    c.set('sessionId', sessionId || null)

    if (!sessionId) {
      // No session cookie, continue as anonymous user
      await next()
      return
    }

    try {
      // Get session data from Redis
      const sessionData = await sessionStore.getSession(sessionId)

      if (!sessionData) {
        // Session doesn't exist or expired
        deleteCookie(c, SESSION_COOKIE_NAME)
        c.set('sessionId', null)
        await next()
        return
      }

      // Create user context from session data
      const user: SessionUser = {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        workspaceId: sessionData.workspaceId,
        permissions: sessionData.permissions,
        sessionId,
        lastActivity: sessionData.lastActivity,
      }

      // Set user context
      c.set('user', user)

      // Update last activity (handled by getSession)
      logger.debug(`👤 Session validated for user ${user.email}`, {
        sessionId,
        userId: user.id,
        lastActivity: new Date(user.lastActivity).toISOString(),
      })

      await next()

    } catch (error) {
      logger.error('❌ Session middleware error:', error)
      
      // Clear invalid session
      deleteCookie(c, SESSION_COOKIE_NAME)
      c.set('user', null)
      c.set('sessionId', null)
      
      await next()
    }
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  c: Context,
  userData: {
    userId: string
    email: string
    role: string
    workspaceId: string
    permissions?: string[]
    metadata?: Record<string, any>
  }
): Promise<string> {
  const sessionStore = getSessionStore()

  try {
    // Get client info for session tracking
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const userAgent = c.req.header('user-agent') || 'unknown'

    // Create session data
    const sessionData: Omit<SessionData, 'lastActivity'> = {
      userId: userData.userId,
      email: userData.email,
      role: userData.role,
      workspaceId: userData.workspaceId,
      permissions: userData.permissions,
      ipAddress,
      userAgent,
      metadata: userData.metadata,
    }

    // Create session in Redis
    const sessionId = await sessionStore.createSession(sessionData)

    // Set session cookie
    setCookie(c, SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS)

    // Update context
    const user: SessionUser = {
      id: userData.userId,
      email: userData.email,
      role: userData.role,
      workspaceId: userData.workspaceId,
      permissions: userData.permissions,
      sessionId,
      lastActivity: Date.now(),
    }

    c.set('user', user)
    c.set('sessionId', sessionId)

    logger.info(`✅ Created session for user ${userData.email}`, {
      sessionId,
      userId: userData.userId,
      role: userData.role,
    })

    return sessionId

  } catch (error) {
    logger.error('❌ Failed to create session:', error)
    throw new Error('Failed to create session')
  }
}

/**
 * Update session data
 */
export async function updateSession(
  c: Context,
  updates: Partial<Omit<SessionData, 'userId' | 'lastActivity'>>
): Promise<boolean> {
  const sessionId = c.get('sessionId')
  if (!sessionId) {
    return false
  }

  const sessionStore = getSessionStore()

  try {
    const success = await sessionStore.updateSession(sessionId, updates)

    if (success) {
      // Update context if user data changed
      const currentUser = c.get('user')
      if (currentUser) {
        const updatedUser: SessionUser = {
          ...currentUser,
          ...updates,
          lastActivity: Date.now(),
        }
        c.set('user', updatedUser)
      }

      logger.info(`🔄 Updated session ${sessionId}`, {
        updates: Object.keys(updates),
      })
    }

    return success

  } catch (error) {
    logger.error('❌ Failed to update session:', error)
    return false
  }
}

/**
 * Destroy current session
 */
export async function destroySession(c: Context): Promise<boolean> {
  const sessionId = c.get('sessionId')
  if (!sessionId) {
    return false
  }

  const sessionStore = getSessionStore()

  try {
    const success = await sessionStore.deleteSession(sessionId)

    // Clear cookie and context
    deleteCookie(c, SESSION_COOKIE_NAME)
    c.set('user', null)
    c.set('sessionId', null)

    if (success) {
      logger.info(`🗑️ Destroyed session ${sessionId}`)
    }

    return success

  } catch (error) {
    logger.error('❌ Failed to destroy session:', error)
    return false
  }
}

/**
 * Destroy all sessions for a user
 */
export async function destroyUserSessions(userId: string): Promise<number> {
  const sessionStore = getSessionStore()

  try {
    const deletedCount = await sessionStore.deleteUserSessions(userId)
    
    logger.info(`🗑️ Destroyed ${deletedCount} sessions for user ${userId}`)
    return deletedCount

  } catch (error) {
    logger.error('❌ Failed to destroy user sessions:', error)
    return 0
  }
}

/**
 * Get session information for current user
 */
export async function getSessionInfo(c: Context): Promise<{
  sessionId: string
  user: SessionUser
  ttl: number
  connectionInfo?: any
} | null> {
  const sessionId = c.get('sessionId')
  const user = c.get('user')

  if (!sessionId || !user) {
    return null
  }

  const sessionStore = getSessionStore()

  try {
    const ttl = await sessionStore.getSessionTTL(sessionId)
    const connectionInfo = sessionStore.isConnected() ? await sessionStore.getConnectionInfo() : null

    return {
      sessionId,
      user,
      ttl,
      connectionInfo,
    }

  } catch (error) {
    logger.error('❌ Failed to get session info:', error)
    return null
  }
}

/**
 * Require authentication middleware
 */
export const requireAuth = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        401
      )
    }

    await next()
  }
}

/**
 * Require specific role middleware
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  return async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        401
      )
    }

    if (!roles.includes(user.role)) {
      return c.json(
        { 
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredRoles: roles,
          userRole: user.role
        }, 
        403
      )
    }

    await next()
  }
}

/**
 * Session health check endpoint
 */
export async function sessionHealthCheck(): Promise<{
  redis: {
    connected: boolean
    totalSessions: number
    connectionInfo: any
  }
  status: 'healthy' | 'degraded' | 'unhealthy'
}> {
  const sessionStore = getSessionStore()

  try {
    const connected = sessionStore.isConnected()
    const totalSessions = connected ? await sessionStore.getTotalSessionCount() : 0
    const connectionInfo = connected ? await sessionStore.getConnectionInfo() : null

    const status = connected ? 'healthy' : 'unhealthy'

    return {
      redis: {
        connected,
        totalSessions,
        connectionInfo,
      },
      status,
    }

  } catch (error) {
    logger.error('❌ Session health check failed:', error)
    
    return {
      redis: {
        connected: false,
        totalSessions: 0,
        connectionInfo: null,
      },
      status: 'unhealthy',
    }
  }
}

