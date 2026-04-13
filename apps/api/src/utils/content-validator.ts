/**
 * 🛡️ Content Validation System
 * Comprehensive validation and sanitization for user-generated content
 */

import { logger } from './logger';

export interface ValidationConfig {
  maxMessageLength: number;
  maxAttachments: number;
  maxMentions: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  blockedWords: string[];
  allowHtml: boolean;
  requireNonEmpty: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
  metadata?: {
    wordCount: number;
    characterCount: number;
    mentionCount: number;
    linkCount: number;
    hasUnsafeContent: boolean;
  };
}

export interface MessageValidationInput {
  content: string;
  messageType?: 'text' | 'file' | 'system';
  attachments?: any[];
  mentions?: string[];
  parentMessageId?: string;
}

export class ContentValidator {
  private config: ValidationConfig;
  private urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  private emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  private mentionRegex = /@([a-zA-Z0-9._-]+)/gi;
  private phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/gi;

  constructor(config: ValidationConfig) {
    this.config = config;
  }

  /**
   * Validate message content comprehensively
   */
  validateMessage(input: MessageValidationInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const { content, messageType = 'text', attachments = [], mentions = [] } = input;

      // Basic validation
      if (this.config.requireNonEmpty && (!content || content.trim().length === 0)) {
        errors.push('Message content cannot be empty');
      }

      if (typeof content !== 'string') {
        errors.push('Message content must be a string');
        return { isValid: false, errors, warnings };
      }

      // Length validation
      if (content.length > this.config.maxMessageLength) {
        errors.push(`Message too long (${content.length}/${this.config.maxMessageLength} characters)`);
      }

      // Attachment validation
      if (attachments.length > this.config.maxAttachments) {
        errors.push(`Too many attachments (${attachments.length}/${this.config.maxAttachments})`);
      }

      // Mention validation
      if (mentions.length > this.config.maxMentions) {
        errors.push(`Too many mentions (${mentions.length}/${this.config.maxMentions})`);
      }

      // Content analysis
      const metadata = this.analyzeContent(content);
      
      // Check for blocked content
      const blockedWordsFound = this.findBlockedWords(content);
      if (blockedWordsFound.length > 0) {
        errors.push(`Content contains blocked words: ${blockedWordsFound.join(', ')}`);
        metadata.hasUnsafeContent = true;
      }

      // Sanitize content
      let sanitized = this.sanitizeContent(content);

      // Additional validation based on message type
      switch (messageType) {
        case 'file':
          const fileErrors = this.validateFileAttachments(attachments);
          errors.push(...fileErrors);
          break;
        case 'system':
          // System messages have stricter validation
          if (metadata.linkCount > 0) {
            warnings.push('System messages should not contain external links');
          }
          break;
      }

      // Check for potential security issues
      const securityIssues = this.detectSecurityIssues(content);
      if (securityIssues.length > 0) {
        warnings.push(...securityIssues);
        metadata.hasUnsafeContent = true;
      }

      // Performance warning for very long messages
      if (content.length > this.config.maxMessageLength * 0.8) {
        warnings.push('Very long message may impact performance');
      }

      return {
        isValid: errors.length === 0,
        sanitized,
        errors,
        warnings,
        metadata
      };

    } catch (error) {
      logger.error('Content validation failed', { error, input });
      return {
        isValid: false,
        errors: ['Content validation system error'],
        warnings: []
      };
    }
  }

  /**
   * Analyze content for metadata
   */
  private analyzeContent(content: string) {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const links = content.match(this.urlRegex) || [];
    const mentions = content.match(this.mentionRegex) || [];
    
    return {
      wordCount: words.length,
      characterCount: content.length,
      mentionCount: mentions.length,
      linkCount: links.length,
      hasUnsafeContent: false
    };
  }

  /**
   * Find blocked words in content
   */
  private findBlockedWords(content: string): string[] {
    const lowerContent = content.toLowerCase();
    return this.config.blockedWords.filter(word => 
      lowerContent.includes(word.toLowerCase())
    );
  }

  /**
   * Sanitize content
   */
  private sanitizeContent(content: string): string {
    let sanitized = content;

    if (!this.config.allowHtml) {
      // Remove HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      
      // Decode HTML entities
      sanitized = sanitized
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
    }

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Validate file attachments
   */
  private validateFileAttachments(attachments: any[]): string[] {
    const errors: string[] = [];

    for (const attachment of attachments) {
      if (!attachment.type || !attachment.size) {
        errors.push('Invalid attachment format');
        continue;
      }

      // Check file type
      if (!this.config.allowedFileTypes.includes(attachment.type)) {
        errors.push(`File type not allowed: ${attachment.type}`);
      }

      // Check file size
      if (attachment.size > this.config.maxFileSize) {
        errors.push(`File too large: ${attachment.size} bytes (max: ${this.config.maxFileSize})`);
      }

      // Check file name
      if (attachment.name && !this.isValidFileName(attachment.name)) {
        errors.push(`Invalid file name: ${attachment.name}`);
      }
    }

    return errors;
  }

  /**
   * Detect potential security issues
   */
  private detectSecurityIssues(content: string): string[] {
    const issues: string[] = [];

    // Check for potential SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /--\s*$/m,
      /\/\*.*\*\//g
    ];

    if (sqlPatterns.some(pattern => pattern.test(content))) {
      issues.push('Content contains potential SQL injection patterns');
    }

    // Check for script injection
    const scriptPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i
    ];

    if (scriptPatterns.some(pattern => pattern.test(content))) {
      issues.push('Content contains potential script injection');
    }

    // Check for suspicious URLs
    const urls = content.match(this.urlRegex) || [];
    for (const url of urls) {
      if (this.isSuspiciousUrl(url)) {
        issues.push(`Suspicious URL detected: ${url}`);
      }
    }

    // Check for potential data exfiltration
    if (this.hasDataExfiltrationPatterns(content)) {
      issues.push('Content contains potential data exfiltration patterns');
    }

    return issues;
  }

  /**
   * Check if URL is suspicious
   */
  private isSuspiciousUrl(url: string): boolean {
    const suspiciousDomains = [
      'bit.ly',
      'tinyurl.com',
      'goo.gl',
      't.co'
    ];

    const suspiciousPatterns = [
      /\d+\.\d+\.\d+\.\d+/, // IP addresses
      /[a-f0-9]{32}/, // Potential MD5 hashes
      /localhost/i,
      /127\.0\.0\.1/,
      /0\.0\.0\.0/
    ];

    try {
      const urlObj = new URL(url);
      
      // Check suspicious domains
      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        return true;
      }

      // Check suspicious patterns
      if (suspiciousPatterns.some(pattern => pattern.test(url))) {
        return true;
      }

      return false;
    } catch {
      // Invalid URL format is also suspicious
      return true;
    }
  }

  /**
   * Check for data exfiltration patterns
   */
  private hasDataExfiltrationPatterns(content: string): boolean {
    const patterns = [
      /password/i,
      /token/i,
      /api[_-]?key/i,
      /secret/i,
      /private[_-]?key/i,
      /access[_-]?token/i,
      /bearer\s+[a-zA-Z0-9]+/i,
      /[a-zA-Z0-9]{32,}/g // Long alphanumeric strings (potential tokens)
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate file name
   */
  private isValidFileName(fileName: string): boolean {
    // Check for dangerous file name patterns
    const dangerousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid file name characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i,  // Windows reserved names
      /^\./,  // Hidden files starting with dot
      /\s+$/,  // Trailing whitespace
    ];

    if (dangerousPatterns.some(pattern => pattern.test(fileName))) {
      return false;
    }

    // Check file name length
    if (fileName.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * Quick validation for simple text
   */
  validateSimpleText(text: string): { isValid: boolean; error?: string } {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Invalid text input' };
    }

    if (text.length > this.config.maxMessageLength) {
      return { isValid: false, error: 'Text too long' };
    }

    const blockedWords = this.findBlockedWords(text);
    if (blockedWords.length > 0) {
      return { isValid: false, error: 'Text contains blocked content' };
    }

    return { isValid: true };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Content validator configuration updated', { 
      maxMessageLength: this.config.maxMessageLength,
      maxAttachments: this.config.maxAttachments
    });
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      config: this.config,
      features: {
        htmlSanitization: !this.config.allowHtml,
        blockedWordsFilter: this.config.blockedWords.length > 0,
        fileValidation: this.config.allowedFileTypes.length > 0,
        securityScanning: true,
        mentionLimit: this.config.maxMentions
      }
    };
  }
}

// Default configuration
const defaultConfig: ValidationConfig = {
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '10000'),
  maxAttachments: parseInt(process.env.MAX_ATTACHMENTS || '10'),
  maxMentions: parseInt(process.env.MAX_MENTIONS || '20'),
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,text/plain').split(','),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
  blockedWords: (process.env.BLOCKED_WORDS || '').split(',').filter(Boolean),
  allowHtml: process.env.ALLOW_HTML === 'true',
  requireNonEmpty: process.env.REQUIRE_NON_EMPTY !== 'false'
};

export const contentValidator = new ContentValidator(defaultConfig);
export default contentValidator;

