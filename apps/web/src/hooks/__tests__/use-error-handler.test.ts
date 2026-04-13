import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useErrorHandler, useApiCall, useAsyncOperation, useFormSubmission } from '@/hooks/use-error-handler';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.hasRetried).toBe(false);
    expect(result.current.canRetry).toBe(true);
  });

  it('handles errors correctly', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));

    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('retries operation successfully', async () => {
    const onRetry = vi.fn();
    const { result } = renderHook(() => useErrorHandler({ onRetry }));

    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('Success');

    let retryPromise: Promise<any>;

    act(() => {
      retryPromise = result.current.retry(mockOperation);
    });

    expect(result.current.isRetrying).toBe(true);

    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await retryPromise!;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.hasRetried).toBe(true);
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it('exhausts retries after max attempts', async () => {
    const { result } = renderHook(() => useErrorHandler({ maxRetries: 2 }));

    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

    let retryPromise: Promise<any>;

    act(() => {
      retryPromise = result.current.retry(mockOperation);
    });

    // Fast-forward through all retries
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    await act(async () => {
      try {
        await retryPromise!;
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.retryCount).toBe(2);
    expect(result.current.canRetry).toBe(false);
    expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('clears error state', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.hasRetried).toBe(false);
  });
});

describe('useApiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes API call successfully', async () => {
    const mockApiCall = vi.fn().mockResolvedValue('API response');
    const { result } = renderHook(() => useApiCall(mockApiCall));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();

    let executePromise: Promise<any>;

    act(() => {
      executePromise = result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await executePromise!;
    });

    expect(result.current.data).toBe('API response');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles API call errors', async () => {
    const mockApiCall = vi.fn().mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useApiCall(mockApiCall));

    let executePromise: Promise<any>;

    act(() => {
      executePromise = result.current.execute();
    });

    await act(async () => {
      try {
        await executePromise!;
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('retries API call on failure', async () => {
    const mockApiCall = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('Success');

    const { result } = renderHook(() => useApiCall(mockApiCall));

    let retryPromise: Promise<any>;

    act(() => {
      retryPromise = result.current.retry();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await retryPromise!;
    });

    expect(result.current.data).toBe('Success');
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });
});

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes async operation with parameters', async () => {
    const mockOperation = vi.fn().mockResolvedValue('Operation result');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    let executePromise: Promise<any>;

    act(() => {
      executePromise = result.current.execute('param1', 'param2');
    });

    await act(async () => {
      await executePromise!;
    });

    expect(mockOperation).toHaveBeenCalledWith('param1', 'param2');
    expect(result.current.data).toBe('Operation result');
  });

  it('handles operation errors', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Operation error'));
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    let executePromise: Promise<any>;

    act(() => {
      executePromise = result.current.execute();
    });

    await act(async () => {
      try {
        await executePromise!;
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useFormSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits form successfully', async () => {
    const mockSubmitFn = vi.fn().mockResolvedValue('Submit result');
    const { result } = renderHook(() => useFormSubmission(mockSubmitFn));

    const formData = { name: 'John', email: 'john@example.com' };

    let submitPromise: Promise<any>;

    act(() => {
      submitPromise = result.current.submit(formData);
    });

    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.isSuccess).toBe(false);

    await act(async () => {
      await submitPromise!;
    });

    expect(mockSubmitFn).toHaveBeenCalledWith(formData);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles form submission errors', async () => {
    const mockSubmitFn = vi.fn().mockRejectedValue(new Error('Submit error'));
    const { result } = renderHook(() => useFormSubmission(mockSubmitFn));

    const formData = { name: 'John' };

    let submitPromise: Promise<any>;

    act(() => {
      submitPromise = result.current.submit(formData);
    });

    await act(async () => {
      try {
        await submitPromise!;
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('retries form submission on failure', async () => {
    const mockSubmitFn = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('Success');

    const { result } = renderHook(() => useFormSubmission(mockSubmitFn));

    const formData = { name: 'John' };

    let retryPromise: Promise<any>;

    act(() => {
      retryPromise = result.current.retry(formData);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await retryPromise!;
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockSubmitFn).toHaveBeenCalledTimes(2);
  });
});
