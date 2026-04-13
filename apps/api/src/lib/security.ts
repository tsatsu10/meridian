import { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono/rate-limiter';
import { createError } from './errors';
import logger from '../utils/logger';

// Security configuration
export const securityConfig = {
  // CORS configuration
  cors: {
    origin: (origin: string) => {
      // Allow requests from same origin
      if (!origin) return true;
      
      // Allow localhost for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return true;
      }
      
      // Allow production domains
      const allowedOrigins = [
        'https://meridian.app',
        'https://www.meridian.app',
        'https://app.meridian.com',
      ];
      
      return allowedOrigins.includes(origin);
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Request-ID',
    ],
    exposeHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.meridian.app wss://api.meridian.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // API rate limiting (stricter)
  apiRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Higher limit for API endpoints
    message: 'API rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
  },
};

// Security middleware factory
export function createSecurityMiddleware() {
  return async (c: Context, next: Next) => {
    // Add request ID for tracking
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);

    // Add security headers
    Object.entries(securityConfig.headers).forEach(([key, value]) => {
      c.header(key, value);
    });

    // Add CORS headers
    const origin = c.req.header('origin');
    if (origin && securityConfig.cors.origin(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
    }
    c.header('Access-Control-Allow-Methods', securityConfig.cors.allowMethods.join(', '));
    c.header('Access-Control-Allow-Headers', securityConfig.cors.allowHeaders.join(', '));
    c.header('Access-Control-Expose-Headers', securityConfig.cors.exposeHeaders.join(', '));
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', securityConfig.cors.maxAge.toString());

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  };
}

// Rate limiting middleware
export function createRateLimitMiddleware(config: typeof securityConfig.rateLimit) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Clean up old entries
    for (const [key, value] of requests) {
      if (value.resetTime < now) {
        requests.delete(key);
      }
    }
    
    // Get or create request count for this IP
    let requestData = requests.get(ip);
    if (!requestData || requestData.resetTime < now) {
      requestData = { count: 0, resetTime: now + config.windowMs };
      requests.set(ip, requestData);
    }
    
    // Check rate limit
    if (requestData.count >= config.max) {
      c.header('X-Rate-Limit-Limit', config.max.toString());
      c.header('X-Rate-Limit-Remaining', '0');
      c.header('X-Rate-Limit-Reset', new Date(requestData.resetTime).toISOString());
      
      throw createError.rateLimited(config.message);
    }
    
    // Increment counter
    requestData.count++;
    
    // Add rate limit headers
    c.header('X-Rate-Limit-Limit', config.max.toString());
    c.header('X-Rate-Limit-Remaining', (config.max - requestData.count).toString());
    c.header('X-Rate-Limit-Reset', new Date(requestData.resetTime).toISOString());
    
    await next();
  };
}

// Input validation middleware
export function createInputValidationMiddleware() {
  return async (c: Context, next: Next) => {
    // Check for suspicious patterns in request
    const userAgent = c.req.header('user-agent') || '';
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];
    
    // Check URL for XSS attempts
    const url = c.req.url;
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch {
      decodedUrl = url; // If decoding fails, use original URL
    }

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(decodedUrl)) {
        throw createError.validationError('Suspicious request detected');
      }
    }
    
    // Check User-Agent for bot patterns
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    if (isBot) {
      c.set('isBot', true);
    }
    
    await next();
  };
}

// Authentication middleware
export function createAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization');
    
    if (!authHeader) {
      throw createError.unauthorized('Authorization header required');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      throw createError.unauthorized('Invalid authorization format');
    }
    
    const token = authHeader.substring(7);
    
    try {
      // Verify JWT token
      const payload = await verifyJWT(token);
      c.set('userId', payload.userId);
      c.set('workspaceId', payload.workspaceId);
      c.set('userRole', payload.role);
    } catch (error) {
      throw createError.unauthorized('Invalid or expired token');
    }
    
    await next();
  };
}

// JWT verification function (mock implementation)
async function verifyJWT(token: string): Promise<any> {
  // In a real implementation, you would verify the JWT signature
  // This is a simplified version for demonstration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// API key validation middleware
export function createApiKeyMiddleware() {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key');
    
    if (!apiKey) {
      throw createError.unauthorized('API key required');
    }
    
    // Validate API key
    const isValidKey = await validateApiKey(apiKey);
    if (!isValidKey) {
      throw createError.unauthorized('Invalid API key');
    }
    
    await next();
  };
}

// API key validation function (mock implementation)
async function validateApiKey(apiKey: string): Promise<boolean> {
  // In a real implementation, you would check against a database
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

// Content Security Policy middleware
export function createCSPMiddleware() {
  return async (c: Context, next: Next) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    
    c.header('Content-Security-Policy', csp);
    
    await next();
  };
}

// Security audit middleware
export function createSecurityAuditMiddleware() {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId');
    
    try {
      await next();
    } finally {
      const duration = Date.now() - startTime;
      
      // Log security events
      const securityEvent = {
        requestId,
        method: c.req.method,
        url: c.req.url,
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        duration,
        status: c.res.status,
        timestamp: new Date().toISOString(),
      };
      
      // Send to security monitoring service
      await sendSecurityEvent(securityEvent);
    }
  };
}

// Send security event to monitoring service
async function sendSecurityEvent(event: any) {
  try {
    await fetch('/api/security/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    logger.error('Failed to send security event:', error);
  }
}

// Export middleware instances
export const securityMiddleware = createSecurityMiddleware();
export const rateLimitMiddleware = createRateLimitMiddleware(securityConfig.rateLimit);
export const apiRateLimitMiddleware = createRateLimitMiddleware(securityConfig.apiRateLimit);
export const inputValidationMiddleware = createInputValidationMiddleware();
export const authMiddleware = createAuthMiddleware();
export const apiKeyMiddleware = createApiKeyMiddleware();
export const cspMiddleware = createCSPMiddleware();
export const securityAuditMiddleware = createSecurityAuditMiddleware();

