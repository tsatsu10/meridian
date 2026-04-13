import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import debounce from '../debounce';

describe('debounce utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 500);

    debouncedFunc();

    expect(func).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls when called multiple times', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 500);

    debouncedFunc();
    vi.advanceTimersByTime(200);

    debouncedFunc();
    vi.advanceTimersByTime(200);

    debouncedFunc();
    vi.advanceTimersByTime(500);

    // Should only be called once (last call)
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the debounced function', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 500);

    debouncedFunc('arg1', 'arg2', 123);

    vi.advanceTimersByTime(500);

    expect(func).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should handle multiple argument types', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 500);

    const obj = { key: 'value' };
    const arr = [1, 2, 3];

    debouncedFunc(obj, arr, true, null);

    vi.advanceTimersByTime(500);

    expect(func).toHaveBeenCalledWith(obj, arr, true, null);
  });

  it('should work with different delay times', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc();

    vi.advanceTimersByTime(999);
    expect(func).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid successive calls correctly', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 300);

    // Call 10 times rapidly
    for (let i = 0; i < 10; i++) {
      debouncedFunc(i);
      vi.advanceTimersByTime(50);
    }

    // Wait for final debounce
    vi.advanceTimersByTime(300);

    // Should only be called once with last argument
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith(9);
  });

  it('should work with synchronous functions', () => {
    const func = vi.fn(() => 'result');
    const debouncedFunc = debounce(func, 500);

    debouncedFunc();
    vi.advanceTimersByTime(500);

    expect(func).toHaveBeenCalled();
  });

  it('should work with async functions', async () => {
    const func = vi.fn(async () => 'async result');
    const debouncedFunc = debounce(func, 500);

    debouncedFunc();
    vi.advanceTimersByTime(500);

    expect(func).toHaveBeenCalled();
  });

  it('should handle zero delay', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 0);

    debouncedFunc();

    vi.advanceTimersByTime(0);

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should maintain separate timers for different debounced functions', () => {
    const func1 = vi.fn();
    const func2 = vi.fn();
    const debouncedFunc1 = debounce(func1, 300);
    const debouncedFunc2 = debounce(func2, 500);

    debouncedFunc1();
    debouncedFunc2();

    vi.advanceTimersByTime(300);
    expect(func1).toHaveBeenCalledTimes(1);
    expect(func2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(func2).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout when called again before delay expires', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc('first');
    vi.advanceTimersByTime(500);

    debouncedFunc('second');
    vi.advanceTimersByTime(500);

    // First call should be cancelled, function not called yet
    expect(func).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    // Only second call should execute
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('second');
  });

  it('should handle functions that throw errors', () => {
    const func = vi.fn(() => {
      throw new Error('Test error');
    });
    const debouncedFunc = debounce(func, 500);

    debouncedFunc();

    expect(() => {
      vi.advanceTimersByTime(500);
    }).toThrow('Test error');
  });
});
