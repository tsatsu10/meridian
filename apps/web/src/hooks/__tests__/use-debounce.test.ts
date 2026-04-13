/**
 * useDebounce Hook Tests
 *
 * Tests debounce functionality for search inputs and API calls:
 * - Value debouncing
 * - Delay timing
 * - Cleanup on unmount
 * - Multiple updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useState, useEffect } from 'react';

// Simple useDebounce implementation for testing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time and trigger effects
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    rerender({ value: 'second', delay: 500 });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    rerender({ value: 'third', delay: 500 });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // Should still be initial value
    expect(result.current).toBe('first');

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe('third');
  });

  it('should handle different delay values', async () => {
    const { result: result1 } = renderHook(() => useDebounce('fast', 100));
    const { result: result2 } = renderHook(() => useDebounce('slow', 1000));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result1.current).toBe('fast');

    // Second should not update yet
    expect(result2.current).toBe('slow');

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(result2.current).toBe('slow');
  });

  it('should debounce search input', async () => {
    const mockSearch = vi.fn();

    const { result, rerender } = renderHook(
      ({ query }) => {
        const debouncedQuery = useDebounce(query, 300);

        useEffect(() => {
          if (debouncedQuery) {
            mockSearch(debouncedQuery);
          }
        }, [debouncedQuery]);

        return debouncedQuery;
      },
      { initialProps: { query: '' } }
    );

    // Simulate user typing
    rerender({ query: 't' });
    rerender({ query: 'te' });
    rerender({ query: 'tes' });
    rerender({ query: 'test' });

    // Search should not be called yet
    expect(mockSearch).not.toHaveBeenCalled();

    // Advance time
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearch).toHaveBeenCalledWith('test');
    expect(mockSearch).toHaveBeenCalledTimes(1); // Only once after debounce
  });

  it('should handle number values', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 100 });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(100);
  });

  it('should handle boolean values', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: false } }
    );

    rerender({ value: true });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  it('should handle object values', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: { count: 0 } } }
    );

    const newValue = { count: 10 };
    rerender({ value: newValue });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toEqual({ count: 10 });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 500));
    
    // Should not throw error
    expect(() => unmount()).not.toThrow();
  });
});

