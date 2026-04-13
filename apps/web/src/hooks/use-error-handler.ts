import { useState, useCallback, useRef } from 'react';

export interface UseErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
}

export interface ErrorState {
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
  hasRetried: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    hasRetried: false,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const handleError = useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    
    setErrorState(prev => ({
      ...prev,
      error,
    }));

    if (onError) {
      onError(error);
    }
  }, [onError]);

  const retry = useCallback(async (operation: () => Promise<any>) => {
    if (errorState.retryCount >= maxRetries) {
      console.warn('Max retries exceeded');
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
    }));

    if (onRetry) {
      onRetry(errorState.retryCount + 1);
    }

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Wait before retrying
    await new Promise(resolve => {
      retryTimeoutRef.current = setTimeout(resolve, retryDelay);
    });

    try {
      const result = await operation();
      
      // Success - clear error state
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        hasRetried: true,
      });

      return result;
    } catch (error) {
      // Failed again - increment retry count
      setErrorState(prev => ({
        ...prev,
        error: error as Error,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        hasRetried: true,
      }));

      throw error;
    }
  }, [errorState.retryCount, maxRetries, retryDelay, onRetry]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      hasRetried: false,
    });
  }, []);

  const reset = useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    hasRetried: errorState.hasRetried,
    canRetry: errorState.retryCount < maxRetries,
    handleError,
    retry,
    clearError,
    reset,
  };
}

// Hook for API calls with automatic retry
export function useApiCall<T>(
  apiCall: () => Promise<T>,
  options: UseErrorHandlerOptions = {}
) {
  const errorHandler = useErrorHandler(options);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const result = await apiCall();
      setData(result);
      errorHandler.clearError();
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, errorHandler]);

  const executeWithRetry = useCallback(async () => {
    return errorHandler.retry(execute);
  }, [errorHandler, execute]);

  return {
    data,
    isLoading,
    error: errorHandler.error,
    isRetrying: errorHandler.isRetrying,
    retryCount: errorHandler.retryCount,
    canRetry: errorHandler.canRetry,
    execute,
    executeWithRetry,
    retry: executeWithRetry,
    clearError: errorHandler.clearError,
    reset: errorHandler.reset,
  };
}

// Hook for handling async operations with loading and error states
export function useAsyncOperation<T, P extends any[]>(
  operation: (...args: P) => Promise<T>,
  options: UseErrorHandlerOptions = {}
) {
  const errorHandler = useErrorHandler(options);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (...args: P) => {
    setIsLoading(true);
    
    try {
      const result = await operation(...args);
      setData(result);
      errorHandler.clearError();
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [operation, errorHandler]);

  const executeWithRetry = useCallback(async (...args: P) => {
    return errorHandler.retry(() => execute(...args));
  }, [errorHandler, execute]);

  return {
    data,
    isLoading,
    error: errorHandler.error,
    isRetrying: errorHandler.isRetrying,
    retryCount: errorHandler.retryCount,
    canRetry: errorHandler.canRetry,
    execute,
    executeWithRetry,
    retry: executeWithRetry,
    clearError: errorHandler.clearError,
    reset: errorHandler.reset,
  };
}

// Hook for handling form submissions with error handling
export function useFormSubmission<T>(
  submitFn: (data: T) => Promise<any>,
  options: UseErrorHandlerOptions = {}
) {
  const errorHandler = useErrorHandler(options);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const submit = useCallback(async (data: T) => {
    setIsSubmitting(true);
    setIsSuccess(false);
    
    try {
      const result = await submitFn(data);
      setIsSuccess(true);
      errorHandler.clearError();
      return result;
    } catch (error) {
      errorHandler.handleError(error as Error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [submitFn, errorHandler]);

  const submitWithRetry = useCallback(async (data: T) => {
    return errorHandler.retry(() => submit(data));
  }, [errorHandler, submit]);

  return {
    isSubmitting,
    isSuccess,
    error: errorHandler.error,
    isRetrying: errorHandler.isRetrying,
    retryCount: errorHandler.retryCount,
    canRetry: errorHandler.canRetry,
    submit,
    submitWithRetry,
    retry: submitWithRetry,
    clearError: errorHandler.clearError,
    reset: errorHandler.reset,
  };
}
