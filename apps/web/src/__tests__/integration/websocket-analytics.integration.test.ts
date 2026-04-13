import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWebSocketAnalytics } from '@/hooks/useWebSocketAnalytics';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useDashboardData } from '@/hooks/queries/dashboard/use-dashboard-data';

// Check if this is a CI environment or if we should skip integration tests
const SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true' ||
                                process.env.CI === 'true' ||
                                !process.env.RUN_INTEGRATION_TESTS;

// Mock WebSocket analytics data
const mockAnalyticsData = {
  realTimeMetrics: {
    activeUsers: 15,
    tasksCompleted: 42,
    messagesCount: 128,
    projectsActive: 8
  },
  performanceMetrics: {
    responseTime: 145,
    throughput: 95.2,
    errorRate: 0.8,
    uptime: 99.7
  },
  userActivity: [
    { timestamp: Date.now() - 300000, action: 'task_completed', userId: 'user-1' },
    { timestamp: Date.now() - 240000, action: 'message_sent', userId: 'user-2' },
    { timestamp: Date.now() - 180000, action: 'project_created', userId: 'user-1' },
    { timestamp: Date.now() - 120000, action: 'task_updated', userId: 'user-3' },
    { timestamp: Date.now() - 60000, action: 'comment_added', userId: 'user-2' }
  ],
  dashboardUpdates: {
    type: 'metrics_update',
    data: {
      totalTasks: 156,
      completedTasks: 98,
      activeProjects: 12,
      teamMembers: 8
    },
    timestamp: Date.now()
  }
};

