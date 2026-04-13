import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend the expect matchers
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Enhanced Socket.IO mock server for complex scenarios
class MockSocketIOServer {
  private static instance: MockSocketIOServer;
  private clients: Map<string, any> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private onlineUsers: Map<string, any> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();
  public errorMode: boolean = false;
  public connectionDelay: number = 100;
  public shouldReconnect: boolean = true;

  static getInstance() {
    if (!MockSocketIOServer.instance) {
      MockSocketIOServer.instance = new MockSocketIOServer();
    }
    return MockSocketIOServer.instance;
  }

  reset() {
    this.clients.clear();
    this.rooms.clear();
    this.onlineUsers.clear();
    this.typingUsers.clear();
    this.errorMode = false;
    this.connectionDelay = 100;
    this.shouldReconnect = true;
  }

  addClient(clientId: string, socket: any) {
    this.clients.set(clientId, socket);
    
    // Add to online users if we have user info
    if (socket.userEmail) {
      this.onlineUsers.set(socket.userEmail, {
        userEmail: socket.userEmail,
        presence: 'online',
        lastSeen: new Date(),
        currentPage: '/',
        connectionId: clientId
      });
    }
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client && client.userEmail) {
      this.onlineUsers.delete(client.userEmail);
    }
    this.clients.delete(clientId);
  }

  joinRoom(clientId: string, room: string) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)?.add(clientId);
  }

  leaveRoom(clientId: string, room: string) {
    this.rooms.get(room)?.delete(clientId);
    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }
  }

  broadcast(room: string, event: string, data: any) {
    const roomMembers = this.rooms.get(room) || new Set();
    roomMembers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.triggerEvent) {
        client.triggerEvent(event, data);
      }
    });
  }

  emitToClient(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && client.triggerEvent) {
      client.triggerEvent(event, data);
    }
  }

  // Simulate multi-user presence updates
  updateUserPresence(userEmail: string, presence: string, currentPage?: string) {
    const user = this.onlineUsers.get(userEmail);
    if (user) {
      user.presence = presence;
      user.currentPage = currentPage || user.currentPage;
      user.lastSeen = new Date();
      
      // Broadcast to all connected clients
      this.clients.forEach(client => {
        if (client.triggerEvent) {
          client.triggerEvent('realtime:presence_update', user);
        }
      });
    }
  }

  // Simulate typing indicators
  setUserTyping(userEmail: string, channelId: string, isTyping: boolean) {
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Set());
    }
    
    const channelTypingUsers = this.typingUsers.get(channelId)!;
    
    if (isTyping) {
      channelTypingUsers.add(userEmail);
    } else {
      channelTypingUsers.delete(userEmail);
    }
    
    // Broadcast to channel members
    this.broadcast(channelId, isTyping ? 'chat:user_typing' : 'chat:user_stop_typing', {
      userEmail,
      channelId,
      typingUsers: Array.from(channelTypingUsers)
    });
  }

  getOnlineUsers(): any[] {
    return Array.from(this.onlineUsers.values());
  }

  getTypingUsers(channelId: string): string[] {
    return Array.from(this.typingUsers.get(channelId) || new Set());
  }

  setErrorMode(enabled: boolean) {
    this.errorMode = enabled;
  }

  setConnectionDelay(delay: number) {
    this.connectionDelay = delay;
  }

  setShouldReconnect(shouldReconnect: boolean) {
    this.shouldReconnect = shouldReconnect;
  }
}

// Create the mock server instance
const mockServer = MockSocketIOServer.getInstance();

