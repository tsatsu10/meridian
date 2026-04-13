/**
 * XSS Protection Utilities
 * Sanitizes user-generated content to prevent Cross-Site Scripting attacks
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns Escaped text safe for HTML rendering
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitizes a string by removing potentially dangerous content
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove any script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitizes a URL to ensure it's safe
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  // Block javascript: and data: protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }
  
  // Only allow http, https, and mailto protocols
  if (!/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    // If no protocol, assume https
    return `https://${trimmed}`;
  }
  
  return trimmed;
}

/**
 * Sanitizes user-generated HTML content
 * Allows basic formatting but removes dangerous elements
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Allowed tags for basic formatting
  const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a'];
  
  let sanitized = html;
  
  // Remove all tags except allowed ones
  sanitized = sanitized.replace(/<(\/?)([\w]+)([^>]*)>/gi, (match, closing, tag, attrs) => {
    const tagLower = tag.toLowerCase();
    
    if (!allowedTags.includes(tagLower)) {
      return ''; // Remove disallowed tags
    }
    
    // For anchor tags, sanitize href attribute
    if (tagLower === 'a') {
      const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
      if (hrefMatch) {
        const href = sanitizeUrl(hrefMatch[1]);
        if (href) {
          return `<${closing}a href="${href}" rel="noopener noreferrer" target="_blank">`;
        }
        return ''; // Remove anchor if href is invalid
      }
    }
    
    // Return tag without attributes (except for a tags handled above)
    return `<${closing}${tagLower}>`;
  });
  
  return sanitized;
}

/**
 * Sanitizes object properties recursively
 * Useful for sanitizing entire API response objects
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 * @param email - Email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitizes phone numbers
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except + (for international)
  return phone.replace(/[^\d+\s\-\(\)]/g, '').trim();
}

