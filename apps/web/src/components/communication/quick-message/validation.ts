import { MESSAGE_LIMITS, FILE_TYPES } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
}

// Validate message content
export function validateMessage(message: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if message is empty
  if (!message || message.trim().length === 0) {
    errors.push('Message cannot be empty');
  }

  // Check message length
  if (message.length > MESSAGE_LIMITS.MAX_LENGTH) {
    errors.push(`Message cannot exceed ${MESSAGE_LIMITS.MAX_LENGTH} characters`);
  }

  // Check for potentially problematic content
  if (message.trim().length < 2) {
    warnings.push('Very short messages might not be clear to recipients');
  }

  // Check for excessive whitespace
  if (message.length - message.trim().length > 50) {
    warnings.push('Message contains excessive whitespace');
  }

  // Check for all caps (potential shouting)
  if (message.length > 10 && message === message.toUpperCase()) {
    warnings.push('All caps messages might appear aggressive');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validate recipients
export function validateRecipients(recipients: Recipient[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if recipients are selected
  if (!recipients || recipients.length === 0) {
    errors.push('At least one recipient must be selected');
  }

  // Check for too many recipients
  if (recipients.length > 50) {
    warnings.push('Sending to many recipients might be slow');
  }

  // Check for duplicate recipients
  const recipientKeys = recipients.map(r => `${r.type}-${r.id}`);
  const uniqueKeys = new Set(recipientKeys);
  if (recipientKeys.length !== uniqueKeys.size) {
    warnings.push('Duplicate recipients detected');
  }

  // Validate individual recipients
  recipients.forEach((recipient, index) => {
    if (!recipient.id || !recipient.name || !recipient.type) {
      errors.push(`Invalid recipient at position ${index + 1}`);
    }

    if (recipient.type === 'user' && recipient.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient.email)) {
        errors.push(`Invalid email for recipient: ${recipient.name}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validate file attachments
export function validateAttachments(files: File[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  files.forEach((file, index) => {
    // Check file size
    if (file.size > MESSAGE_LIMITS.MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" exceeds maximum size of ${MESSAGE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check file type
    const allowedExtensions = FILE_TYPES.ALLOWED_EXTENSIONS.split(',').map(ext => ext.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File type "${fileExtension}" is not allowed for file "${file.name}"`);
    }

    // Check for empty files
    if (file.size === 0) {
      errors.push(`File "${file.name}" is empty`);
    }

    // Warn about large files
    if (file.size > MESSAGE_LIMITS.MAX_FILE_SIZE * 0.8) {
      warnings.push(`File "${file.name}" is quite large and might take time to upload`);
    }
  });

  // Check total attachment count
  if (files.length > 10) {
    warnings.push('Many attachments might slow down message sending');
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MESSAGE_LIMITS.MAX_FILE_SIZE * 5) {
    warnings.push('Total attachment size is very large');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validate entire message payload
export function validateMessagePayload(
  message: string,
  recipients: Recipient[],
  attachments: File[]
): ValidationResult {
  const messageValidation = validateMessage(message);
  const recipientValidation = validateRecipients(recipients);
  const attachmentValidation = validateAttachments(attachments);

  return {
    isValid: messageValidation.isValid && recipientValidation.isValid && attachmentValidation.isValid,
    errors: [
      ...messageValidation.errors,
      ...recipientValidation.errors,
      ...attachmentValidation.errors,
    ],
    warnings: [
      ...messageValidation.warnings,
      ...recipientValidation.warnings,
      ...attachmentValidation.warnings,
    ],
  };
}

// Sanitize message content
export function sanitizeMessage(message: string): string {
  // Remove potentially harmful content
  return message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Validate workspace ID
export function validateWorkspaceId(workspaceId: string): ValidationResult {
  const errors: string[] = [];
  
  if (!workspaceId || workspaceId.trim().length === 0) {
    errors.push('Workspace ID is required');
  }

  if (workspaceId && workspaceId.length < 10) {
    errors.push('Invalid workspace ID format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}