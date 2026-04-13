import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePerformanceMonitoring, useComponentPerformance, useApiPerformance } from '@/hooks/use-performance-monitoring';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => []),
  navigation: {},
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock PerformanceObserver
const mockObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
};

const MockPerformanceObserver = vi.fn(() => mockObserver);
Object.defineProperty(window, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true,
});

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  it('initializes with empty metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring({
      enableCustomMetrics: false,
    }));

    expect(result.current.metrics).toEqual({});
  });

  it('records custom metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    act(() => {
      result.current.recordMetric('customMetric', 100);
    });

    expect(result.current.metrics.customMetric).toBe(100);
  });

  it('measures async operations', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    const mockOperation = vi.fn().mockResolvedValue('result');
    mockPerformance.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1500);

    const operationResult = await act(async () => {
      return result.current.measureAsync(mockOperation, 'asyncMetric');
    });

    expect(operationResult).toBe('result');
    expect(result.current.metrics.asyncMetric).toBe(500);
  });

  it('measures render performance', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    const mockRenderFn = vi.fn();
    mockPerformance.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1200);

    act(() => {
      result.current.measureRender(mockRenderFn, 'renderMetric');
    });

    expect(mockRenderFn).toHaveBeenCalled();
    expect(result.current.metrics.renderMetric).toBe(200);
  });

  it('calculates performance score correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitoring({
      enableCustomMetrics: false,
    }));

    act(() => {
      result.current.recordMetric('lcp', 1500); // Excellent LCP
      result.current.recordMetric('fid', 50); // Good FID
      result.current.recordMetric('cls', 0.01); // Very good CLS
    });

    const score = result.current.getPerformanceScore();
    expect(score).toBe(100);
  });

  it('calculates performance score with poor metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    act(() => {
      result.current.recordMetric('lcp', 5000); // Poor LCP
      result.current.recordMetric('fid', 400); // Poor FID
      result.current.recordMetric('cls', 0.3); // Poor CLS
    });

    const score = result.current.getPerformanceScore();
    expect(score).toBe(10); // 100 - 30 - 30 - 30
  });

  it('sends metrics to analytics', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    act(() => {
      result.current.recordMetric('testMetric', 100);
    });

    await act(async () => {
      await result.current.sendMetricsToAnalytics({ customData: 'test' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('testMetric'),
    });
  });

  it('handles analytics send failure gracefully', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.sendMetricsToAnalytics();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to send performance metrics:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('useComponentPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  it('measures component render time', () => {
    const { result } = renderHook(() => useComponentPerformance('TestComponent'));

    const mockRenderFn = vi.fn();
    mockPerformance.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1200);

    act(() => {
      result.current.measureComponentRender(mockRenderFn);
    });

    expect(mockRenderFn).toHaveBeenCalled();
  });

  it('measures component mount time', () => {
    const { result } = renderHook(() => useComponentPerformance('TestComponent'));

    expect(result.current.measureComponentMount).toBeDefined();
  });
});

describe('useApiPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  it('measures API call performance', async () => {
    const { result } = renderHook(() => useApiPerformance());

    const mockApiCall = vi.fn().mockResolvedValue('api result');
    mockPerformance.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1500);

    const apiResult = await act(async () => {
      return result.current.measureApiCall(mockApiCall, '/api/test');
    });

    expect(apiResult).toBe('api result');
  });

  it('records API errors', () => {
    const { result } = renderHook(() => useApiPerformance());

    act(() => {
      result.current.recordApiError('/api/test', new Error('API error'));
    });

    // The error recording should not throw
    expect(true).toBe(true);
  });
});
