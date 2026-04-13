/**
 * Security Configuration
 * 
 * Centralized security configuration for the Meridian API:
 * - CSRF protection settings
 * - Session security configuration  
 * - CORS policy management
 * - Security headers and middleware
 * - Rate limiting and abuse protection
 */

import { CSRFMiddlewareOptions } from '../middlewares/csrf-protection'
import { SessionStoreOptions } from '../services/redis-session-store'

export interface SecurityConfig {
  csrf: CSRFMiddlewareOptions
  session: SessionStoreOptions
  cors: {
    origins: string[]
    credentials: boolean
    optionsSuccessStatus: number
    preflightContinue: boolean
  }
  rateLimit: {
    windowMs: number
    max: number
    message: string
    standardHeaders: boolean
    legacyHeaders: boolean
  }
  security: {
    contentSecurityPolicy: string
    xssProtection: string
    noSniff: boolean
    referrerPolicy: string
    hsts: {
      maxAge: number
      includeSubDomains: boolean
      preload: boolean
    }
  }
}

/**
 * Development Security Configuration
 */
export const developmentSecurityConfig: SecurityConfig = {
  csrf: {
    tokenTTL: 3600, // 1 hour
    rotationInterval: 1800, // 30 minutes
    production: false,
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
    allowSubdomains: true,
    skipPaths: [
      '/health',
      '/api/user/sign-in',
      '/api/user/sign-up',
      '/api/csrf/token',
      '/api/performance/*',
    ],
    cookieOptions: {
      httpOnly: false, // Allow client access for AJAX
      secure: false, // HTTP in development
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    }
  },
  session: {
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'meridian:dev:session:',
    ttl: 86400, // 24 hours
    maxRetries: 3,
    enableOfflineQueue: true,
    lazyConnect: true,
  },
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Generous limit for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  security: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    xssProtection: '1; mode=block',
    noSniff: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    hsts: {
      maxAge: 0, // Disabled in development
      includeSubDomains: false,
      preload: false,
    }
  }
}

/**
 * Production Security Configuration
 */
export const productionSecurityConfig: SecurityConfig = {
  csrf: {
    tokenTTL: 3600, // 1 hour
    rotationInterval: 1800, // 30 minutes
    production: true,
    trustedOrigins: [
      process.env.FRONTEND_URL,
      process.env.API_URL,
      process.env.ADMIN_URL,
    ].filter((url): url is string => Boolean(url)),
    allowSubdomains: true,
    skipPaths: [
      '/health',
      '/api/user/sign-in',
      '/api/user/sign-up',
      '/api/csrf/token',
    ],
    cookieOptions: {
      httpOnly: false, // Allow client access for AJAX
      secure: true, // HTTPS only
      sameSite: 'strict', // Strict in production
      maxAge: 3600,
      path: '/',
      domain: process.env.COOKIE_DOMAIN,
    }
  },
  session: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB) || 0,
    keyPrefix: 'meridian:prod:session:',
    ttl: 86400, // 24 hours
    maxRetries: 5,
    enableOfflineQueue: false, // Fail fast in production
    lazyConnect: false,
  },
  cors: {
    origins: [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter((url): url is string => Boolean(url)),
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Stricter limit for production
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  security: {
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    xssProtection: '1; mode=block',
    noSniff: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    }
  }
}

/**
 * Testing Security Configuration
 */
export const testingSecurityConfig: SecurityConfig = {
  ...developmentSecurityConfig,
  csrf: {
    ...developmentSecurityConfig.csrf,
    tokenTTL: 300, // 5 minutes for faster testing
    rotationInterval: 60, // 1 minute
  },
  session: {
    ...developmentSecurityConfig.session,
    keyPrefix: 'meridian:test:session:',
    ttl: 3600, // 1 hour
  },
  rateLimit: {
    ...developmentSecurityConfig.rateLimit,
    max: 10000, // Very high for testing
  }
}

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'production':
      return productionSecurityConfig
    case 'test':
      return testingSecurityConfig
    case 'development':
    default:
      return developmentSecurityConfig
  }
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // CSRF validation
  if (config.csrf.trustedOrigins.length === 0) {
    errors.push('CSRF trusted origins cannot be empty')
  }

  if (config.csrf.tokenTTL < 300) {
    warnings.push('CSRF token TTL is very short (< 5 minutes)')
  }

  if (config.csrf.tokenTTL > 86400) {
    warnings.push('CSRF token TTL is very long (> 24 hours)')
  }

  // Session validation
  if (!config.session.host) {
    errors.push('Redis session host is required')
  }

  if (config.session.ttl < 3600) {
    warnings.push('Session TTL is very short (< 1 hour)')
  }

  // CORS validation
  if (config.cors.origins.length === 0) {
    errors.push('CORS origins cannot be empty')
  }

  for (const origin of config.cors.origins) {
    try {
      new URL(origin)
    } catch {
      errors.push(`Invalid CORS origin: ${origin}`)
    }
  }

  // Production-specific validation
  if (process.env.NODE_ENV === 'production') {
    if (!config.csrf.cookieOptions?.secure) {
      errors.push('CSRF cookies must be secure in production')
    }

    if (config.csrf.cookieOptions?.sameSite !== 'strict') {
      warnings.push('Consider using strict SameSite cookies in production')
    }

    if (config.security.hsts.maxAge < 31536000) {
      warnings.push('HSTS max-age should be at least 1 year in production')
    }

    if (config.rateLimit.max > 1000) {
      warnings.push('Rate limit is very high for production')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Security configuration presets for common scenarios
 */
export const securityPresets = {
  /**
   * High security preset for sensitive applications
   */
  highSecurity: {
    ...productionSecurityConfig,
    csrf: {
      ...productionSecurityConfig.csrf,
      tokenTTL: 1800, // 30 minutes
      rotationInterval: 900, // 15 minutes
      cookieOptions: {
        ...productionSecurityConfig.csrf.cookieOptions,
        sameSite: 'strict' as const,
      }
    },
    rateLimit: {
      ...productionSecurityConfig.rateLimit,
      max: 50, // Very strict
    },
    session: {
      ...productionSecurityConfig.session,
      ttl: 28800, // 8 hours
    }
  },

  /**
   * Balanced security preset for most applications
   */
  balanced: productionSecurityConfig,

  /**
   * Developer-friendly preset with relaxed security
   */
  developerFriendly: {
    ...developmentSecurityConfig,
    rateLimit: {
      ...developmentSecurityConfig.rateLimit,
      max: 5000, // Very high
    }
  }
}

export default getSecurityConfig

