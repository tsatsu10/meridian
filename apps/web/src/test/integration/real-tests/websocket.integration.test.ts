/**
 * Real WebSocket Integration Tests
 * Tests actual WebSocket connections to the running server
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { waitForServer, shouldSkipIntegrationTests, createTestUser, getTestConfig } from '../setup/test-server';

const SKIP_TESTS = shouldSkipIntegrationTests();

describe.skipIf(SKIP_TESTS)('WebSocket Integration Tests (Real Server)', () => {
  const config = getTestConfig();
  let socket: Socket;
  let authToken: string;
  let userEmail: string;
  let workspaceId: string = 'test-workspace-1';

  beforeAll(async () => {
    // Ensure server is running
    await waitForServer();

    // Create test user
    const timestamp = Date.now();
    userEmail = `ws-test-${timestamp}@example.com`;
    const result = await createTestUser(userEmail, 'TestPassword123!');
    authToken = result.token;
  });

  afterEach(() => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect to WebSocket server successfully', (done) => {
      socket = io(config.wsUrl, {
        query: {
          userEmail,
          workspaceId,
        },
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        expect(socket.id).toBeDefined();
        done();
      });

      socket.on('connect_error', (error) => {
        done(error);
      });
    }, 10000);

    it('should reject connection without valid credentials', (done) => {
      socket = io(config.wsUrl, {
        query: {
          userEmail: 'invalid@example.com',
          workspaceId,
        },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        done(new Error('Should not connect without valid credentials'));
      });

      socket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!socket.connected) {
          done();
        }
      }, 5000);
    }, 10000);
  });

  describe('Messaging', () => {
    beforeAll((done) => {
      socket = io(config.wsUrl, {
        query: {
          userEmail,
          workspaceId,
        },
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        done();
      });

      socket.on('connect_error', done);
    }, 10000);

    it('should send and receive chat messages', (done) => {
      const channelId = 'test-channel-1';
      const message = {
        content: 'Hello from integration test!',
        channelId,
        timestamp: new Date().toISOString(),
      };

      // Listen for message echo
      socket.on('message:new', (receivedMessage) => {
        expect(receivedMessage).toBeDefined();
        expect(receivedMessage.content).toBe(message.content);
        done();
      });

      // Join channel first
      socket.emit('channel:join', { channelId }, (response: any) => {
        expect(response.success).toBe(true);

        // Send message
        socket.emit('message:send', message, (response: any) => {
          expect(response.success).toBe(true);
        });
      });
    }, 10000);

    it('should broadcast typing indicators', (done) => {
      const channelId = 'test-channel-1';

      socket.on('user:typing', (data) => {
        expect(data.userEmail).toBe(userEmail);
        expect(data.channelId).toBe(channelId);
        expect(data.isTyping).toBe(true);
        done();
      });

      socket.emit('typing:start', { channelId });
    }, 10000);
  });

  describe('Presence', () => {
    beforeAll((done) => {
      socket = io(config.wsUrl, {
        query: {
          userEmail,
          workspaceId,
        },
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect', done);
      socket.on('connect_error', done);
    }, 10000);

    it('should track user presence', (done) => {
      socket.emit('presence:update', {
        status: 'online',
        workspaceId,
      }, (response: any) => {
        expect(response.success).toBe(true);
        done();
      });
    }, 10000);

    it('should receive presence updates from other users', (done) => {
      socket.on('presence:changed', (data) => {
        expect(data).toBeDefined();
        expect(data).toHaveProperty('userEmail');
        expect(data).toHaveProperty('status');
        done();
      });

      // Trigger a presence update
      socket.emit('presence:update', {
        status: 'away',
        workspaceId,
      });
    }, 10000);
  });

  describe('Channels', () => {
    beforeAll((done) => {
      socket = io(config.wsUrl, {
        query: {
          userEmail,
          workspaceId,
        },
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect', done);
      socket.on('connect_error', done);
    }, 10000);

    it('should join a channel', (done) => {
      const channelId = `test-channel-${Date.now()}`;

      socket.emit('channel:join', { channelId }, (response: any) => {
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        done();
      });
    }, 10000);

    it('should leave a channel', (done) => {
      const channelId = `test-channel-${Date.now()}`;

      socket.emit('channel:join', { channelId }, () => {
        socket.emit('channel:leave', { channelId }, (response: any) => {
          expect(response).toBeDefined();
          expect(response.success).toBe(true);
          done();
        });
      });
    }, 10000);
  });

  describe('Reconnection', () => {
    it('should automatically reconnect after disconnect', (done) => {
      socket = io(config.wsUrl, {
        query: {
          userEmail,
          workspaceId,
        },
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
      });

      let connectedOnce = false;

      socket.on('connect', () => {
        if (!connectedOnce) {
          connectedOnce = true;
          // Disconnect to test reconnection
          socket.disconnect();
        } else {
          // Successfully reconnected
          expect(socket.connected).toBe(true);
          done();
        }
      });

      socket.on('connect_error', done);
    }, 15000);
  });
});
