import { toast } from '@/lib/toast';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

export class RetryableError extends Error {
  constructor(message: string, public isRetryable: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

// Calculate delay with exponential backoff
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

// Check if error is retryable
function isRetryableError(error: any): boolean {
  // Network errors are usually retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Specific HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  // RetryableError instances
  if (error instanceof RetryableError) {
    return error.isRetryable;
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return true;
  }

  // Default to not retryable for unknown errors
  return false;
}

// Retry function with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        break;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, finalConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Wrapper for API calls with user-friendly retry feedback
export async function withRetryAndFeedback<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  let toastId: string | number | undefined;

  try {
    return await withRetry(
      operation,
      config,
      (attempt, error) => {
        console.warn(`${operationName} failed (attempt ${attempt}):`, error);
        
        // Show retry toast on first retry
        if (attempt === 1) {
          toastId = toast.loading(`${operationName} failed, retrying...`, {
            duration: Infinity,
          });
        } else {
          toast.loading(`Retry ${attempt} failed, trying again...`, {
            id: toastId,
            duration: Infinity,
          });
        }
      }
    );
  } catch (error) {
    // Dismiss any loading toast
    if (toastId) {
      toast.dismiss(toastId);
    }
    
    // Show final error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`${operationName} failed after ${config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts} attempts: ${errorMessage}`);
    
    throw error;
  } finally {
    // Dismiss loading toast on success
    if (toastId) {
      toast.dismiss(toastId);
    }
  }
}

// Network status detection
export function isOnline(): boolean {
  return navigator.onLine;
}

// Wait for network to come back online
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}

// Enhanced retry that waits for network connection
export async function withNetworkAwareRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Check if offline and wait for connection
  if (!isOnline()) {
    const offlineToastId = toast.loading('You appear to be offline. Waiting for connection...', {
      duration: Infinity,
    });

    try {
      await waitForOnline();
      toast.success('Connection restored!', { id: offlineToastId });
    } catch (error) {
      toast.dismiss(offlineToastId);
      throw new Error('Network connection required');
    }
  }

  return withRetryAndFeedback(operation, operationName, config);
}