/**
 * 🔒 Universal Input Sanitization Utility
 * Comprehensive sanitization for ALL user inputs across the application
 * 
 * Protects against:
 * - XSS (Cross-Site Scripting)
 * - HTML Injection
 * - Script Injection
 * - Path Traversal
 * - SQL Injection (via input cleaning)
 * - NoSQL Injection
 * 
 * Usage across:
 * - Tasks (title, description)
 * - Projects (name, description, slug)
 * - Teams (name, description)
 * - Comments (content)
 * - Notes (title, content)
 * - User profiles (bio, name)
 * - Any user-generated content
 */

import logger from '../utils/logger';

/**
 * Comprehensive list of dangerous patterns
 */
const DANGEROUS_PATTERNS = {
  // Script execution
  scripts: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ],
  
  // HTML elements that can execute code
  dangerousElements: [
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /<applet[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<style[^>]*>.*?<\/style>/gi,
  ],
  
  // Event handlers
  eventHandlers: [
    /on\w+\s*=/gi, // onclick, onerror, onload, etc.
  ],
  
  // Path traversal
  pathTraversal: [
    /\.\.[\/\\]/g, // ../
    /\.\.%2[fF]/g, // URL encoded ../
    /\.\.%5[cC]/g, // URL encoded ..\
  ],
  
  // SQL injection patterns
  sqlInjection: [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/gi,
    /(\bdrop\b.*\btable\b)|(\btable\b.*\bdrop\b)/gi,
    /--\s*$/g, // SQL comment at end
    /\/\*.*\*\//g, // SQL block comments
  ],
  
  // NoSQL injection
  noSqlInjection: [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$regex/gi,
  ],
};

/**
 * HTML entities to escape
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strip ALL HTML tags
 */
export function stripHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Check if content contains ANY dangerous patterns
 */
export function containsDangerousContent(text: string): {
  isDangerous: boolean;
  matchedPatterns: string[];
} {
  if (!text || typeof text !== 'string') {
    return { isDangerous: false, matchedPatterns: [] };
  }

  const matchedPatterns: string[] = [];

  // Check all pattern categories
  Object.entries(DANGEROUS_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        matchedPatterns.push(`${category}[${index}]`);
      }
    });
  });

  return {
    isDangerous: matchedPatterns.length > 0,
    matchedPatterns,
  };
}

/**
 * 🔒 COMPREHENSIVE TEXT SANITIZATION
 * Use for: Task titles, project names, any short text field
 */
export function sanitizeText(
  text: string,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    stripHtmlTags?: boolean;
  } = {}
): string {
  const {
    maxLength = 500,
    allowNewlines = false,
    stripHtmlTags = true,
  } = options;

  if (!text || typeof text !== 'string') return '';

  let sanitized = text.trim();

  // Check for dangerous content
  const { isDangerous, matchedPatterns } = containsDangerousContent(sanitized);
  if (isDangerous) {
    logger.warn('🚨 Dangerous content detected and sanitized', {
      contentPreview: sanitized.substring(0, 100),
      patterns: matchedPatterns,
    });

    // Remove ALL dangerous patterns
    Object.values(DANGEROUS_PATTERNS)
      .flat()
      .forEach((pattern) => {
        sanitized = sanitized.replace(pattern, '[removed]');
      });
  }

  // Strip HTML if requested
  if (stripHtmlTags) {
    sanitized = stripHtml(sanitized);
  }

  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    logger.debug('Text truncated', { maxLength, original: text.length });
  }

  return sanitized;
}

/**
 * 🔒 RICH TEXT SANITIZATION
 * Use for: Task descriptions, project descriptions, notes, comments
 * Allows some HTML but strips dangerous elements
 */
export function sanitizeRichText(
  text: string,
  options: {
    maxLength?: number;
    allowMarkdown?: boolean;
  } = {}
): string {
  const { maxLength = 10000, allowMarkdown = true } = options;

  if (!text || typeof text !== 'string') return '';

  let sanitized = text.trim();

  // Check for and remove dangerous content
  const { isDangerous, matchedPatterns } = containsDangerousContent(sanitized);
  if (isDangerous) {
    logger.warn('🚨 Dangerous rich text content detected', {
      contentPreview: sanitized.substring(0, 100),
      patterns: matchedPatterns,
    });

    // Remove dangerous patterns
    Object.values(DANGEROUS_PATTERNS)
      .flat()
      .forEach((pattern) => {
        sanitized = sanitized.replace(pattern, '[removed]');
      });
  }

  // For now, strip ALL HTML to be safe
  // In future, can use a library like DOMPurify to allow safe HTML
  sanitized = stripHtml(sanitized);

  // Length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * 🔒 SLUG SANITIZATION
 * Use for: URL slugs, identifiers
 */
export function sanitizeSlug(slug: string, maxLength: number = 100): string {
  if (!slug || typeof slug !== 'string') return '';

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Only alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength);
}

