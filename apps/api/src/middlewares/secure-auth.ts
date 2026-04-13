/**
 * Secure Authentication Middleware - FIXED VERSION
 * 
 * SECURITY: This middleware provides secure authentication using httpOnly cookies
 * instead of localStorage tokens. Implements role-based access control.
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import type { SessionUser } from './redis-session';
import { getSecurityLoggingService } from '../services/security-logging';
import logger from '../utils/logger';

// Import session validation utility
type ValidateSessionResult = {
  session: { id: string; expiresAt: Date } | null;
  user:
    | {
        id: string;
        email: string;
      }
    | null;
};

/**
 * Authentication middleware that validates session tokens from httpOnly cookies
 * SECURITY: Provides secure authentication without exposing tokens to JavaScript
 */
export const authMiddleware = () => {
  const securityLogger = getSecurityLoggingService();
  
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent');
    const path = c.req.path;
    
    try {
      // Get session token from httpOnly cookie (primary method)
      let sessionToken = getCookie(c, 'session');
      
      // Fallback: Check Authorization header for API clients
      if (!sessionToken) {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          sessionToken = authHeader.substring(7);
        }
      }
      
      if (!sessionToken) {
        logger.warn('🔒 AUTH MIDDLEWARE: No session token found');
        
        securityLogger.logAuthenticationEvent(
          'login_failure',
          undefined,
          ip,
          {
            reason: 'no_token',
            path,
            userAgent,
          }
        );
        
        throw new HTTPException(401, { message: 'Authentication required' });
      }
      
      // Validate session token
      const { validateSessionToken } = await import('../user/utils/validate-session-token.js');
      const result: ValidateSessionResult = await validateSessionToken(sessionToken);
      
      if (!result.user || !result.session) {
        logger.warn('🔒 AUTH MIDDLEWARE: Invalid or expired session');
        
        securityLogger.logAuthenticationEvent(
          'login_failure',
          undefined,
          ip,
          {
            reason: 'invalid_session',
            path,
            userAgent,
          }
        );
        
        throw new HTTPException(401, { message: 'Invalid or expired session' });
      }
      
      // SECURITY: Map database user to SessionUser format
      const sessionUser: SessionUser = {
        id: result.user.id,
        email: result.user.email,
        role: 'USER', // TODO: Fetch actual role from user roles table
        workspaceId: '', // TODO: Fetch from user workspace relationship
        permissions: [], // TODO: Fetch from user permissions
        sessionId: result.session.id,
        lastActivity: Date.now()
      };
      
      // Set user context for authenticated requests
      c.set('userId', sessionUser.id);
      c.set('userEmail', sessionUser.email);
      c.set('user', sessionUser);
      c.set('sessionId', sessionUser.sessionId);
      
      // Log successful authentication
      securityLogger.logAuthenticationEvent(
        'login_success',
        sessionUser.id,
        ip,
        {
          method: 'session_validation',
          path,
          userAgent,
        }
      );
      
      logger.debug(`🔒 AUTH MIDDLEWARE: Authenticated user: ${sessionUser.email}`);
      
      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      logger.error('🔒 AUTH MIDDLEWARE: Authentication error:', error);
      
      securityLogger.logEvent({
        type: 'authentication',
        severity: 'high',
        ip,
        userAgent,
        resource: path,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          middleware: 'auth',
        },
        blocked: true,
      });
      
      throw new HTTPException(401, { message: 'Authentication failed' });
    }
  };
};

/**
 * Optional authentication middleware - does not require authentication
 * Sets user context if valid session exists, otherwise continues without user
 */
export const optionalAuthMiddleware = () => {
  return async (c: Context, next: Next) => {
    try {
      // Get session token from httpOnly cookie
      let sessionToken = getCookie(c, 'session');
      
      // Fallback: Check Authorization header for API clients
      if (!sessionToken) {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          sessionToken = authHeader.substring(7);
        }
      }
      
      if (sessionToken) {
        try {
          // Validate session token
          const { validateSessionToken } = await import('../user/utils/validate-session-token.js');
          const result: ValidateSessionResult = await validateSessionToken(sessionToken);
          
          if (result.user && result.session) {
            // SECURITY: Map database user to SessionUser format
            const sessionUser: SessionUser = {
              id: result.user.id,
              email: result.user.email,
              role: 'USER', // TODO: Fetch actual role from user roles table
              workspaceId: '', // TODO: Fetch from user workspace relationship
              permissions: [], // TODO: Fetch from user permissions
              sessionId: result.session.id,
              lastActivity: Date.now()
            };
            
            // Set user context for authenticated requests
            c.set('userId', sessionUser.id);
            c.set('userEmail', sessionUser.email);
            c.set('user', sessionUser);
            c.set('sessionId', sessionUser.sessionId);
            
            logger.debug(`🔒 OPTIONAL AUTH: User authenticated: ${sessionUser.email}`);
          }
        } catch (error) {
          logger.debug('🔒 OPTIONAL AUTH: Session validation failed, continuing without auth');
          // Continue without authentication
        }
      }
      
      await next();
    } catch (error) {
      logger.error('🔒 OPTIONAL AUTH: Unexpected error:', error);
      // Continue without authentication
      await next();
    }
  };
};

/**
 * Role-based authorization middleware
 * Requires specific role to access the route
 */
export const requireRole = (requiredRole: string) => {
  const securityLogger = getSecurityLoggingService();
  
  return async (c: Context, next: Next) => {
    const user = c.get('user') as SessionUser;
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const path = c.req.path;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    const userRole = user.role || 'USER';
    
    if (userRole !== requiredRole && userRole !== 'ADMIN') {
      securityLogger.logAuthorizationEvent(
        false,
        user.id,
        path,
        'role_check',
        ip,
        {
          requiredRole,
          userRole,
          reason: 'insufficient_role',
        }
      );
      
      throw new HTTPException(403, { 
        message: `Access denied. Required role: ${requiredRole}` 
      });
    }
    
    securityLogger.logAuthorizationEvent(
      true,
      user.id,
      path,
      'role_check',
      ip,
      {
        requiredRole,
        userRole,
      }
    );
    
    await next();
  };
};

/**
 * Permission-based authorization middleware
 * Requires specific permission to access the route
 */
export const requirePermission = (requiredPermission: string) => {
  const securityLogger = getSecurityLoggingService();
  
  return async (c: Context, next: Next) => {
    const user = c.get('user') as SessionUser;
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const path = c.req.path;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    const userPermissions = user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission) && !userPermissions.includes('*')) {
      securityLogger.logAuthorizationEvent(
        false,
        user.id,
        path,
        'permission_check',
        ip,
        {
          requiredPermission,
          userPermissions,
          reason: 'insufficient_permissions',
        }
      );
      
      throw new HTTPException(403, { 
        message: `Access denied. Required permission: ${requiredPermission}` 
      });
    }
    
    securityLogger.logAuthorizationEvent(
      true,
      user.id,
      path,
      'permission_check',
      ip,
      {
        requiredPermission,
        userPermissions,
      }
    );
    
    await next();
  };
};

export default authMiddleware;

