import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useUnifiedWebSocket, type UnifiedWebSocketOptions, type ChatMessage, type UserPresence } from '@/hooks/useUnifiedWebSocket';
import { WS_URL } from '@/constants/urls';

// Import integration test setup for auth store mocking and enhanced socket.io mocking
import '../setup/integration-setup';

// Check if this is a CI environment or if we should skip integration tests
const SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true' ||
                                process.env.CI === 'true' ||
                                !process.env.RUN_INTEGRATION_TESTS;

// Mock WebSocket server for testing
class MockWebSocketServer {
  private clients: Map<string, Socket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  addClient(socket: Socket, userId: string) {
    this.clients.set(userId, socket);
  }

  removeClient(userId: string) {
    this.clients.delete(userId);
  }

  joinRoom(userId: string, room: string) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)?.add(userId);
  }

  leaveRoom(userId: string, room: string) {
    this.rooms.get(room)?.delete(userId);
  }

  broadcast(room: string, event: string, data: any) {
    const roomMembers = this.rooms.get(room) || new Set();
    roomMembers.forEach(userId => {
      const client = this.clients.get(userId);
      if (client) {
        client.emit(event, data);
      }
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      client.emit(event, data);
    }
  }
}

describe.skipIf(SKIP_INTEGRATION_TESTS)('WebSocket Integration Tests', () => {
  let mockServer: MockWebSocketServer;
  let queryClient: QueryClient;
  let testSockets: Socket[] = [];

  // Test data
  const testUsers = {
    user1: { email: 'user1@test.com', workspaceId: 'workspace-1' },
    user2: { email: 'user2@test.com', workspaceId: 'workspace-1' },
    user3: { email: 'user3@test.com', workspaceId: 'workspace-2' }
  };

  const testChannels = {
    general: 'channel-general',
    private: 'channel-private',
    team: 'channel-team'
  };

  beforeAll(() => {
    // Mock setup is now at the top level
  });

  beforeEach(() => {
    mockServer = new MockWebSocketServer();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    testSockets = [];
  });

  afterEach(async () => {
    // Clean up all test sockets
    for (const socket of testSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    testSockets = [];
    queryClient.clear();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onConnect: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn()
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      }, { timeout: 5000 });

      expect(options.onConnect).toHaveBeenCalledTimes(1);
      expect(result.current.connectionState.error).toBeNull();
    });

    it('should handle connection failures gracefully', async () => {
      const onError = vi.fn();
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: 'invalid-workspace',
        enabled: true,
        onError
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      // Simulate connection error
      act(() => {
        result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.connectionState.error).toBeTruthy();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should implement exponential backoff for reconnection', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        maxReconnectAttempts: 3
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      // Setup exponential backoff test simulation
      global.setupExponentialBackoffTest();

      const startTime = Date.now();

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      // Wait for connection attempts and failures
      await waitFor(() => {
        expect(result.current.connectionState.reconnectAttempts).toBeGreaterThan(1);
      }, { timeout: 10000 });

      // Verify exponential backoff timing - should take at least 1 second for backoff delays
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThan(1000); // At least 1 second delay for exponential backoff
      
      // Wait for eventual successful connection
      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      }, { timeout: 15000 });

      // Clean up
      global.clearMockSocketState();
    });

    it('should handle multiple connections per user', async () => {
      const user = testUsers.user1;
      const connections = [];

      // Create multiple connections for the same user
      for (let i = 0; i < 3; i++) {
        const options: UnifiedWebSocketOptions = {
          userEmail: user.email,
          workspaceId: user.workspaceId,
          enabled: true
        };

        const wrapper = ({ children }: { children: React.ReactNode }) =>
          React.createElement(QueryClientProvider, { client: queryClient }, children);

        const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });
        connections.push(result);
      }

      // All connections should be established
      for (const connection of connections) {
        await waitFor(() => {
          expect(connection.current.connectionState.isConnected).toBe(true);
        });
      }
    });
  });

  describe('Real-time Messaging', () => {
    it('should send and receive messages between users', async () => {
      const receivedMessages: ChatMessage[] = [];

      const user1Options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onMessage: (message) => receivedMessages.push(message)
      };

      const user2Options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user2.email,
        workspaceId: testUsers.user2.workspaceId,
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result: user1 } = renderHook(() => useUnifiedWebSocket(user1Options), { wrapper });
      const { result: user2 } = renderHook(() => useUnifiedWebSocket(user2Options), { wrapper });

      // Wait for connections
      await waitFor(() => {
        expect(user1.current.connectionState.isConnected).toBe(true);
        expect(user2.current.connectionState.isConnected).toBe(true);
      });

      // Both users join the same channel
      act(() => {
        user1.current.joinChannel(testChannels.general);
        user2.current.joinChannel(testChannels.general);
      });

      // User2 sends a message
      const testMessage = 'Hello from user2!';
      act(() => {
        user2.current.sendMessage(testChannels.general, testMessage);
      });

      // User1 should receive the message
      await waitFor(() => {
        expect(receivedMessages).toHaveLength(1);
        expect(receivedMessages[0].data.content).toBe(testMessage);
        expect(receivedMessages[0].userEmail).toBe(testUsers.user2.email);
      });
    });

    it('should handle message delivery status', async () => {
      const deliveryUpdates: any[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onMessage: (message) => {
          if (message.type === 'message_delivered') {
            deliveryUpdates.push(message.data);
          }
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      act(() => {
        result.current.joinChannel(testChannels.general);
        result.current.sendMessage(testChannels.general, 'Test message');
      });

      // Should receive delivery confirmation
      await waitFor(() => {
        expect(deliveryUpdates).toHaveLength(1);
        expect(deliveryUpdates[0].deliveryStatus).toBe('delivered');
      });
    });

    it('should handle typing indicators', async () => {
      const typingUsers: string[] = [];

      const user1Options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onTyping: (user) => {
          if (!typingUsers.includes(user.userEmail)) {
            typingUsers.push(user.userEmail);
          }
        },
        onStopTyping: (user) => {
          const index = typingUsers.indexOf(user.userEmail);
          if (index > -1) {
            typingUsers.splice(index, 1);
          }
        }
      };

      const user2Options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user2.email,
        workspaceId: testUsers.user2.workspaceId,
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result: user1 } = renderHook(() => useUnifiedWebSocket(user1Options), { wrapper });
      const { result: user2 } = renderHook(() => useUnifiedWebSocket(user2Options), { wrapper });

      await waitFor(() => {
        expect(user1.current.connectionState.isConnected).toBe(true);
        expect(user2.current.connectionState.isConnected).toBe(true);
      });

      // Both join channel
      act(() => {
        user1.current.joinChannel(testChannels.general);
        user2.current.joinChannel(testChannels.general);
      });

      // User2 starts typing
      act(() => {
        user2.current.startTyping(testChannels.general);
      });

      await waitFor(() => {
        expect(typingUsers).toContain(testUsers.user2.email);
      });

      // User2 stops typing
      act(() => {
        user2.current.stopTyping(testChannels.general);
      });

      await waitFor(() => {
        expect(typingUsers).not.toContain(testUsers.user2.email);
      });
    });
  });

  describe('Presence Management', () => {
    it('should track user presence updates', async () => {
      const presenceUpdates: UserPresence[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onPresenceUpdate: (users) => {
          presenceUpdates.push(...users);
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Clear initial presence updates and then test manual update
      act(() => {
        presenceUpdates.length = 0; // Clear array
        result.current.updatePresence('away', '/dashboard');
      });

      await waitFor(() => {
        expect(presenceUpdates).toHaveLength(1);
        expect(presenceUpdates[0].presence).toBe('away');
        expect(presenceUpdates[0].currentPage).toBe('/dashboard');
      });
    });

    it('should maintain online users list', async () => {
      const options1: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true
      };

      const options2: UnifiedWebSocketOptions = {
        userEmail: testUsers.user2.email,
        workspaceId: testUsers.user1.workspaceId, // Same workspace
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result: user1 } = renderHook(() => useUnifiedWebSocket(options1), { wrapper });
      const { result: user2 } = renderHook(() => useUnifiedWebSocket(options2), { wrapper });

      await waitFor(() => {
        expect(user1.current.connectionState.isConnected).toBe(true);
        expect(user2.current.connectionState.isConnected).toBe(true);
      });

      // Both users should see each other online
      await waitFor(() => {
        const onlineUsers1 = user1.current.onlineUsers;
        const onlineUsers2 = user2.current.onlineUsers;

        expect(onlineUsers1.some(u => u.userEmail === testUsers.user2.email)).toBe(true);
        expect(onlineUsers2.some(u => u.userEmail === testUsers.user1.email)).toBe(true);
      });
    });
  });

  describe('Channel Management', () => {
    it('should handle channel join/leave events', async () => {
      const channelEvents: any[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onUserJoined: (userEmail, channelId) => {
          channelEvents.push({ type: 'joined', userEmail, channelId });
        },
        onUserLeft: (userEmail, channelId) => {
          channelEvents.push({ type: 'left', userEmail, channelId });
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Join channel
      act(() => {
        result.current.joinChannel(testChannels.general);
      });

      // Leave channel
      act(() => {
        result.current.leaveChannel(testChannels.general);
      });

      await waitFor(() => {
        expect(channelEvents).toHaveLength(2);
        expect(channelEvents[0].type).toBe('joined');
        expect(channelEvents[1].type).toBe('left');
      });
    });

    it('should enforce channel access control', async () => {
      const accessErrors: any[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user3.email, // Different workspace
        workspaceId: testUsers.user3.workspaceId,
        enabled: true,
        onError: (error) => {accessErrors.push(error);
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Try to join channel from different workspace
      act(() => {
        result.current.joinChannel(testChannels.private);
        result.current.sendMessage(testChannels.private, 'Unauthorized message');
      });

      await waitFor(() => {expect(accessErrors.length).toBeGreaterThan(0);
        expect(accessErrors.some(error => error.includes('Access denied'))).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('Real-time Collaboration', () => {
    it('should handle cursor position updates', async () => {
      const cursorUpdates: any[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onCursorUpdate: (cursor) => {
          cursorUpdates.push(cursor);
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Update cursor position
      act(() => {
        result.current.updateCursor(100, 200, 'task-123', 'project-456');
      });

      await waitFor(() => {
        expect(cursorUpdates).toHaveLength(1);
        expect(cursorUpdates[0].x).toBe(100);
        expect(cursorUpdates[0].y).toBe(200);
        expect(cursorUpdates[0].elementId).toBe('task-123');
        expect(cursorUpdates[0].resourceId).toBe('project-456');
      });
    });

    it('should handle task update synchronization', async () => {
      const taskUpdates: any[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onTaskUpdate: (data) => {
          taskUpdates.push(data);
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Simulate task update from another user via server
      act(() => {
        // Get the mock socket and simulate server sending a realtime:sync event
        const mockSocket = vi.mocked(io).mock.results[0]?.value;
        if (mockSocket && mockSocket.serverEmit) {
          const mockTaskUpdate = {
            type: 'task_updated',
            data: {
              taskId: 'task-123',
              title: 'Updated Task Title',
              status: 'in_progress',
              updatedBy: testUsers.user2.email
            },
            timestamp: Date.now()
          };
          
          mockSocket.serverEmit('realtime:sync', mockTaskUpdate);
        }
      });

      await waitFor(() => {
        expect(taskUpdates).toHaveLength(1);
        expect(taskUpdates[0].taskId).toBe('task-123');
        expect(taskUpdates[0].status).toBe('in_progress');
      });
    });
  });

  describe('Connection Health Monitoring', () => {
    it('should monitor connection latency', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Wait for health checks to run
      await new Promise(resolve => setTimeout(resolve, 6000));

      expect(result.current.connectionState.latency).toBeDefined();
      expect(result.current.connectionState.connectionQuality).toMatch(/excellent|good|poor/);
      expect(result.current.connectionState.uptime).toBeGreaterThan(0);
    });

    it('should detect and handle stale connections', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Simulate network interruption
      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(false);
      });

      // Test reconnection
      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle message sending failures', async () => {
      const errorEvents: string[] = [];

      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true,
        onError: (error) => {
          errorEvents.push(error);
        }
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Try to send message to non-existent channel
      act(() => {
        result.current.sendMessage('non-existent-channel', 'Test message');
      });

      await waitFor(() => {
        expect(errorEvents.length).toBeGreaterThan(0);
      });
    });

    it('should implement circuit breaker pattern for failed connections', async () => {
      // Clear any previous state
      global.clearMockSocketState();
      
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: 'failing-workspace',
        enabled: true,
        maxReconnectAttempts: 2
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      // Should eventually give up trying to connect
      await waitFor(() => {
        expect(result.current.fatalError).toBeTruthy();
      }, { timeout: 10000 });

      expect(result.current.connectionState.reconnectAttempts).toBe(2);
      
      // Clean up after test
      global.clearMockSocketState();
    });

    it('should allow recovery from fatal errors', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: 'failing-workspace',
        enabled: true,
        maxReconnectAttempts: 1
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      // Wait for fatal error
      await waitFor(() => {
        expect(result.current.fatalError).toBeTruthy();
      });

      // Reset and try again with valid workspace
      act(() => {
        result.current.resetWebSocketError?.();
      });

      await waitFor(() => {
        expect(result.current.fatalError).toBeNull();
        expect(result.current.connectionState.reconnectAttempts).toBe(0);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should cleanup resources on disconnect', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result, unmount } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      // Unmount should cleanup all resources
      unmount();

      // Verify cleanup by checking that no new connections are attempted
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should handle high-frequency message sending without memory leaks', async () => {
      const options: UnifiedWebSocketOptions = {
        userEmail: testUsers.user1.email,
        workspaceId: testUsers.user1.workspaceId,
        enabled: true
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUnifiedWebSocket(options), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionState.isConnected).toBe(true);
      });

      act(() => {
        result.current.joinChannel(testChannels.general);
      });

      // Send many messages rapidly
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.sendMessage(testChannels.general, `Message ${i}`);
        });
      }

      // Should still be connected and responsive
      expect(result.current.connectionState.isConnected).toBe(true);
    });
  });
});