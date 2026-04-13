/**
 * Frontend Error Handling System
 * Provides consistent error handling patterns across the React application
 */

import React from 'react';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

// Error Categories (matching backend)
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  CLIENT_ERROR = 'CLIENT_ERROR'
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Frontend Error Interface
export interface FrontendError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string; // User-friendly message
  details?: Record<string, any>;
  cause?: Error;
  timestamp: string;
  requestId?: string;
  context?: string; // Component or page context
}

// User-friendly error messages
const USER_MESSAGES = {
  [ErrorCategory.AUTHENTICATION]: {
    default: 'Please sign in to continue',
    expired: 'Your session has expired. Please sign in again',
    invalid: 'Invalid credentials. Please check your email and password'
  },
  [ErrorCategory.AUTHORIZATION]: {
    default: 'You don\'t have permission to perform this action',
    workspace: 'Access denied to this workspace',
    project: 'Access denied to this project'
  },
  [ErrorCategory.VALIDATION]: {
    default: 'Please check your input and try again',
    required: 'Please fill in all required fields',
    format: 'Please check the format of your input'
  },
  [ErrorCategory.NOT_FOUND]: {
    default: 'The requested item could not be found',
    workspace: 'Workspace not found',
    project: 'Project not found',
    task: 'Task not found'
  },
  [ErrorCategory.NETWORK]: {
    default: 'Connection problem. Please check your internet connection',
    timeout: 'Request timed out. Please try again',
    offline: 'You are currently offline. Changes will be saved when connection is restored'
  },
  [ErrorCategory.RATE_LIMIT]: {
    default: 'Too many requests. Please wait a moment and try again'
  },
  [ErrorCategory.CONFLICT]: {
    default: 'This item has been modified by someone else. Please refresh and try again'
  },
  [ErrorCategory.BUSINESS_LOGIC]: {
    default: 'Unable to complete this action due to business rules',
    limit: 'You have reached the limit for this feature'
  },
  [ErrorCategory.INTERNAL]: {
    default: 'Something went wrong. Please try again or contact support'
  },
  [ErrorCategory.CLIENT_ERROR]: {
    default: 'An unexpected error occurred. Please refresh the page'
  }
};

// Frontend Error Factory
export class FrontendErrorFactory {
  static fromAPIError(
    error: any,
    context?: string
  ): FrontendError {
    // Handle structured API errors
    if (error.error && error.error.code) {
      const apiError = error.error;
      return {
        code: apiError.code,
        message: apiError.message,
        category: apiError.category || ErrorCategory.INTERNAL,
        severity: this.getSeverityFromCategory(apiError.category),
        userMessage: this.getUserMessage(apiError.category, apiError.code, apiError.message),
        details: apiError.details,
        timestamp: apiError.timestamp || new Date().toISOString(),
        requestId: apiError.requestId,
        context
      };
    }

    // Handle HTTP errors
    if (error.status) {
      return this.fromHTTPStatus(error.status, error.message || error.statusText, context);
    }

    // Handle generic errors
    return this.fromGenericError(error, context);
  }

  static fromHTTPStatus(
    status: number,
    message?: string,
    context?: string
  ): FrontendError {
    const category = this.categorizeHTTPStatus(status);
    const code = `HTTP_${status}`;

    return {
      code,
      message: message || `HTTP ${status} Error`,
      category,
      severity: this.getSeverityFromStatus(status),
      userMessage: this.getUserMessage(category, code, message),
      timestamp: new Date().toISOString(),
      context
    };
  }

  static fromGenericError(
    error: Error | any,
    context?: string
  ): FrontendError {
    const message = error?.message || 'An unexpected error occurred';

    return {
      code: 'CLIENT_ERROR',
      message,
      category: ErrorCategory.CLIENT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      userMessage: this.getUserMessage(ErrorCategory.CLIENT_ERROR, 'CLIENT_ERROR', message),
      cause: error instanceof Error ? error : undefined,
      timestamp: new Date().toISOString(),
      context
    };
  }

  static fromNetworkError(
    error: any,
    context?: string
  ): FrontendError {
    const isOffline = !navigator.onLine;
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout');

    let code = 'NETWORK_ERROR';
    let userMessage = USER_MESSAGES[ErrorCategory.NETWORK].default;

    if (isOffline) {
      code = 'NETWORK_OFFLINE';
      userMessage = USER_MESSAGES[ErrorCategory.NETWORK].offline;
    } else if (isTimeout) {
      code = 'NETWORK_TIMEOUT';
      userMessage = USER_MESSAGES[ErrorCategory.NETWORK].timeout;
    }

    return {
      code,
      message: error.message || 'Network error',
      category: ErrorCategory.NETWORK,
      severity: isOffline ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      userMessage,
      cause: error,
      timestamp: new Date().toISOString(),
      context
    };
  }

  private static categorizeHTTPStatus(status: number): ErrorCategory {
    if (status === 401) return ErrorCategory.AUTHENTICATION;
    if (status === 403) return ErrorCategory.AUTHORIZATION;
    if (status === 404) return ErrorCategory.NOT_FOUND;
    if (status === 409) return ErrorCategory.CONFLICT;
    if (status === 422) return ErrorCategory.VALIDATION;
    if (status === 429) return ErrorCategory.RATE_LIMIT;
    if (status >= 400 && status < 500) return ErrorCategory.VALIDATION;
    if (status >= 500) return ErrorCategory.INTERNAL;
    return ErrorCategory.INTERNAL;
  }

