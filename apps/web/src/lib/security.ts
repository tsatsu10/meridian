/**
 * 🔒 Security Utilities
 * 
 * Provides XSS protection, input sanitization, rate limiting,
 * and secure storage for the application.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Potentially unsafe HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 * 
 * @example
 * const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
 * const safe = sanitizeHtml(userInput); // Returns: '<p>Safe content</p>'
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ...options
  });
}

/**
 * Sanitize user input by removing all HTML tags
 * @param input - User input string
 * @returns Plain text with no HTML
 * 
 * @example
 * const input = '<script>alert("XSS")</script>Hello';
 * const safe = sanitizeInput(input); // Returns: 'Hello'
 */
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Validate and sanitize URL to prevent XSS and open redirects
 * @param url - URL string to validate
 * @param allowedDomains - Optional list of allowed domains
 * @returns Sanitized URL or empty string if invalid
 * 
 * @example
 * const url = sanitizeUrl('javascript:alert(1)'); // Returns: ''
 * const valid = sanitizeUrl('https://example.com'); // Returns: 'https://example.com'
 */
export function sanitizeUrl(url: string, allowedDomains?: string[]): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Check against allowed domains if provided
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) {
        return '';
      }
    }
    
    return parsed.toString();
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Rate Limiter for client-side actions
 * Prevents abuse by limiting the number of actions within a time window
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly storageKey = 'rate_limiter_attempts';
  
  constructor() {
    // Load persisted attempts from localStorage
    this.loadFromStorage();
    
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }
  
  /**
   * Check if an action is allowed based on rate limits
   * @param key - Unique identifier for the action (e.g., 'dashboard-refresh', 'export-data')
   * @param limit - Maximum number of attempts allowed (default: 10)
   * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
   * @returns true if action is allowed, false if rate limited
   * 
   * @example
   * if (!rateLimiter.isAllowed('dashboard-refresh', 5, 60000)) {
   *   toast.error('Too many refresh attempts. Please wait a minute.');
   *   return;
   * }
   */
  isAllowed(key: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Filter out old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= limit) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    // Persist to localStorage
    this.saveToStorage();
    
    return true;
  }
  
  /**
   * Get the number of remaining attempts for an action
   * @param key - Action identifier
   * @param limit - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns Number of remaining attempts (0 if rate limited)
   */
  getRemainingAttempts(key: string, limit: number = 10, windowMs: number = 60000): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    return Math.max(0, limit - recentAttempts.length);
  }
  
  /**
   * Get time until next attempt is allowed (in milliseconds)
   * @param key - Action identifier
   * @param windowMs - Time window in milliseconds
   * @returns Milliseconds until next attempt, or 0 if allowed now
   */
  getTimeUntilNextAttempt(key: string, windowMs: number = 60000): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const now = Date.now();
    const oldestAttempt = Math.min(...attempts);
    const timeUntilExpiry = windowMs - (now - oldestAttempt);
    
    return Math.max(0, timeUntilExpiry);
  }
  
  /**
   * Reset attempts for a specific key
   * @param key - Action identifier to reset
   */
  reset(key: string) {
    this.attempts.delete(key);
    this.saveToStorage();
  }
  
  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.attempts.clear();
    this.saveToStorage();
  }
  
  /**
   * Clean up expired attempts
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, attempts] of this.attempts.entries()) {
      const recent = attempts.filter(time => now - time < maxAge);
      if (recent.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recent);
      }
    }
    
    this.saveToStorage();
  }
  
  /**
   * Load persisted attempts from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.attempts = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load rate limiter data:', error);
    }
  }
  
  /**
   * Save attempts to localStorage
   */
  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.attempts.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limiter data:', error);
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

/**
 * Secure localStorage wrapper with basic obfuscation
 * Note: This is NOT encryption, just basic obfuscation for casual inspection
 * For truly sensitive data, use proper encryption or don't store client-side
 */
export const secureStorage = {
  /**
   * Store data with obfuscation
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  set(key: string, value: any) {
    try {
      const serialized = JSON.stringify(value);
      // Basic obfuscation using base64
      const obfuscated = btoa(encodeURIComponent(serialized));
      localStorage.setItem(`_sec_${key}`, obfuscated);
    } catch (error) {
      console.error('Failed to save to secure storage:', error);
    }
  },
  
  /**
   * Retrieve obfuscated data
   * @param key - Storage key
   * @returns Parsed value or null if not found
   */
  get(key: string): any {
    try {
      const item = localStorage.getItem(`_sec_${key}`);
      if (!item) return null;
      
      // Decode obfuscation
      const serialized = decodeURIComponent(atob(item));
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to read from secure storage:', error);
      return null;
    }
  },
  
  /**
   * Remove item from secure storage
   * @param key - Storage key
   */
  remove(key: string) {
    localStorage.removeItem(`_sec_${key}`);
  },
  
  /**
   * Clear all secure storage items
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('_sec_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

/**
 * Validate file upload
 * @param file - File object to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 * 
 * @example
 * const result = validateFileUpload(file, {
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   allowedTypes: ['image/*', 'application/pdf'],
 *   allowedExtensions: ['.jpg', '.png', '.pdf']
 * });
 * if (!result.valid) {
 *   toast.error(result.error);
 *   return;
 * }
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/*', 'application/pdf', 'text/*'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.md', '.json']
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
    };
  }
  
  // Check file type
  const isTypeAllowed = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.replace('/*', '');
      return file.type.startsWith(baseType);
    }
    return file.type === type;
  });
  
  if (!isTypeAllowed) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed`
    };
  }
  
  // Check file extension
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" is not allowed`
    };
  }
  
  return { valid: true };
}

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Text to escape
 * @returns Escaped text safe for HTML rendering
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if a string contains potential XSS patterns
 * @param input - String to check
 * @returns true if suspicious patterns found
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Generate a secure random string (for CSRF tokens, etc.)
 * @param length - Length of the random string
 * @returns Random string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

