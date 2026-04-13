// Centralized API Error Handling for Meridian
// @epic-3.2-time: Improved error handling for Mike's developer experience

export interface APIError {
  type: 'network' | 'server' | 'validation' | 'permission' | 'timeout' | 'unknown';
  status: number;
  message: string;
  details?: any;
  endpoint?: string;
  timestamp?: Date;
}

export class APIErrorHandler {
  /**
   * Classify and format API errors with context
   */
  static async handleAPIError(error: any, endpoint?: string): Promise<APIError> {
    const timestamp = new Date();
    
    // Handle fetch errors (network, timeout, etc.)
    if (error instanceof TypeError) {
      return {
        type: 'network',
        status: 0,
        message: 'Network connection failed. Please check your internet connection.',
        details: error.message,
        endpoint,
        timestamp,
      };
    }

    // Handle AbortError (timeouts)
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        status: 0,
        message: 'Request timed out. Please try again.',
        details: 'The request took too long to complete',
        endpoint,
        timestamp,
      };
    }

    // Handle Response objects (HTTP errors)
    if (error instanceof Response || (error.status && error.text)) {
      const status = error.status || 0;
      let message = 'An error occurred';
      let details = null;

      try {
        const errorText = await error.text();
        
        // Try to parse JSON error response
        try {
          const errorData = JSON.parse(errorText);
          message = errorData.message || errorData.error || message;
          details = errorData;
        } catch {
          // If not JSON, use the text directly
          message = errorText || message;
          details = errorText;
        }
      } catch {
        // Fallback to status-based messages
        message = APIErrorHandler.getStatusMessage(status);
      }

      return {
        type: APIErrorHandler.classifyByStatus(status),
        status,
        message,
        details,
        endpoint,
        timestamp,
      };
    }

    // Handle Error objects
    if (error instanceof Error) {
      return {
        type: 'unknown',
        status: 0,
        message: error.message || 'An unexpected error occurred',
        details: error.stack,
        endpoint,
        timestamp,
      };
    }

    // Handle plain objects or strings
    return {
      type: 'unknown',
      status: 0,
      message: typeof error === 'string' ? error : 'An unexpected error occurred',
      details: error,
      endpoint,
      timestamp,
    };
  }

  /**
   * Classify error type based on HTTP status code
   */
  private static classifyByStatus(status: number): APIError['type'] {
    if (status >= 400 && status < 500) {
      if (status === 401 || status === 403) return 'permission';
      if (status === 422 || status === 400) return 'validation';
      return 'validation';
    }
    
    if (status >= 500) {
      return 'server';
    }
    
    return 'unknown';
  }

  /**
   * Get user-friendly message for HTTP status codes
   */
  private static getStatusMessage(status: number): string {
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'You need to sign in to access this resource.',
      403: 'You don\'t have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'This action conflicts with existing data.',
      422: 'The provided data is invalid.',
      429: 'Too many requests. Please try again later.',
      500: 'Server error. Please try again later.',
      502: 'Service temporarily unavailable.',
      503: 'Service temporarily unavailable.',
      504: 'Request timed out. Please try again.',
    };

    return statusMessages[status] || `Error ${status}: Something went wrong.`;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: APIError): boolean {
    // Don't retry permission or validation errors
    if (error.type === 'permission' || error.type === 'validation') {
      return false;
    }

    // Don't retry 404 errors
    if (error.status === 404) {
      return false;
    }

    // Retry network, timeout, and server errors
    return ['network', 'timeout', 'server'].includes(error.type);
  }

  /**
   * Get retry delay for exponential backoff
   */
  static getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attemptNumber), 30000);
  }

  /**
   * Format error for user display
   */
  static formatForUser(error: APIError): string {
    const prefix = this.getErrorPrefix(error.type);
    return `${prefix} ${error.message}`;
  }

  private static getErrorPrefix(type: APIError['type']): string {
    const prefixes = {
      network: '🌐',
      server: '⚠️',
      validation: '⚠️',
      permission: '🔒',
      timeout: '⏱️',
      unknown: '❌',
    };

    return prefixes[type] || '❌';
  }

  /**
   * Log error for debugging (development only)
   */
  static logError(error: APIError): void {
    if (import.meta.env.DEV) {
      console.group(`🚨 API Error: ${error.type.toUpperCase()}`);
      console.error('Message:', error.message);
      console.error('Status:', error.status);
      console.error('Endpoint:', error.endpoint || 'Unknown');
      console.error('Timestamp:', error.timestamp);
      if (error.details) {
        console.error('Details:', error.details);
      }
      console.groupEnd();
    }
  }
}

/**
 * Hook for handling API errors in React components
 */
export function useAPIErrorHandler() {
  return {
    handleError: APIErrorHandler.handleAPIError,
    isRetryable: APIErrorHandler.isRetryable,
    getRetryDelay: APIErrorHandler.getRetryDelay,
    formatForUser: APIErrorHandler.formatForUser,
    logError: APIErrorHandler.logError,
  };
}

/**
 * Enhanced fetch wrapper with automatic error handling
 */
export async function apiRequest<T>(
  request: () => Promise<Response>, 
  endpoint?: string
): Promise<T> {
  try {
    const response = await request();
    
    if (!response.ok) {
      const error = await APIErrorHandler.handleAPIError(response, endpoint);
      APIErrorHandler.logError(error);
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    const apiError = await APIErrorHandler.handleAPIError(error, endpoint);
    APIErrorHandler.logError(apiError);
    throw apiError;
  }
} 