// Mock socket.io-client at module level - CRITICAL for proper hoisting
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn().mockImplementation((url: string, options: any = {}) => {
      const clientId = `client-${Date.now()}-${Math.random()}`;
      const handlers: Map<string, Function[]> = new Map();
      let isConnected = false;
      let isConnecting = false;
      
      // Simulate server-driven behavior based on workspace ID
      const shouldFail = options.query?.workspaceId === 'failing-workspace' || 
                        options.query?.workspaceId === 'invalid-workspace' ||
                        mockServer.errorMode;
      const delay = mockServer.connectionDelay;

      const socket = {
        id: clientId,
        connected: false,
        disconnected: true,
        
        connect: vi.fn(() => {
          if (isConnecting || isConnected) return socket;
          
          isConnecting = true;
          socket.disconnected = false;
          
          setTimeout(() => {
            if (shouldFail) {
              // Simulate connection failure
              isConnecting = false;
              socket.connected = false;
              socket.disconnected = true;
              socket.triggerEvent('connect_error', new Error('Connection failed'));
            } else {
              // Simulate successful connection
              isConnected = true;
              isConnecting = false;
              socket.connected = true;
              socket.disconnected = false;
              mockServer.addClient(clientId, socket);
              socket.triggerEvent('connect');
              
              // Also trigger the 'connected' event with initial data
              setTimeout(() => {
                socket.triggerEvent('connected', { 
                  userEmail: options.query?.userEmail,
                  workspaceId: options.query?.workspaceId,
                  timestamp: Date.now()
                });
              }, 10);
            }
          }, delay);
          
          return socket;
        }),

        disconnect: vi.fn(() => {
          if (!isConnected && !isConnecting) return socket;
          
          isConnected = false;
          isConnecting = false;
          socket.connected = false;
          socket.disconnected = true;
          mockServer.removeClient(clientId);
          socket.triggerEvent('disconnect', 'io client disconnect');
          return socket;
        }),

        emit: vi.fn((event: string, data: any, callback?: Function) => {
          if (!isConnected && event !== 'ping') {
            // Simulate emit failure when not connected
            if (callback) callback({ error: 'Not connected' });
            return socket;
          }

          // Handle specific events with realistic server responses
          switch (event) {
            case 'chat:join_channel':
              mockServer.joinRoom(clientId, data.channelId);
              setTimeout(() => {
                socket.triggerEvent('chat:channel_joined', { 
                  channelId: data.channelId, 
                  userEmail: data.userEmail,
                  timestamp: Date.now()
                });
                if (callback) callback({ success: true });
              }, 10);
              break;
              
            case 'chat:leave_channel':
              mockServer.leaveRoom(clientId, data.channelId);
              setTimeout(() => {
                socket.triggerEvent('chat:channel_left', { 
                  channelId: data.channelId, 
                  userEmail: data.userEmail,
                  timestamp: Date.now()
                });
                if (callback) callback({ success: true });
              }, 10);
              break;
              
            case 'chat:message':
              const messageData = {
                id: `msg-${Date.now()}`,
                content: data.content,
                userEmail: data.userEmail,
                channelId: data.channelId,
                timestamp: Date.now(),
                type: 'message'
              };
              
              // Broadcast to all clients in the channel
              setTimeout(() => {
                mockServer.broadcast(data.channelId, 'chat:message', messageData);
                
                // Send delivery confirmation
                socket.triggerEvent('chat:message_delivered', {
                  messageId: messageData.id,
                  deliveryStatus: 'delivered',
                  timestamp: Date.now()
                });
                
                if (callback) callback({ success: true, messageId: messageData.id });
              }, 10);
              break;
              
            case 'chat:typing':
              setTimeout(() => {
                mockServer.broadcast(data.channelId, 'chat:user_typing', {
                  userEmail: data.userEmail,
                  channelId: data.channelId,
                  timestamp: Date.now()
                });
              }, 10);
              break;
              
            case 'chat:stop_typing':
              setTimeout(() => {
                mockServer.broadcast(data.channelId, 'chat:user_stop_typing', {
                  userEmail: data.userEmail,
                  channelId: data.channelId,
                  timestamp: Date.now()
                });
              }, 10);
              break;
              
            case 'realtime:presence':
              setTimeout(() => {
                mockServer.broadcast('presence', 'realtime:presence_update', {
                  userEmail: data.userEmail,
                  presence: data.presence,
                  currentPage: data.currentPage,
                  lastSeen: new Date(),
                  timestamp: Date.now()
                });
                if (callback) callback({ success: true });
              }, 10);
              break;
              
            case 'realtime:cursor':
              setTimeout(() => {
                mockServer.broadcast(data.resource, 'realtime:cursor_update', {
                  userEmail: data.userEmail,
                  resource: data.resource,
                  x: data.x,
                  y: data.y,
                  timestamp: Date.now()
                });
                if (callback) callback({ success: true });
              }, 10);
              break;
              
            case 'ping':
              // Simulate pong response with latency
              setTimeout(() => {
                socket.triggerEvent('pong', { 
                  timestamp: Date.now(),
                  latency: 50 // Simulate 50ms latency
                });
              }, 20);
              break;
              
            default:
              if (callback) callback({ success: true });
          }
          
          return socket;
        }),

        on: vi.fn((event: string, handler: Function) => {
          if (!handlers.has(event)) {
            handlers.set(event, []);
          }
          handlers.get(event)?.push(handler);
          return socket;
        }),

        off: vi.fn((event: string, handler?: Function) => {
          if (handler) {
            const eventHandlers = handlers.get(event) || [];
            const index = eventHandlers.indexOf(handler);
            if (index > -1) {
              eventHandlers.splice(index, 1);
            }
          } else {
            handlers.delete(event);
          }
          return socket;
        }),

        once: vi.fn((event: string, handler: Function) => {
          const onceHandler = (...args: any[]) => {
            handler(...args);
            socket.off(event, onceHandler);
          };
          socket.on(event, onceHandler);
          return socket;
        }),

        // Helper to trigger events - this is crucial for proper integration
        triggerEvent: (event: string, data?: any) => {
          const eventHandlers = handlers.get(event) || [];
          eventHandlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in ${event} handler:`, error);
            }
          });
        },

        // Helper to simulate connection errors for testing
        simulateConnectionError: (error: any = new Error('Connection failed')) => {
          socket.triggerEvent('connect_error', error);
        },

        // Helper to simulate network issues
        simulateDisconnect: (reason: string = 'transport close') => {
          isConnected = false;
          socket.connected = false;
          socket.disconnected = true;
          socket.triggerEvent('disconnect', reason);
        }
      };

      // Store socket reference for test manipulation
      mockServer.addClient(clientId, socket);

      // Auto-connect if specified (default behavior)
      if (options.autoConnect !== false) {
        setTimeout(() => socket.connect(), 10);
      }

      return socket;
    })
  };
});

// Mock the auth store to provide sessionToken - Direct implementation
vi.mock('@/store/consolidated/auth', () => {
  return {
    useAuthStore: () => ({
      sessionToken: 'mock-session-token-12345',
      isAuthenticated: true,
      user: {
        email: 'test@example.com',
        workspaceId: 'test-workspace'
      },
      currentWorkspaceId: 'test-workspace',
      isLoading: false,
      error: null
    })
  };
});

// Now import logger after the mock is set up  
import { logger } from "../../lib/logger";

// Global test configuration
beforeAll(() => {
  // Mock Audio API for sonification tests
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
      type: 'sine',
      start: vi.fn(),
      stop: vi.fn()
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    })),
    destination: {},
    currentTime: 0,
    close: vi.fn()
  }));

  // Mock window.URL for blob operations
  global.URL = {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  } as any;

  // Mock native WebSocket for fallback scenarios
  const mockWebSocket = vi.fn().mockImplementation(() => {
    const ws = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 1, // OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null
    };

    // Simulate connection opening
    setTimeout(() => {
      if (ws.onopen) ws.onopen(new Event('open'));
    }, 100);

    return ws;
  });

  global.WebSocket = mockWebSocket;

  // Keep console.log for debugging
  // vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Allow console.error for debugging
  const originalError = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    // Only show errors that are not expected test errors
    if (!args[0]?.includes?.('WebSocket') && !args[0]?.includes?.('404')) {
      originalError(...args);
    }
  });
});

beforeEach(() => {
  // Clear all timers before each test
  vi.clearAllTimers();
  vi.clearAllMocks();

  // Reset the mock server state
  MockSocketIOServer.getInstance().reset();

  // Reset DOM
  document.body.innerHTML = '';

  // Reset any global state
  if (typeof window !== 'undefined') {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  }
});

afterEach(() => {
  // Cleanup React components
  cleanup();

  // Clear any remaining timers
  vi.clearAllTimers();

  // Reset mocks
  vi.restoreAllMocks();

  // Reset mock server
  MockSocketIOServer.getInstance().reset();
});

afterAll(() => {
  // Final cleanup
  vi.resetAllMocks();
  vi.clearAllTimers();
  MockSocketIOServer.getInstance().reset();
});

// Suppress specific warnings that are expected in test environment
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' && (
      message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Warning: componentWillReceiveProps has been renamed') ||
      message.includes('act(...) is not supported') ||
      message.includes('WebSocket connection')
    )
  ) {
    return;
  }
  originalWarn(...args);
};

// Add custom test utilities
global.testUtils = {
  // Helper to wait for WebSocket connection
  waitForWebSocketConnection: (timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), timeout);
      // Mock connection success
      setTimeout(() => {
        clearTimeout(timer);
        resolve(true);
      }, 100);
    });
  },

  // Helper to simulate WebSocket events
  simulateWebSocketEvent: (eventType: string, data: any) => {
    // Mock event simulation logic
    return { type: eventType, data, timestamp: Date.now() };
  },

  // Helper to create mock analytics data
  createMockAnalyticsData: (overrides = {}) => ({
    activeUsers: 10,
    tasksCompleted: 25,
    messagesCount: 50,
    timestamp: Date.now(),
    ...overrides
  }),

  // Helper to access the mock server for advanced test scenarios
  getMockServer: () => MockSocketIOServer.getInstance(),

  // Helper to simulate multi-user scenarios
  simulateMultiUserScenario: async (users: Array<{email: string, workspaceId: string}>) => {
    const mockServer = MockSocketIOServer.getInstance();
    const sockets: any[] = [];
    
    // Create connections for all users
    for (const user of users) {
      const { io } = await import('socket.io-client');
      const socket = io('http://localhost:3008', {
        userEmail: user.email,
        workspaceId: user.workspaceId
      });
      sockets.push(socket);
    }
    
    return sockets;
  },

  // Helper to simulate connection errors
  simulateConnectionError: (permanent = false) => {
    const mockServer = MockSocketIOServer.getInstance();
    mockServer.setErrorMode(true);
    mockServer.setShouldReconnect(!permanent);
  },

  // Helper to simulate network latency
  simulateNetworkLatency: (delay: number) => {
    const mockServer = MockSocketIOServer.getInstance();
    mockServer.setConnectionDelay(delay);
  }
};

// Type declarations for test utilities
declare global {
  interface Global {
    testUtils: {
      waitForWebSocketConnection: (timeout?: number) => Promise<boolean>;
      simulateWebSocketEvent: (eventType: string, data: any) => { type: string; data: any; timestamp: number };
      createMockAnalyticsData: (overrides?: any) => any;
      getMockServer: () => MockSocketIOServer;
      simulateMultiUserScenario: (users: Array<{email: string, workspaceId: string}>) => Promise<any[]>;
      simulateConnectionError: (permanent?: boolean) => void;
      simulateNetworkLatency: (delay: number) => void;
    };
  }
}