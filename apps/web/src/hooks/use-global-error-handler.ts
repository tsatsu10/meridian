import { useEffect } from 'react';
import { toast } from '@/lib/toast';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface ErrorContext {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
}

const logError = (error: Error | ErrorEvent, context?: Partial<ErrorContext>) => {
  const errorData: ErrorContext = {
    message: error instanceof Error ? error.message : error.message || 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    userId: localStorage.getItem('userId') || undefined,
    ...context,
  };

  // Log to console in development
  if (import.meta.env.MODE === 'development') {
    console.group('🚨 Global Error Handler');
    console.error('Error:', error);
    console.error('Context:', errorData);
    console.groupEnd();
  }

  // Send to error tracking service (temporarily disabled to prevent infinite loops)
  if (import.meta.env.MODE !== 'development') {
    try {
      fetch(`${API_BASE_URL}/errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'global_error',
          data: errorData,
        }),
      }).catch(() => {
        // Silently fail to prevent error loops
      });
    } catch {
      // Silently fail to prevent error loops
    }
  }

  // Show user-friendly notification
  toast.error('An unexpected error occurred. We\'ve been notified and are working on a fix.', {
    action: {
      label: 'Reload',
      onClick: () => window.location.reload(),
    },
  });
};

export const useGlobalErrorHandler = () => {
  useEffect(() => {
    // Handle uncaught JavaScript errors
    const handleError = (event: ErrorEvent) => {
      logError(event, {
        message: event.message,
        stack: event.error?.stack,
      });
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError(new Error(event.reason?.message || 'Unhandled Promise Rejection'), {
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
      });
    };

    // Handle resource loading errors (images, scripts, etc.)
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName) {
        logError(new Error(`Resource loading failed: ${target.tagName}`), {
          message: `Failed to load ${target.tagName.toLowerCase()}`,
        });
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleResourceError, true); // Use capture phase for resource errors

    // Network error handler for fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        const url = args[0]?.toString() || 'unknown';

        // Skip error logging for error tracking endpoint to prevent infinite loops
        if (url.includes('/api/errors')) {
          return response;
        }

        // Log 5xx responses as critical errors, but be selective about 4xx errors
        if (!response.ok) {
          // Always log 5xx server errors
          if (response.status >= 500) {
            logError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
              message: `Server Error: ${response.status} ${response.statusText}`,
              url: url,
            });
          }
          // Only log certain 4xx errors as critical (exclude common expected errors)
          else if (response.status >= 400 && response.status < 500) {
            const isExpectedError =
              response.status === 404 && (
                url.includes('/project/') ||
                url.includes('/task/') ||
                url.includes('/user/') ||
                url.includes('/workspace/') ||
                url.includes('/team/') // Team endpoint temporarily disabled
              ) ||
              response.status === 401 || // Authentication issues are handled elsewhere
              response.status === 403;   // Permission issues are handled elsewhere

            // Only log unexpected 4xx errors
            if (!isExpectedError) {
              logError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
                message: `Client Error: ${response.status} ${response.statusText}`,
                url: url,
              });
            }
          }
        }

        return response;
      } catch (error) {
        const url = args[0]?.toString() || 'unknown';

        // Skip error logging for error tracking endpoint to prevent infinite loops
        if (url.includes('/api/errors')) {
          throw error;
        }

        logError(error as Error, {
          message: `Network Error: ${(error as Error).message}`,
          url: url,
        });
        throw error;
      }
    };

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleResourceError, true);
      window.fetch = originalFetch; // Restore original fetch
    };
  }, []);

  // Return manual error logging function
  return {
    logError: (error: Error, context?: Partial<ErrorContext>) => {
      logError(error, context);
    },
  };
};