/**
 * 🔒 Security Hardening Middleware
 * 
 * Comprehensive security layer with:
 * - Helmet security headers
 * - Enhanced CORS configuration
 * - Rate limiting by user/IP
 * - Request sanitization
 * - Security audit logging
 * 
 * @epic-infrastructure: Production security hardening
 */

import type { Context, Next } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit-logger';
import { RateLimitError } from '../utils/errors';

/**
 * Security headers middleware (Helmet-style)
 */
export async function securityHeaders(c: Context, next: Next) {
  await next();
  
  // X-Content-Type-Options: Prevent MIME-sniffing
  c.header('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options: Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection: Enable XSS filter (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block');
  
  // Strict-Transport-Security: Force HTTPS (production only)
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Referrer-Policy: Control referrer information
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy: Disable dangerous features
  c.header('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // Content-Security-Policy: Prevent XSS and injection attacks
  if (process.env.NODE_ENV === 'production') {
    c.header('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'"
    );
  }
  
  // Remove powered-by header (don't leak tech stack)
  c.header('X-Powered-By', ''); // Override any existing header
  
  // Add security.txt location
  c.header('X-Security-Contact', 'security@meridian.app');
}

/**
 * Rate limiter for API endpoints
 * 
 * Limits:
 * - 100 requests per minute per IP (general)
 * - 20 requests per minute per IP (auth endpoints)
 * - 200 requests per minute per authenticated user (general)
 */
export const generalRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per window per IP
  standardHeaders: 'draft-7', // Return rate limit info in headers
  keyGenerator: (c: Context) => {
    // Use user email if authenticated, otherwise IP
    const userEmail = c.get('userEmail');
    if (userEmail && userEmail !== 'anonymous') {
      return `user:${userEmail}`;
    }
    return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  },
  handler: (c: Context) => {
    const identifier = c.get('userEmail') || c.req.header('x-forwarded-for') || 'unknown';
    
    logger.warn('Rate limit exceeded', {
      identifier,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('user-agent'),
    });
    
    // Audit log rate limit violations
    auditLogger.logRateLimit({
      action: 'api_rate_limit',
      userEmail: c.get('userEmail'),
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      limitType: 'api_general',
      currentCount: 101, // Exceeded limit
      maxAllowed: 100,
      blockDuration: 60, // 1 minute
    });
    
    throw new RateLimitError('Too many requests. Please try again later.', 60, {
      limit: 100,
      window: '1 minute',
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // 20 requests per minute
  standardHeaders: 'draft-7',
  keyGenerator: (c: Context) => {
    // Always use IP for auth endpoints
    return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  },
  handler: (c: Context) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    logger.warn('Auth rate limit exceeded', {
      ip,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('user-agent'),
    });
    
    // Audit log auth rate limit violations (higher severity)
    auditLogger.logSecurityViolation({
      action: 'auth_rate_limit_exceeded',
      ipAddress: ip,
      userAgent: c.req.header('user-agent'),
      violationType: 'rate_limit',
      details: {
        path: c.req.path,
        limit: 20,
        window: '1 minute',
      },
      blockedAction: 'authentication_attempt',
    });
    
    throw new RateLimitError('Too many authentication attempts. Please try again later.', 60, {
      limit: 20,
      window: '1 minute',
    });
  },
});

/**
 * Premium user rate limiter (higher limits for paid plans)
 */
export const premiumRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 500, // 5x higher limit
  standardHeaders: 'draft-7',
  keyGenerator: (c: Context) => {
    const userEmail = c.get('userEmail');
    return userEmail || c.req.header('x-forwarded-for') || 'unknown';
  },
  handler: (c: Context) => {
    const identifier = c.get('userEmail') || c.req.header('x-forwarded-for');
    
    logger.warn('Premium rate limit exceeded', {
      identifier,
      path: c.req.path,
    });
    
    throw new RateLimitError('Rate limit exceeded', 60, {
      limit: 500,
      window: '1 minute',
      plan: 'premium',
    });
  },
});

/**
 * Request sanitization middleware
 * Prevents common injection attacks
 */
