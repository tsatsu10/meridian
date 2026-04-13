/**
 * Structured Logging Middleware for Hono
 * 
 * Automatically logs all HTTP requests and responses with structured data:
 * - Request method, URL, headers, and body
 * - Response status, duration, and error details
 * - User context and session information
 * - Performance metrics and security events
 */

import { Context, Next } from 'hono'
import { createId } from '@paralleldrive/cuid2'
import logger from '../utils/logger';

export interface RequestContext {
  requestId: string
  userId?: string
  userEmail?: string
  sessionId?: string
  userAgent?: string
  ip?: string
  method: string
  url: string
  startTime: number
}

/**
 * Enhanced logging middleware with comprehensive request tracking
 */
export function loggingMiddleware() {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const requestId = createId()
    
    // Extract request information
    const method = c.req.method
    const url = c.req.url
    const userAgent = c.req.header('user-agent')
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    
    // Get user context if available (from auth middleware)
    const user = c.get('user')
    const session = c.get('session')
    
    const requestContext: RequestContext = {
      requestId,
      userId: user?.id,
      userEmail: user?.email,
      sessionId: session?.id,
      userAgent,
      ip,
      method,
      url,
      startTime
    }
    
    // Set request context for downstream use
    c.set('requestContext', requestContext)
    
    // Log incoming request
    await logger.request(method, url, {
      userId: user?.id,
      requestId,
    })
    
    // Enhanced request details for debugging
    await logger.debug('Request Details', {
      requestId,
      headers: {
        'user-agent': userAgent,
        'content-type': c.req.header('content-type'),
        'authorization': c.req.header('authorization') ? '[PRESENT]' : '[ABSENT]',
        'x-forwarded-for': c.req.header('x-forwarded-for'),
      },
      query: c.req.query(),
      ip
    }, 'API', { userId: user?.id, requestId })
    
    let error: Error | null = null
    let statusCode = 200
    
    try {
      // Execute request
      await next()
      statusCode = c.res.status
      
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      statusCode = 500
      
      // Log error details
      await logger.error('Request Error', {
        requestId,
        error: error.message,
        stack: error.stack,
        method,
        url
      }, 'API', { userId: user?.id, requestId })
      
      // Re-throw to let error handler deal with it
      throw error
      
    } finally {
      // Calculate response time
      const duration = Date.now() - startTime
      
      // Log response
      await logger.response(method, url, statusCode, duration, {
        userId: user?.id,
        requestId,
      })
      
      // Log slow requests as performance warnings
      if (duration > 1000) { // Requests over 1 second
        await logger.performance('warn', `Slow Request: ${method} ${url}`, {
          duration,
          statusCode,
          requestId
        }, { userId: user?.id, requestId })
      }
      
      // Log business metrics for analytics
      if (statusCode >= 200 && statusCode < 300) {
        await logger.businessEvent('request_completed', {
          method,
          url,
          duration,
          statusCode
        }, {
          userId: user?.id,
          requestId
        })
      }
    }
  }
}

/**
 * Security event logging middleware
 */
export function securityLoggingMiddleware() {
  return async (c: Context, next: Next) => {
    const requestContext = c.get('requestContext') as RequestContext
    const suspicious = []
    
    // Check for suspicious patterns
    const userAgent = c.req.header('user-agent')
    if (!userAgent || userAgent.length < 10) {
      suspicious.push('missing_or_short_user_agent')
    }
    
    // Check for common attack patterns in URL
    const url = c.req.url.toLowerCase()
    const attackPatterns = ['/admin', '/wp-admin', '/.env', '/config', '/phpMyAdmin', '/api/v1/auth/']
    if (attackPatterns.some(pattern => url.includes(pattern))) {
      suspicious.push('suspicious_url_pattern')
    }
    
    // Check for SQL injection attempts in query parameters
    const query = JSON.stringify(c.req.query()).toLowerCase()
    const sqlPatterns = ['union select', 'drop table', 'delete from', '--', 'script>']
    if (sqlPatterns.some(pattern => query.includes(pattern))) {
      suspicious.push('sql_injection_attempt')
    }
    
    // Log suspicious activity
    if (suspicious.length > 0) {
      await logger.security('Suspicious Request Detected', {
        requestId: requestContext?.requestId,
        url: c.req.url,
        method: c.req.method,
        userAgent,
        ip: requestContext?.ip,
        suspiciousIndicators: suspicious
      }, {
        userId: requestContext?.userId,
        requestId: requestContext?.requestId
      })
    }
    
    await next()
  }
}

/**
 * Database query logging middleware for specific routes
 */
export function databaseLoggingMiddleware() {
  return async (c: Context, next: Next) => {
    const requestContext = c.get('requestContext') as RequestContext
    
    // Override console methods temporarily to capture database queries
    const originalLog = console.log
    const queries: string[] = []
    
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('Query:') || message.includes('SELECT') || message.includes('INSERT') || message.includes('UPDATE') || message.includes('DELETE')) {
        queries.push(message)
      }
      originalLog.apply(console, args)
    }
    
    try {
      await next()
      
      // Log captured queries
      if (queries.length > 0) {
        await logger.query(`Executed ${queries.length} database queries`, undefined, {
          userId: requestContext?.userId,
          operation: `${c.req.method} ${c.req.url}`,
          requestId: requestContext?.requestId
        })
        
        // Log individual queries in debug mode
        for (const query of queries) {
          await logger.debug(`DB Query: ${query}`, {
            requestId: requestContext?.requestId
          }, 'DATABASE', {
            userId: requestContext?.userId,
            requestId: requestContext?.requestId
          })
        }
      }
    } finally {
      // Restore original console.log
      console.log = originalLog
    }
  }
}

export default loggingMiddleware