  private static getSeverityFromCategory(category: ErrorCategory): ErrorSeverity {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.VALIDATION:
      case ErrorCategory.NOT_FOUND:
        return ErrorSeverity.LOW;
      case ErrorCategory.NETWORK:
      case ErrorCategory.RATE_LIMIT:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.INTERNAL:
        return ErrorSeverity.HIGH;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private static getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 429) return ErrorSeverity.MEDIUM;
    if (status >= 400) return ErrorSeverity.LOW;
    return ErrorSeverity.LOW;
  }

  private static getUserMessage(
    category: ErrorCategory,
    code: string,
    originalMessage?: string
  ): string {
    const categoryMessages = USER_MESSAGES[category];
    if (!categoryMessages) return originalMessage || 'An error occurred';

    // Try to find specific message based on code or message content
    if (originalMessage) {
      const lowerMessage = originalMessage.toLowerCase();
      if (lowerMessage.includes('expired') && categoryMessages.expired) {
        return categoryMessages.expired;
      }
      if (lowerMessage.includes('invalid') && categoryMessages.invalid) {
        return categoryMessages.invalid;
      }
      if (lowerMessage.includes('workspace') && categoryMessages.workspace) {
        return categoryMessages.workspace;
      }
      if (lowerMessage.includes('project') && categoryMessages.project) {
        return categoryMessages.project;
      }
      if (lowerMessage.includes('task') && categoryMessages.task) {
        return categoryMessages.task;
      }
      if (lowerMessage.includes('required') && categoryMessages.required) {
        return categoryMessages.required;
      }
      if (lowerMessage.includes('format') && categoryMessages.format) {
        return categoryMessages.format;
      }
      if (lowerMessage.includes('limit') && categoryMessages.limit) {
        return categoryMessages.limit;
      }
      if (lowerMessage.includes('timeout') && categoryMessages.timeout) {
        return categoryMessages.timeout;
      }
      if (lowerMessage.includes('offline') && categoryMessages.offline) {
        return categoryMessages.offline;
      }
    }

    return categoryMessages.default || originalMessage || 'An error occurred';
  }
}

// Error Handler Class
export class ErrorHandler {
  static handle(
    error: any,
    options: {
      context?: string;
      showToast?: boolean;
      logError?: boolean;
      fallbackMessage?: string;
    } = {}
  ): FrontendError {
    const {
      context,
      showToast = true,
      logError = true,
      fallbackMessage
    } = options;

    let frontendError: FrontendError;

    // Determine error type and create appropriate FrontendError
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      frontendError = FrontendErrorFactory.fromNetworkError(error, context);
    } else if (error.response || error.status) {
      frontendError = FrontendErrorFactory.fromAPIError(error, context);
    } else {
      frontendError = FrontendErrorFactory.fromGenericError(error, context);
    }

    // Override user message if fallback provided
    if (fallbackMessage) {
      frontendError.userMessage = fallbackMessage;
    }

    // Log error based on severity
    if (logError) {
      const logData = {
        error: frontendError,
        originalError: error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: frontendError.timestamp
      };

      switch (frontendError.severity) {
        case ErrorSeverity.CRITICAL:
          logger.error('🚨 CRITICAL FRONTEND ERROR:', logData);
          break;
        case ErrorSeverity.HIGH:
          logger.error('❌ HIGH SEVERITY FRONTEND ERROR:', logData);
          break;
        case ErrorSeverity.MEDIUM:
          logger.warn('⚠️ MEDIUM SEVERITY FRONTEND ERROR:', logData);
          break;
        case ErrorSeverity.LOW:
          logger.info('ℹ️ LOW SEVERITY FRONTEND ERROR:', logData);
          break;
      }
    }

    // Show toast notification based on severity and user preference
    if (showToast && frontendError.severity !== ErrorSeverity.LOW) {
      this.showErrorToast(frontendError);
    }

    return frontendError;
  }

  private static showErrorToast(error: FrontendError): void {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(error.userMessage);
        break;
      case ErrorSeverity.MEDIUM:
        toast.error(error.userMessage);
        break;
      case ErrorSeverity.LOW:
        toast.warning(error.userMessage);
        break;
    }
  }

  // Async operation wrapper
  static async withErrorHandling<T>(
    asyncFn: () => Promise<T>,
    options: {
      context?: string;
      fallbackMessage?: string;
      showToast?: boolean;
      retries?: number;
    } = {}
  ): Promise<T | null> {
    const { retries = 0 } = options;
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;

        // Don't retry on authentication or validation errors
        const frontendError = FrontendErrorFactory.fromAPIError(error, options.context);
        if (frontendError.category === ErrorCategory.AUTHENTICATION ||
            frontendError.category === ErrorCategory.AUTHORIZATION ||
            frontendError.category === ErrorCategory.VALIDATION) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Handle the final error
    this.handle(lastError, {
      ...options,
      logError: true
    });

    return null;
  }
}

// React Hook for Error Handling
export const useErrorHandler = () => {
  const handleError = (
    error: any,
    context?: string,
    options?: {
      showToast?: boolean;
      fallbackMessage?: string;
    }
  ) => {
    return ErrorHandler.handle(error, {
      context,
      ...options
    });
  };

  const withErrorBoundary = async <T,>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    return ErrorHandler.withErrorHandling(asyncFn, { context });
  };

  return {
    handleError,
    withErrorBoundary
  };
};

// Network Status Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are now offline. Changes will be saved when connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

export default ErrorHandler;