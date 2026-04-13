/**
 * 🔒 Chat Input Sanitization Utility
 * Prevents XSS attacks and malicious content in chat messages
 * 
 * This utility provides comprehensive sanitization for:
 * - Message content (strip HTML, scripts, malicious patterns)
 * - Channel names (alphanumeric + common chars only)
 * - Mentions (validate email format)
 * - File names (prevent path traversal)
 */

import logger from '../utils/logger';

/**
 * Dangerous patterns to detect and block
 */
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

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
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strip all HTML tags from text
 */
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Convert HTML spaces to regular spaces
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Check if content contains dangerous patterns
 */
export function containsDangerousContent(text: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * 🔒 Sanitize message content
 * Removes HTML, scripts, and malicious patterns
 */
export function sanitizeMessageContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = content.trim();

  // Check for dangerous patterns
  if (containsDangerousContent(sanitized)) {
    logger.warn('🚨 Dangerous content detected and blocked', {
      contentPreview: sanitized.substring(0, 100),
      patterns: DANGEROUS_PATTERNS.filter(p => p.test(sanitized)).map(p => p.toString())
    });
    // Strip dangerous content
    DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[removed]');
    });
  }

  // Strip all HTML tags
  sanitized = stripHtml(sanitized);

  // Normalize whitespace
  sanitized = sanitized
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();

  // Length validation (belt and suspenders - should also be in schema)
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized;
}

/**
 * 🔒 Sanitize channel name
 * Allows: letters, numbers, hyphens, underscores, spaces
 */
export function sanitizeChannelName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let sanitized = name.trim();

  // Strip HTML
  sanitized = stripHtml(sanitized);

  // Allow only safe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '');

  // Normalize spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Length limit
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}

/**
 * 🔒 Sanitize channel description
 */
export function sanitizeChannelDescription(description: string): string {
  if (!description || typeof description !== 'string') {
    return '';
  }

  let sanitized = description.trim();

  // Strip HTML and dangerous content
  if (containsDangerousContent(sanitized)) {
    logger.warn('🚨 Dangerous content in description blocked');
    DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[removed]');
    });
  }

  sanitized = stripHtml(sanitized);
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Length limit
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }

  return sanitized;
}

/**
 * 🔒 Sanitize file name
 * Prevents path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof name !== 'string') {
    return 'file';
  }

  let sanitized = fileName.trim();

  // Remove path separators and dangerous patterns
  sanitized = sanitized
    .replace(/\.\./g, '') // Remove ../ path traversal
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/[<>:"|?*]/g, '') // Remove Windows-invalid chars
    .trim();

  // Strip HTML
  sanitized = stripHtml(sanitized);

  // Length limit
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized || 'file';
}

/**
 * 🔒 Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * 🔒 Sanitize array of emails (for mentions)
 */
export function sanitizeMentions(mentions: string[]): string[] {
  if (!Array.isArray(mentions)) {
    return [];
  }

  return mentions
    .filter(email => isValidEmail(email))
    .slice(0, 50); // Max 50 mentions per message
}

/**
 * 🔒 Sanitize attachment metadata
 */
export function sanitizeAttachment(attachment: any): any {
  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  return {
    id: String(attachment.id || '').substring(0, 100),
    name: sanitizeFileName(attachment.name || 'file'),
    url: String(attachment.url || '').substring(0, 2000),
    type: String(attachment.type || 'application/octet-stream').substring(0, 100),
    size: Math.min(Number(attachment.size) || 0, 100 * 1024 * 1024), // Max 100MB
  };
}

/**
 * 🔒 Sanitize array of attachments
 */
export function sanitizeAttachments(attachments: any[]): any[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map(att => sanitizeAttachment(att))
    .filter(att => att !== null)
    .slice(0, 10); // Max 10 attachments per message
}

/**
 * 🔒 Comprehensive message sanitization
 * Applies all sanitization rules for a complete message object
 */
export function sanitizeMessage(message: {
  content: string;
  mentions?: string[];
  attachments?: any[];
}): {
  content: string;
  mentions: string[];
  attachments: any[];
} {
  return {
    content: sanitizeMessageContent(message.content),
    mentions: message.mentions ? sanitizeMentions(message.mentions) : [],
    attachments: message.attachments ? sanitizeAttachments(message.attachments) : [],
  };
}