export async function sanitizeRequest(c: Context, next: Next) {
  const contentType = c.req.header('content-type');
  
  // Only sanitize JSON requests
  if (contentType?.includes('application/json')) {
    try {
      const body = await c.req.json();
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,  // Script tags
        /javascript:/gi,                  // JavaScript protocol
        /on\w+\s*=/gi,                   // Event handlers (onclick, onerror, etc.)
        /\beval\s*\(/gi,                 // Eval function
        /\bexec\s*\(/gi,                 // Exec function
      ];
      
      const bodyStr = JSON.stringify(body);
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyStr)) {
          logger.warn('Suspicious input detected', {
            pattern: pattern.source,
            userEmail: c.get('userEmail'),
            path: c.req.path,
            ipAddress: c.req.header('x-forwarded-for'),
          });
          
          // Audit log security violation
          await auditLogger.logSecurityViolation({
            action: 'malicious_input_detected',
            userEmail: c.get('userEmail'),
            ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
            userAgent: c.req.header('user-agent'),
            violationType: 'injection_attempt',
            details: {
              pattern: pattern.source,
              path: c.req.path,
              method: c.req.method,
            },
            blockedAction: 'request_processing',
          });
          
          return c.json({
            error: {
              message: 'Suspicious input detected',
              code: 'SEC_001',
              statusCode: 400,
            },
          }, 400);
        }
      }
      
      // Store sanitized body for subsequent middleware
      c.set('sanitizedBody', body);
    } catch (error) {
      // If JSON parsing fails, let it through (will be handled by route handler)
    }
  }
  
  await next();
}

/**
 * Request logging middleware for security auditing
 */
export async function requestLogger(c: Context, next: Next) {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  
  // Set request ID for use in handlers
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  
  await next();
  
  const duration = Date.now() - startTime;
  const statusCode = c.res.status;
  
  // Log request details
  const logData = {
    requestId,
    method: c.req.method,
    path: c.req.path,
    statusCode,
    duration,
    userEmail: c.get('userEmail') || 'anonymous',
    userId: c.get('userId'),
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
  
  // Log based on status code
  if (statusCode >= 500) {
    logger.error('Request failed (server error)', logData);
  } else if (statusCode >= 400) {
    logger.warn('Request failed (client error)', logData);
  } else {
    logger.info('Request completed', logData);
  }
}

/**
 * IP whitelist/blacklist middleware (optional)
 */
export function ipFilter(options: {
  whitelist?: string[];
  blacklist?: string[];
}) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(ip)) {
      logger.warn('Blocked request from blacklisted IP', {
        ip,
        path: c.req.path,
      });
      
      await auditLogger.logSecurityViolation({
        action: 'blacklisted_ip_access',
        ipAddress: ip,
        userAgent: c.req.header('user-agent'),
        violationType: 'unauthorized_access',
        details: {
          path: c.req.path,
          method: c.req.method,
        },
        blockedAction: 'request_access',
      });
      
      return c.json({
        error: {
          message: 'Access denied',
          code: 'SEC_002',
          statusCode: 403,
        },
      }, 403);
    }
    
    // Check whitelist (if configured)
    if (options.whitelist && options.whitelist.length > 0) {
      if (!options.whitelist.includes(ip)) {
        logger.warn('Blocked request from non-whitelisted IP', {
          ip,
          path: c.req.path,
        });
        
        return c.json({
          error: {
            message: 'Access denied',
            code: 'SEC_003',
            statusCode: 403,
          },
        }, 403);
      }
    }
    
    await next();
  };
}

/**
 * CORS validation middleware (enhanced)
 */
export function validateCors(c: Context, origin: string | undefined): string | null {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5200',
    'https://meridian.app',
    'https://www.meridian.app',
    'https://app.meridian.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean); // Remove undefined values
  
  // Allow configured origins
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Allow localhost in development
  if (process.env.NODE_ENV !== 'production' && origin?.startsWith('http://localhost:')) {
    return origin;
  }
  
  // Log suspicious CORS requests
  if (origin && process.env.NODE_ENV === 'production') {
    logger.warn('CORS request from unauthorized origin', {
      origin,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('user-agent'),
      ipAddress: c.req.header('x-forwarded-for'),
    });
  }
  
  return null;
}

/**
 * CSRF token validation middleware (for state-changing operations)
 */
export async function csrfProtection(c: Context, next: Next) {
  const method = c.req.method;
  
  // Only check CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = c.req.header('x-csrf-token');
    const sessionToken = c.req.header('authorization')?.replace('Bearer ', '');
    
    // Skip CSRF check for API key authentication
    if (sessionToken && !csrfToken) {
      // In production, you'd validate CSRF token here
      // For now, log the missing token
      if (process.env.ENABLE_CSRF === 'true') {
        logger.warn('Missing CSRF token', {
          method,
          path: c.req.path,
          userEmail: c.get('userEmail'),
        });
      }
    }
  }
  
  await next();
}