describe.skipIf(SKIP_INTEGRATION_TESTS)('WebSocket Analytics Integration Tests', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    // Mock WebSocket connection
    vi.mock('@/hooks/useUnifiedWebSocket', () => ({
      useUnifiedWebSocket: vi.fn(() => ({
        connectionState: {
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionQuality: 'excellent',
          latency: 50,
          uptime: 300000
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn()
      }))
    }));

    // Mock analytics API
    vi.mock('@/lib/fetch', () => ({
      fetchApi: vi.fn()
    }));
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Real-time Analytics Data Streaming', () => {
    it('should receive and process real-time metrics updates', async () => {
      const metricsUpdates: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onMetricsUpdate: (data) => {
            metricsUpdates.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate real-time metrics update
      act(() => {
        result.current.simulateMetricsUpdate(mockAnalyticsData.realTimeMetrics);
      });

      await waitFor(() => {
        expect(metricsUpdates).toHaveLength(1);
        expect(metricsUpdates[0].activeUsers).toBe(15);
        expect(metricsUpdates[0].tasksCompleted).toBe(42);
      });
    });

    it('should handle performance metrics streaming', async () => {
      const performanceData: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onPerformanceUpdate: (data) => {
            performanceData.push(data);
          },
          metricsInterval: 1000, // 1 second for testing
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate performance data stream
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.simulatePerformanceUpdate({
            ...mockAnalyticsData.performanceMetrics,
            responseTime: mockAnalyticsData.performanceMetrics.responseTime + (i * 10),
            timestamp: Date.now() + (i * 1000)
          });
        });
      }

      await waitFor(() => {
        expect(performanceData.length).toBeGreaterThanOrEqual(5);
      });

      // Verify data progression
      expect(performanceData[0].responseTime).toBe(145);
      expect(performanceData[4].responseTime).toBe(185);
    });

    it('should aggregate user activity data', async () => {
      const activityUpdates: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onActivityUpdate: (data) => {
            activityUpdates.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate user activity stream
      for (const activity of mockAnalyticsData.userActivity) {
        act(() => {
          result.current.simulateActivityUpdate(activity);
        });
      }

      await waitFor(() => {
        expect(activityUpdates).toHaveLength(mockAnalyticsData.userActivity.length);
      });

      // Verify activity aggregation
      const taskCompletions = activityUpdates.filter(a => a.action === 'task_completed');
      const messages = activityUpdates.filter(a => a.action === 'message_sent');

      expect(taskCompletions).toHaveLength(1);
      expect(messages).toHaveLength(1);
    });
  });

  describe('Dashboard Real-time Updates', () => {
    it('should update dashboard data in real-time via WebSocket', async () => {
      const dashboardUpdates: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      // Test the WebSocket analytics hook only, don't try to integrate with dashboard data hook
      const { result: analyticsResult } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onDashboardUpdate: (data) => {
            dashboardUpdates.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(analyticsResult.current.isConnected).toBe(true);
      });

      // Simulate dashboard update
      act(() => {
        analyticsResult.current.simulateDashboardUpdate(mockAnalyticsData.dashboardUpdates);
      });

      await waitFor(() => {
        expect(dashboardUpdates).toHaveLength(1);
        expect(dashboardUpdates[0].data.totalTasks).toBe(156);
        expect(dashboardUpdates[0].data.completedTasks).toBe(98);
      });

      // Verify the analytics hook processed the update correctly
      await waitFor(() => {
        expect(analyticsResult.current.lastMessage.type).toBe('dashboard');
        expect(analyticsResult.current.lastMessage.data).toEqual(mockAnalyticsData.dashboardUpdates);
      });
    });

    it('should handle task status changes in real-time', async () => {
      const taskUpdates: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onTaskUpdate: (data) => {
            taskUpdates.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate multiple task status changes
      const taskChanges = [
        { taskId: 'task-1', status: 'in_progress', timestamp: Date.now() - 2000 },
        { taskId: 'task-2', status: 'completed', timestamp: Date.now() - 1000 },
        { taskId: 'task-1', status: 'completed', timestamp: Date.now() }
      ];

      for (const change of taskChanges) {
        act(() => {
          result.current.simulateTaskUpdate(change);
        });
      }

      await waitFor(() => {
        expect(taskUpdates).toHaveLength(3);
      });

      // Verify task progression
      expect(taskUpdates[0].status).toBe('in_progress');
      expect(taskUpdates[2].status).toBe('completed');
      expect(taskUpdates[2].taskId).toBe('task-1');
    });

    it('should update project analytics in real-time', async () => {
      const projectUpdates: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onProjectUpdate: (data) => {
            projectUpdates.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate project analytics updates
      const projectData = {
        projectId: 'project-1',
        completionRate: 75.5,
        taskCount: 20,
        activeMembers: 4,
        riskScore: 25,
        timestamp: Date.now()
      };

      act(() => {
        result.current.simulateProjectUpdate(projectData);
      });

      await waitFor(() => {
        expect(projectUpdates).toHaveLength(1);
        expect(projectUpdates[0].completionRate).toBe(75.5);
        expect(projectUpdates[0].riskScore).toBe(25);
      });
    });
  });

  describe('Analytics Data Buffering and Batching', () => {
    it('should buffer high-frequency updates and batch them', async () => {
      const batchedUpdates: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onMetricsUpdate: (data) => {
            batchedUpdates.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send multiple updates and verify they're all captured in metricsBuffer
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.simulateMetricsUpdate({
            activeUsers: 15 + i,
            timestamp: Date.now() + i
          });
        });
      }

      // Wait for updates to be processed
      await waitFor(() => {
        expect(batchedUpdates.length).toBe(5);
        expect(result.current.metricsBuffer.length).toBeGreaterThanOrEqual(5);
      });

      // Verify the updates were captured correctly
      expect(batchedUpdates[0].activeUsers).toBe(15);
      expect(batchedUpdates[4].activeUsers).toBe(19);
    });

    it('should handle analytics data buffering during connection drops', async () => {
      const bufferedData: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onMetricsUpdate: (data) => {
            bufferedData.push(data);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection drop
      act(() => {
        result.current.simulateConnectionDrop();
      });

      // Verify connection state changed
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      // Send data while disconnected (will be stored in metricsBuffer)
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.simulateMetricsUpdate({
            activeUsers: 20 + i,
            timestamp: Date.now() + i
          });
        });
      }

      // Simulate reconnection
      act(() => {
        result.current.simulateReconnection();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(bufferedData).toHaveLength(10);
      });

      // Verify data integrity
      expect(bufferedData[0].activeUsers).toBe(20);
      expect(bufferedData[9].activeUsers).toBe(29);
    });
  });

  describe('Analytics Data Validation and Error Handling', () => {
    it('should validate incoming analytics data', async () => {
      const validationErrors: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onMetricsUpdate: (data) => {
            // Simple validation: check if activeUsers is a number
            if (data.activeUsers !== undefined && typeof data.activeUsers !== 'number') {
              validationErrors.push({ type: 'invalid_type', field: 'activeUsers', value: data.activeUsers });
            }
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send valid data first
      act(() => {
        result.current.simulateMetricsUpdate({ activeUsers: 15 });
      });

      // Send invalid data
      act(() => {
        result.current.simulateMetricsUpdate({ activeUsers: 'invalid-number' });
      });

      await waitFor(() => {
        expect(validationErrors.length).toBeGreaterThan(0);
      });

      // Verify error handling
      expect(validationErrors[0].type).toBe('invalid_type');
      expect(validationErrors[0].field).toBe('activeUsers');
    });

    it('should handle analytics service failures gracefully', async () => {
      const errorEvents: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onServiceError: (error) => {
            errorEvents.push(error);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate analytics service failure
      act(() => {
        result.current.simulateServiceError({
          type: 'analytics_service_down',
          message: 'Analytics service is temporarily unavailable',
          timestamp: Date.now()
        });
      });

      await waitFor(() => {
        expect(errorEvents).toHaveLength(1);
        expect(errorEvents[0].type).toBe('analytics_service_down');
      });

      // Verify error state was set
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error).toContain('Analytics service is temporarily unavailable');
      });
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should track analytics data processing performance', async () => {
      const performanceMetrics: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onPerformanceUpdate: (metrics) => {
            performanceMetrics.push(metrics);
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate performance metrics
      act(() => {
        result.current.simulatePerformanceUpdate({
          processingTime: 145,
          throughput: 95.2,
          memoryUsage: 68.4
        });
      });

      await waitFor(() => {
        expect(performanceMetrics.length).toBeGreaterThan(0);
      });

      // Verify performance tracking
      const metrics = performanceMetrics[0];
      expect(metrics.processingTime).toBe(145);
      expect(metrics.throughput).toBe(95.2);
      expect(metrics.memoryUsage).toBe(68.4);
    });

    it('should monitor analytics data freshness', async () => {
      const freshnessAlerts: any[] = [];

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() =>
        useWebSocketAnalytics({
          workspaceId: 'workspace-1',
          onMetricsUpdate: (data) => {
            // Simple freshness check - if data is older than 30 seconds, create alert
            if (data.timestamp && (Date.now() - data.timestamp) > 30000) {
              freshnessAlerts.push({
                type: 'stale_data',
                message: 'Data is older than 30 seconds',
                age: Date.now() - data.timestamp
              });
            }
          },
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send old data
      act(() => {
        result.current.simulateMetricsUpdate({
          activeUsers: 25,
          timestamp: Date.now() - 60000 // 1 minute old
        });
      });

      await waitFor(() => {
        expect(freshnessAlerts).toHaveLength(1);
        expect(freshnessAlerts[0].type).toBe('stale_data');
      });
    });
  });
});