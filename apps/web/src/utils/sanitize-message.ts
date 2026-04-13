// Message sanitization utility to prevent XSS attacks
// This provides basic protection until DOMPurify can be added

/**
 * Basic HTML sanitization to prevent XSS attacks
 * This is a temporary solution - should be replaced with DOMPurify for production
 */
export function sanitizeMessageContent(content: string): string {
  if (!content) return '';

  // Basic HTML entity encoding to prevent XSS
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Enhanced message content processor that handles mentions and task references
 * while maintaining security
 */
export function processMessageContent(content: string): {
  sanitizedContent: string;
  mentions: string[];
  taskReferences: string[];
} {
  const mentions: string[] = [];
  const taskReferences: string[] = [];

  // First sanitize the content
  const sanitizedContent = sanitizeMessageContent(content);

  // Extract mentions (@user) - but keep them sanitized
  const mentionMatches = content.match(/@[\w.-]+@[\w.-]+/g);
  if (mentionMatches) {
    mentions.push(...mentionMatches.map(mention => mention.slice(1))); // Remove @
  }

  // Extract task references (#123) - but keep them sanitized
  const taskMatches = content.match(/#\d+/g);
  if (taskMatches) {
    taskReferences.push(...taskMatches.map(ref => ref.slice(1))); // Remove #
  }

  return {
    sanitizedContent,
    mentions,
    taskReferences
  };
}

/**
 * Convert newlines to <br> tags safely
 */
export function convertNewlinesToHtml(content: string): string {
  return content.replace(/\n/g, '<br>');
}

/**
 * Validate that content doesn't contain malicious patterns
 */
export function validateMessageSecurity(content: string): boolean {
  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /data:text\/html/i,
    /vbscript:/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Comprehensive message validation with detailed error reporting
 */
export interface MessageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMessageContent(content: string, options: {
  maxLength?: number;
  minLength?: number;
  allowEmpty?: boolean;
  checkSecurity?: boolean;
} = {}): MessageValidationResult {
  const {
    maxLength = 4000,
    minLength = 1,
    allowEmpty = false,
    checkSecurity = true
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Trim content for validation
  const trimmedContent = content.trim();

  // Check if empty
  if (!allowEmpty && trimmedContent.length === 0) {
    errors.push('Message cannot be empty');
  }

  // Check minimum length
  if (trimmedContent.length > 0 && trimmedContent.length < minLength) {
    errors.push(`Message must be at least ${minLength} character${minLength > 1 ? 's' : ''} long`);
  }

  // Check maximum length
  if (trimmedContent.length > maxLength) {
    errors.push(`Message must be less than ${maxLength} characters (currently ${trimmedContent.length})`);
  }

  // Security validation
  if (checkSecurity && !validateMessageSecurity(trimmedContent)) {
    errors.push('Message contains potentially unsafe content and cannot be sent');
  }

  // Check for excessive whitespace
  if (trimmedContent.length > 0) {
    const whitespaceRatio = (content.length - trimmedContent.length) / content.length;
    if (whitespaceRatio > 0.5) {
      warnings.push('Message contains excessive whitespace');
    }
  }

  // Check for repeated characters (potential spam)
  const repeatedCharPattern = /(.)\1{10,}/;
  if (repeatedCharPattern.test(trimmedContent)) {
    warnings.push('Message contains repeated characters that may be flagged as spam');
  }

  // Check for excessive capitalization
  const capsRatio = (trimmedContent.match(/[A-Z]/g) || []).length / trimmedContent.length;
  if (trimmedContent.length > 20 && capsRatio > 0.7) {
    warnings.push('Message contains excessive capitalization');
  }

  // Check for too many mentions
  const mentions = (trimmedContent.match(/@[\w.-]+@[\w.-]+/g) || []);
  if (mentions.length > 10) {
    warnings.push('Message contains many mentions - consider splitting into multiple messages');
  }

  // Check for too many task references
  const taskRefs = (trimmedContent.match(/#\d+/g) || []);
  if (taskRefs.length > 20) {
    warnings.push('Message contains many task references - consider using a summary');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Rate limiting utility for message sending
 */
export class MessageRateLimit {
  private messageTimestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxMessages: number;

  constructor(windowMs: number = 60000, maxMessages: number = 10) {
    this.windowMs = windowMs; // 1 minute default
    this.maxMessages = maxMessages; // 10 messages per minute default
  }

  /**
   * Check if user can send a message
   */
  canSendMessage(): { allowed: boolean; resetTime?: number; remainingMessages?: number } {
    const now = Date.now();
    
    // Remove timestamps outside the window
    this.messageTimestamps = this.messageTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if limit exceeded
    if (this.messageTimestamps.length >= this.maxMessages) {
      const oldestTimestamp = Math.min(...this.messageTimestamps);
      const resetTime = oldestTimestamp + this.windowMs;
      
      return {
        allowed: false,
        resetTime,
        remainingMessages: 0
      };
    }

    return {
      allowed: true,
      remainingMessages: this.maxMessages - this.messageTimestamps.length
    };
  }

  /**
   * Record a message being sent
   */
  recordMessage(): void {
    this.messageTimestamps.push(Date.now());
  }

  /**
   * Get remaining time until rate limit resets
   */
  getResetTime(): number | null {
    if (this.messageTimestamps.length === 0) return null;
    
    const oldestTimestamp = Math.min(...this.messageTimestamps);
    const resetTime = oldestTimestamp + this.windowMs;
    const now = Date.now();
    
    return resetTime > now ? resetTime - now : null;
  }
}