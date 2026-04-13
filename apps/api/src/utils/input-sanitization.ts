/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other injection attacks
 * Phase 0 - Security Hardening Implementation
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import logger from '../utils/logger';

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitize plain text (strip all HTML)
 */
export function sanitizePlainText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sanitize username (alphanumeric, dash, underscore only)
 */
export function sanitizeUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 50);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove special SQL/NoSQL operators
  return query
    .trim()
    .replace(/['";\\]/g, '')
    .replace(/(\$|--|\/\*|\*\/)/g, '')
    .slice(0, 200);
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  try {
    const parsedURL = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedURL.protocol)) {
      return null;
    }
    return parsedURL.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize file path (prevent directory traversal)
 */
export function sanitizeFilePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove ..
    .replace(/\/\//g, '/') // Remove //
    .replace(/^\//, '') // Remove leading /
    .trim();
}

/**
 * Sanitize object by removing dangerous keys
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> {
  const sanitized: any = {};
  
  for (const key of allowedKeys) {
    if (key in obj) {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

/**
 * Escape SQL wildcards
 */
export function escapeSQLWildcards(input: string): string {
  return input.replace(/[%_]/g, '\\$&');
}

/**
 * Validate and sanitize password
 */
export function sanitizePassword(password: string): string | null {
  // Check length
  if (password.length < 8 || password.length > 128) {
    return null;
  }

  // Check complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return null;
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'Password123', '12345678', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein',
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    return null;
  }

  return password;
}

/**
 * Comprehensive input sanitization schema builder
 */
export const sanitizationSchemas = {
  email: z.string().email().transform(sanitizeEmail),
  
  username: z.string()
    .min(3)
    .max(50)
    .transform(sanitizeUsername),
  
  plainText: z.string()
    .max(1000)
    .transform(sanitizePlainText),
  
  richText: z.string()
    .max(10000)
    .transform(sanitizeHTML),
  
  url: z.string()
    .url()
    .transform((url) => {
      const sanitized = sanitizeURL(url);
      if (!sanitized) throw new Error('Invalid URL');
      return sanitized;
    }),
  
  searchQuery: z.string()
    .max(200)
    .transform(sanitizeSearchQuery),
  
  password: z.string()
    .min(8)
    .max(128)
    .refine((pwd) => sanitizePassword(pwd) !== null, {
      message: 'Password does not meet security requirements',
    }),
};

/**
 * Sanitize request body
 */
export function sanitizeRequestBody<T extends Record<string, any>>(
  body: T,
  schema: z.ZodSchema
): T {
  try {
    return schema.parse(body);
  } catch (error) {
    throw new Error('Invalid input data');
  }
}

/**
 * Deep sanitize object (recursive)
 */
export function deepSanitize(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizePlainText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Check for suspicious patterns
 */
export function detectSuspiciousInput(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /eval\(/i,
    /expression\(/i,
    /import\s/i,
    /\$\{/i, // Template literals
    /<iframe/i,
    /<embed/i,
    /<object/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Log suspicious input attempts
 */
export function logSuspiciousInput(
  input: string,
  userId: string | null,
  endpoint: string
): void {
  logger.warn('⚠️  Suspicious input detected:', {
    endpoint,
    userId: userId || 'anonymous',
    inputLength: input.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Middleware helper to sanitize all string fields in request body
 */
export function sanitizeAllStrings<T extends Record<string, any>>(body: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Detect suspicious input
      if (detectSuspiciousInput(value)) {
        logSuspiciousInput(value, null, 'unknown');
        sanitized[key] = sanitizePlainText(value);
      } else {
        sanitized[key] = value;
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizePlainText(item) : item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeAllStrings(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}


