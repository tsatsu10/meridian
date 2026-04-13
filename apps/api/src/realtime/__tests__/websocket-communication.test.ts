/**
 * WebSocket Communication Tests
 * 
 * Tests the unified WebSocket server for:
 * - Connection management
 * - Chat messaging
 * - Typing indicators
 * - Presence tracking
 * - Direct messaging
 * - Channel subscriptions
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { UnifiedWebSocketServer } from '../unified-websocket-server';

describe('WebSocket Communication', () => {
  let httpServer: any;
  let wsServer: UnifiedWebSocketServer;
  let clientSocket: Socket;
  let port: number;

  beforeEach((done) => {
    // Create HTTP server
    httpServer = createServer();
    
    // Initialize WebSocket server
    wsServer = new UnifiedWebSocketServer(httpServer);

    // Start server on random port
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    httpServer.close();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', (done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', (data) => {
        expect(data).toBeDefined();
        expect(data.connectionId).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should reject connection without userEmail', (done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('error', (error) => {
        expect(error.code).toBe('MISSING_PARAMS');
        done();
      });

      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
    });

    it('should reject connection without workspaceId', (done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
        },
      });

      clientSocket.on('error', (error) => {
        expect(error.code).toBe('MISSING_PARAMS');
        done();
      });
    });

    it('should handle disconnection gracefully', (done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.disconnect();
        
        setTimeout(() => {
          expect(clientSocket.connected).toBe(false);
          done();
        }, 100);
      });
    });

    it('should handle ping/pong heartbeat', (done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('ping');
        
        clientSocket.once('pong', (data) => {
          expect(data).toBeDefined();
          expect(data.timestamp).toBeDefined();
          done();
        });
      });
    });
  });

  describe('Chat Messaging', () => {
    beforeEach((done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => done());
    });

    it('should send chat message', (done) => {
      const messageData = {
        channelId: 'test-channel',
        content: 'Hello, World!',
        messageType: 'text',
      };

      clientSocket.emit('chat:message', messageData);

      clientSocket.once('chat:message_delivered', (response) => {
        expect(response).toBeDefined();
        expect(response.messageId).toBeDefined();
        done();
      });
    });

    it('should reject empty message', (done) => {
      const messageData = {
        channelId: 'test-channel',
        content: '',
        messageType: 'text',
      };

      clientSocket.emit('chat:message', messageData);

      clientSocket.once('error', (error) => {
        expect(error.error).toContain('Missing required message data');
        done();
      });
    });

    it('should broadcast message to channel members', (done) => {
      const client2 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'user2@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      client2.on('connected', () => {
        // Join same channel
        clientSocket.emit('chat:join_channel', { channelId: 'broadcast-test' });
        client2.emit('chat:join_channel', { channelId: 'broadcast-test' });

        // Send message from client1
        clientSocket.emit('chat:message', {
          channelId: 'broadcast-test',
          content: 'Broadcast test',
        });

        // client2 should receive the message
        client2.once('message', (data) => {
          expect(data.data.message.content).toBe('Broadcast test');
          client2.disconnect();
          done();
        });
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach((done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => done());
    });

    it('should broadcast typing indicator', (done) => {
      const client2 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'user2@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      client2.on('connected', () => {
        // Join same channel
        const channelId = 'typing-test-channel';
        clientSocket.emit('chat:join_channel', { channelId });
        client2.emit('chat:join_channel', { channelId });

        // Start typing
        clientSocket.emit('chat:typing', { channelId });

        // client2 should receive typing indicator
        client2.once('typing', (data) => {
          expect(data.data.userEmail).toBe('test@example.com');
          client2.disconnect();
          done();
        });
      });
    });

    it('should broadcast stop typing', (done) => {
      const client2 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'user2@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      client2.on('connected', () => {
        const channelId = 'stop-typing-test';
        clientSocket.emit('chat:join_channel', { channelId });
        client2.emit('chat:join_channel', { channelId });

        // Stop typing
        clientSocket.emit('chat:stop_typing', { channelId });

        client2.once('stop_typing', (data) => {
          expect(data.data.userEmail).toBe('test@example.com');
          client2.disconnect();
          done();
        });
      });
    });

    it('should auto-stop typing after timeout', (done) => {
      const channelId = 'auto-stop-typing';
      clientSocket.emit('chat:join_channel', { channelId });
      clientSocket.emit('chat:typing', { channelId });

      // Wait for auto-timeout (3 seconds)
      setTimeout(() => {
        clientSocket.once('stop_typing', (data) => {
          expect(data.data.userEmail).toBe('test@example.com');
          done();
        });
      }, 3100);
    }, 5000); // Increase timeout for this test
  });

  describe('Presence Tracking', () => {
    beforeEach((done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => done());
    });

    it('should update presence status', (done) => {
      clientSocket.emit('realtime:presence', {
        presence: 'away',
      });

      clientSocket.once('presence_updated', (data) => {
        expect(data.presence).toBe('away');
        done();
      });
    });

    it('should broadcast presence to workspace', (done) => {
      const client2 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'user2@example.com',
          workspaceId: 'test-workspace-id', // Same workspace
        },
      });

      client2.on('connected', () => {
        clientSocket.emit('realtime:presence', { presence: 'busy' });

        client2.once('presence', (data) => {
          expect(data.data.userEmail).toBe('test@example.com');
          expect(data.data.presence).toBe('busy');
          client2.disconnect();
          done();
        });
      });
    });
  });

  describe('Direct Messaging', () => {
    let client1: Socket, client2: Socket;

    beforeEach((done) => {
      client1 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'user1@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      client2 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'user2@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      Promise.all([
        new Promise(resolve => client1.on('connected', resolve)),
        new Promise(resolve => client2.on('connected', resolve)),
      ]).then(() => done());
    });

    afterEach(() => {
      client1?.disconnect();
      client2?.disconnect();
    });

    it('should send direct message', (done) => {
      const conversationId = 'dm-test-123';

      client1.emit('dm:message', {
        conversationId,
        recipientEmail: 'user2@example.com',
        content: 'Direct message test',
      });

      client2.once('dm:message', (data) => {
        expect(data.data.content).toBe('Direct message test');
        expect(data.data.senderEmail).toBe('user1@example.com');
        done();
      });
    });

    it('should handle DM typing indicators', (done) => {
      const conversationId = 'dm-typing-test';

      client1.emit('dm:typing', {
        conversationId,
        recipientEmail: 'user2@example.com',
      });

      client2.once('dm:typing', (data) => {
        expect(data.data.senderEmail).toBe('user1@example.com');
        done();
      });
    });
  });

  describe('Channel Operations', () => {
    beforeEach((done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => done());
    });

    it('should join channel', (done) => {
      clientSocket.emit('chat:join_channel', {
        channelId: 'test-channel-123',
      });

      clientSocket.once('channel_joined', (data) => {
        expect(data.channelId).toBe('test-channel-123');
        done();
      });
    });

    it('should leave channel', (done) => {
      const channelId = 'leave-test-channel';

      // Join first
      clientSocket.emit('chat:join_channel', { channelId });

      clientSocket.once('channel_joined', () => {
        // Then leave
        clientSocket.emit('chat:leave_channel', { channelId });

        clientSocket.once('channel_left', (data) => {
          expect(data.channelId).toBe(channelId);
          done();
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach((done) => {
      clientSocket = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'test@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      clientSocket.on('connected', () => done());
    });

    it('should handle invalid message format', (done) => {
      clientSocket.emit('chat:message', {
        // Missing required fields
      });

      clientSocket.once('error', (error) => {
        expect(error.error).toBeDefined();
        done();
      });
    });

    it('should handle unauthorized channel access', (done) => {
      clientSocket.emit('chat:message', {
        channelId: 'unauthorized-channel',
        content: 'Should fail',
      });

      clientSocket.once('error', (error) => {
        expect(error.error).toContain('Access denied');
        done();
      });
    });
  });

  describe('Multi-Device Support', () => {
    it('should support multiple connections from same user', (done) => {
      const client1 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'multidevice@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      const client2 = io(`http://localhost:${port}`, {
        query: {
          userEmail: 'multidevice@example.com',
          workspaceId: 'test-workspace-id',
        },
      });

      Promise.all([
        new Promise(resolve => client1.on('connected', resolve)),
        new Promise(resolve => client2.on('connected', resolve)),
      ]).then(() => {
        expect(client1.connected).toBe(true);
        expect(client2.connected).toBe(true);
        client1.disconnect();
        client2.disconnect();
        done();
      });
    });
  });
});