/**
 * 🔒 FILE NAME SANITIZATION
 * Use for: File uploads, attachments
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'file';

  let sanitized = fileName.trim();

  // Remove path separators (path traversal prevention)
  sanitized = sanitized
    .replace(/\.\./g, '') // Remove ../
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove Windows-invalid chars and control chars
    .trim();

  // Strip HTML
  sanitized = stripHtml(sanitized);

  // Length limit
  if (sanitized.length > 255) {
    // Preserve extension
    const parts = sanitized.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const name = parts.join('.');
    sanitized = name.substring(0, 250) + (ext ? `.${ext}` : '');
  }

  return sanitized || 'file';
}

/**
 * 🔒 EMAIL VALIDATION
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254 && !email.includes('..');
}

/**
 * 🔒 URL VALIDATION
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    // Only allow http/https
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 🔒 SANITIZE URL
 */
export function sanitizeUrl(url: string, maxLength: number = 2000): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  
  if (!isValidUrl(trimmed)) {
    logger.warn('Invalid URL blocked', { url: trimmed.substring(0, 100) });
    return '';
  }

  return trimmed.substring(0, maxLength);
}

/**
 * 🔒 SANITIZE NUMBER
 * Prevents NaN, Infinity, and ensures valid range
 */
export function sanitizeNumber(
  value: any,
  options: {
    min?: number;
    max?: number;
    defaultValue?: number;
  } = {}
): number {
  const { min = -Infinity, max = Infinity, defaultValue = 0 } = options;

  const parsed = Number(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, min), max);
}

/**
 * 🔒 SANITIZE ARRAY
 * Removes duplicates, invalid items, limits size
 */
export function sanitizeArray<T>(
  arr: any[],
  options: {
    maxLength?: number;
    validator?: (item: T) => boolean;
    unique?: boolean;
  } = {}
): T[] {
  const { maxLength = 1000, validator, unique = false } = options;

  if (!Array.isArray(arr)) return [];

  let sanitized = arr.filter((item) => {
    if (validator && !validator(item)) return false;
    return true;
  });

  if (unique) {
    sanitized = [...new Set(sanitized)];
  }

  return sanitized.slice(0, maxLength);
}

/**
 * 🔒 SANITIZE OBJECT
 * Removes dangerous keys, limits depth
 */
export function sanitizeObject(
  obj: any,
  options: {
    allowedKeys?: string[];
    maxDepth?: number;
    currentDepth?: number;
  } = {}
): any {
  const { allowedKeys, maxDepth = 5, currentDepth = 0 } = options;

  if (currentDepth >= maxDepth) {
    logger.warn('Object depth limit reached', { maxDepth });
    return {};
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      sanitizeObject(item, { ...options, currentDepth: currentDepth + 1 })
    );
  }

  const sanitized: any = {};

  Object.keys(obj).forEach((key) => {
    // Skip dangerous keys
    if (key.startsWith('__') || key.startsWith('$')) {
      logger.warn('Dangerous object key blocked', { key });
      return;
    }

    // Check allowed keys if specified
    if (allowedKeys && !allowedKeys.includes(key)) {
      return;
    }

    const value = obj[key];

    if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, {
        ...options,
        currentDepth: currentDepth + 1,
      });
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value, { maxLength: 5000 });
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * 🔒 COMPREHENSIVE INPUT SANITIZATION
 * Universal sanitizer for all user inputs
 */
export function sanitizeInput(
  input: any,
  type: 'text' | 'richText' | 'email' | 'url' | 'fileName' | 'slug' | 'number' | 'array' | 'object',
  options?: any
): any {
  switch (type) {
    case 'text':
      return sanitizeText(input, options);
    case 'richText':
      return sanitizeRichText(input, options);
    case 'email':
      return isValidEmail(input) ? input : '';
    case 'url':
      return sanitizeUrl(input, options?.maxLength);
    case 'fileName':
      return sanitizeFileName(input);
    case 'slug':
      return sanitizeSlug(input, options?.maxLength);
    case 'number':
      return sanitizeNumber(input, options);
    case 'array':
      return sanitizeArray(input, options);
    case 'object':
      return sanitizeObject(input, options);
    default:
      logger.warn('Unknown sanitization type', { type });
      return sanitizeText(String(input));
  }
}

/**
 * Export all functions
 */
export default {
  // Core functions
  escapeHtml,
  stripHtml,
  containsDangerousContent,
  
  // Type-specific sanitization
  sanitizeText,
  sanitizeRichText,
  sanitizeSlug,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeArray,
  sanitizeObject,
  
  // Validation
  isValidEmail,
  isValidUrl,
  
  // Universal
  sanitizeInput,
};

