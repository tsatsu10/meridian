import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebSocketAnalytics } from '../../hooks/useWebSocketAnalytics';

describe('WebSocket Integration - Core Functionality', () => {
  let mockWebSocket: any;
  let mockWebSocketInstance: any;

  beforeEach(() => {
    // Don't use fake timers as they interfere with hook timeouts
    vi.clearAllMocks();

    // Create a comprehensive WebSocket mock
    mockWebSocketInstance = {
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3
    };

    mockWebSocket = vi.fn(() => {
      const instance = { ...mockWebSocketInstance };
      // Simulate connection opening
      setTimeout(() => {
        if (instance.onopen) {
          instance.onopen(new Event('open'));
        }
      }, 10);
      return instance;
    });
    
    // Use Object.defineProperty to properly mock the global WebSocket
    Object.defineProperty(global, 'WebSocket', {
      writable: true,
      value: mockWebSocket,
    });

    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create WebSocket analytics hook with basic functionality', async () => {
    const { result } = renderHook(() => useWebSocketAnalytics({ enabled: true }));

    // In test environment, connection should be immediate
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.error).toBe(null);
    });
  });

  it('should handle simulateMetricsUpdate correctly', async () => {
    const onMetricsUpdate = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketAnalytics({
        enabled: true,
        onMetricsUpdate
      })
    );

    // Wait for connection in test environment
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Test simulate function
    const testData = { metric: 'test', value: 100 };

    act(() => {
      result.current.simulateMetricsUpdate(testData);
    });

    expect(onMetricsUpdate).toHaveBeenCalledWith(testData);
    expect(result.current.lastMessage).toEqual(testData);
    expect(result.current.metricsBuffer).toContain(testData);
  });

  it('should handle disabled state correctly', () => {
    const { result } = renderHook(() => useWebSocketAnalytics({ enabled: false }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionStatus).toBe('disabled');
  });

  it('should provide required interface methods and properties', async () => {
    const { result } = renderHook(() => useWebSocketAnalytics({ enabled: true }));

    // Check all required properties exist
    expect(typeof result.current.isConnected).toBe('boolean');
    expect(typeof result.current.connectionStatus).toBe('string');
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.simulateMetricsUpdate).toBe('function');
    expect(Array.isArray(result.current.metricsBuffer)).toBe(true);
    expect(typeof result.current.performanceMetrics).toBe('object');
  });

  it('should handle sendMessage without errors', async () => {
    const { result } = renderHook(() => useWebSocketAnalytics({ enabled: true }));

    // Wait for connection in test environment
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testMessage = { type: 'test', data: 'hello' };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    // Should not throw error
    expect(result.current.error).toBe(null);
  });
});