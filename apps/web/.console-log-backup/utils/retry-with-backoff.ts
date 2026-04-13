/**
 * Retry utility with exponential backoff
 * Retries failed requests with increasing delays between attempts
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;
  
  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;
  
  /**
   * Multiplier for exponential backoff
   * @default 2
   */
  backoffMultiplier?: number;
  
  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number;
  
  /**
   * Function to determine if error is retryable
   * @default Retries on network errors and 5xx status codes
   */
  shouldRetry?: (error: any, attempt: number) => boolean;
  
  /**
   * Callback function called before each retry
   */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

/**
 * Default retry condition - retries on network errors and 5xx status codes
 */
const defaultShouldRetry = (error: any, attempt: number): boolean => {
  // Don't retry after max attempts
  if (attempt >= 3) return false;
  
  // Retry on network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // Retry on 5xx server errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Retry on 429 (Too Many Requests)
  if (error.status === 429) {
    return true;
  }
  
  // Don't retry on client errors (4xx)
  return false;
};

/**
 * Calculates delay for next retry attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt < maxAttempts && shouldRetry(error, attempt)) {
        const delay = calculateDelay(attempt, initialDelay, backoffMultiplier, maxDelay);
        
        // Call onRetry callback if provided
        if (onRetry) {
          onRetry(error, attempt, delay);
        }
        
        console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms delay`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Don't retry, throw the error
        throw error;
      }
    }
  }
  
  // All retries exhausted
  throw lastError;
}

/**
 * Creates a fetch wrapper with automatic retry logic
 * @param options - Retry configuration options
 * @returns Fetch function with retry capability
 */
export function createRetryFetch(options: RetryOptions = {}) {
  return async function retryFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return retryWithBackoff(
      async () => {
        const response = await fetch(input, init);
        
        // Throw on HTTP errors to trigger retry logic
        if (!response.ok) {
          const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }
        
        return response;
      },
      options
    );
  };
}

/**
 * React Query compatible retry function
 * Use with TanStack Query's `retry` option
 */
export function reactQueryRetryFunction(
  failureCount: number,
  error: any
): boolean {
  return defaultShouldRetry(error, failureCount);
}

/**
 * Exponential backoff delay function for React Query
 * Use with TanStack Query's `retryDelay` option
 */
export function reactQueryRetryDelay(attemptIndex: number): number {
  return calculateDelay(attemptIndex, 1000, 2, 30000);
}

export default retryWithBackoff;