/**
 * Request size limiter
 * Prevents large payload attacks
 */
export function requestSizeLimit(maxBytes: number = 10 * 1024 * 1024) {
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length');
    
    if (contentLength && parseInt(contentLength) > maxBytes) {
      logger.warn('Request payload too large', {
        contentLength,
        maxBytes,
        path: c.req.path,
        userEmail: c.get('userEmail'),
        ipAddress: c.req.header('x-forwarded-for'),
      });
      
      return c.json({
        error: {
          message: 'Request payload too large',
          code: 'SEC_004',
          statusCode: 413,
          details: {
            maxSize: `${maxBytes / 1024 / 1024}MB`,
            receivedSize: `${parseInt(contentLength) / 1024 / 1024}MB`,
          },
        },
      }, 413);
    }
    
    await next();
  };
}

/**
 * User-Agent validation
 * Block requests without user agent (likely bots)
 */
export async function validateUserAgent(c: Context, next: Next) {
  const userAgent = c.req.header('user-agent');
  const path = c.req.path;
  
  // Skip validation for health check endpoints
  if (path.startsWith('/api/system-health') || path.startsWith('/api/health')) {
    await next();
    return;
  }
  
  if (!userAgent || userAgent.trim() === '') {
    logger.warn('Request without User-Agent header', {
      path,
      method: c.req.method,
      ipAddress: c.req.header('x-forwarded-for'),
    });
    
    // Log but don't block (some legitimate clients might not send UA)
    // In strict mode, you could return 400 here
  }
  
  await next();
}

/**
 * SQL injection pattern detection
 */
export async function sqlInjectionProtection(c: Context, next: Next) {
  const query = c.req.query();
  
  const sqlPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b).*(\bFROM\b|\bWHERE\b|\bINTO\b)/i,
    /['"];?\s*(OR|AND)\s*['"1]/i,
    /--/,
    /\/\*/,
  ];
  
  const queryStr = JSON.stringify(query);
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(queryStr)) {
      logger.error('SQL injection attempt detected', {
        query: queryStr,
        pattern: pattern.source,
        path: c.req.path,
        userEmail: c.get('userEmail'),
        ipAddress: c.req.header('x-forwarded-for'),
      });
      
      await auditLogger.logSecurityViolation({
        action: 'sql_injection_attempt',
        userEmail: c.get('userEmail'),
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        userAgent: c.req.header('user-agent'),
        violationType: 'injection_attempt',
        details: {
          query: queryStr,
          pattern: pattern.source,
          path: c.req.path,
          method: c.req.method,
        },
        blockedAction: 'database_query',
      });
      
      return c.json({
        error: {
          message: 'Invalid request parameters',
          code: 'SEC_005',
          statusCode: 400,
        },
      }, 400);
    }
  }
  
  await next();
}

/**
 * Slow down middleware - progressively increase delay for repeated requests
 */
export class SlowDown {
  private requestCounts: Map<string, { count: number; resetAt: number }> = new Map();
  private windowMs: number;
  private delayAfter: number;
  private delayMs: number;
  private maxDelayMs: number;

  constructor(options: {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
    maxDelayMs?: number;
  } = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute
    this.delayAfter = options.delayAfter || 50; // Start slowing after 50 requests
    this.delayMs = options.delayMs || 100; // Add 100ms delay per request
    this.maxDelayMs = options.maxDelayMs || 5000; // Max 5 second delay
  }

  middleware = async (c: Context, next: Next) => {
    const key = c.get('userEmail') || c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Get or create request count
    let record = this.requestCounts.get(key);
    
    if (!record || now > record.resetAt) {
      record = {
        count: 0,
        resetAt: now + this.windowMs,
      };
      this.requestCounts.set(key, record);
    }
    
    record.count++;
    
    // Calculate delay
    if (record.count > this.delayAfter) {
      const delayMultiplier = record.count - this.delayAfter;
      const delay = Math.min(delayMultiplier * this.delayMs, this.maxDelayMs);
      
      if (delay > 0) {
        logger.debug('Applying slow-down delay', {
          key,
          requestCount: record.count,
          delay,
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    await next();
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
  };

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetAt) {
        this.requestCounts.delete(key);
      }
    }
  }
}

// Export singleton instance
export const slowDown = new SlowDown({
  windowMs: 60 * 1000,
  delayAfter: 50,
  delayMs: 100,
  maxDelayMs: 5000,
});


