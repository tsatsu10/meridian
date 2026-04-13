// @ts-nocheck - Suppress TypeScript strict null checks for test file
/**
 * TODO: Missing dependency - socket.io-client
 * Error: Failed to load url socket.io-client
 * Need to install socket.io-client package
 * Also requires live WebSocket server
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket } from 'socket.io-client';
import { UnifiedWebSocketServer } from '../../realtime/unified-websocket-server';
import { getDatabase } from '../../database/connection';
import {
  userTable,
  channelTable,
  channelMembershipTable,
  messageTable,
  workspaceUserTable,
  userPresenceTable
} from '../../database/schema';
import { eq, and } from 'drizzle-orm';

describe.skip('WebSocket Server Integration Tests', () => {
  let httpServer: any;
  let wsServer: UnifiedWebSocketServer;
  let serverAddress: string;
  let clients: Socket[] = [];
  let db: any;

  const testPort = 3009;

  // Test data
  const testUsers = [
    {
      id: 'user-1',
      email: 'user1@test.com',
      name: 'User One',
      workspaceId: 'workspace-1'
    },
    {
      id: 'user-2',
      email: 'user2@test.com',
      name: 'User Two',
      workspaceId: 'workspace-1'
    },
    {
      id: 'user-3',
      email: 'user3@test.com',
      name: 'User Three',
      workspaceId: 'workspace-2'
    }
  ] as const;

  // Helper functions to safely access test data
  const getUser = (index: number) => {
    const user = testUsers[index];
    if (!user) throw new Error(`Test user at index ${index} not found`);
    return user;
  };

  const getChannel = (index: number) => {
    const channel = testChannels[index];
    if (!channel) throw new Error(`Test channel at index ${index} not found`);
    return channel;
  };

  const testChannels = [
    {
      id: 'channel-1',
      name: 'general',
      workspaceId: 'workspace-1',
      type: 'public'
    },
    {
      id: 'channel-2',
      name: 'private',
      workspaceId: 'workspace-1',
      type: 'private'
    },
    {
      id: 'channel-3',
      name: 'team',
      workspaceId: 'workspace-2',
      type: 'public'
    }
  ];

  beforeAll(async () => {
    // Setup test database
    db = getDatabase();

    // Insert test users
    for (const user of testUsers) {
      await db.insert(userTable).values({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await db.insert(workspaceUserTable).values({
        id: `wu-${user.id}`,
        userId: user.id,
        workspaceId: user.workspaceId,
        role: 'member',
        createdAt: new Date()
      });
    }

    // Insert test channels
    for (const channel of testChannels) {
      await db.insert(channelTable).values({
        id: channel.id,
        name: channel.name,
        workspaceId: channel.workspaceId,
        type: channel.type,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add memberships for users in the same workspace
      const workspaceUsers = testUsers.filter(u => u.workspaceId === channel.workspaceId);
      for (const user of workspaceUsers) {
        await db.insert(channelMembershipTable).values({
          id: `cm-${channel.id}-${user.id}`,
          channelId: channel.id,
          userId: user.id,
          role: 'member',
          joinedAt: new Date()
        });
      }
    }
  });

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();

    // Create WebSocket server
    wsServer = new UnifiedWebSocketServer(httpServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(testPort, () => {
        serverAddress = `http://localhost:${testPort}`;
        resolve();
      });
    });

    clients = [];
  });

  afterEach(async () => {
    // Disconnect all clients
    for (const client of clients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    clients = [];

    // Stop WebSocket server
    if (wsServer) {
      wsServer.cleanup();
    }

    // Close HTTP server
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(resolve);
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(channelMembershipTable);
    await db.delete(messageTable);
    await db.delete(channelTable);
    await db.delete(userPresenceTable);
    await db.delete(workspaceUserTable);
    await db.delete(userTable);
  });

  // Helper function to create authenticated client
  const createClient = (userEmail: string, workspaceId: string): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      const client = ioClient(serverAddress, {
        query: { userEmail, workspaceId },
        transports: ['websocket'],
        forceNew: true
      });

      client.on('connect', () => {
        clients.push(client);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        reject(error);
      });

      // Set timeout
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  };

  describe('Connection Management', () => {
    it('should accept valid user connections', async () => {
      const user = getUser(0);
      const client = await createClient(user.email, user.workspaceId);
      expect(client.connected).toBe(true);
    });

    it('should reject connections without proper authentication', async () => {
      await expect(createClient('invalid@email.com', 'invalid-workspace'))
        .rejects.toThrow();
    });

    it('should handle multiple connections from same user', async () => {
      const user = getUser(0);
      const client1 = await createClient(user.email, user.workspaceId);
      const client2 = await createClient(user.email, user.workspaceId);

      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);
      expect(client1.id).not.toBe(client2.id);
    });

    it('should enforce connection limits per user', async () => {
      const user = getUser(0);
      const connectionPromises = [];

      // Try to create more connections than allowed
      for (let i = 0; i < 7; i++) {
        connectionPromises.push(createClient(user.email, user.workspaceId));
      }

      // Some connections should be rejected
      const results = await Promise.allSettled(connectionPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeLessThanOrEqual(5); // MAX_CONNECTIONS_PER_USER
      expect(failed).toBeGreaterThan(0);
    });

    it('should track user presence on connect/disconnect', async () => {
      const user = testUsers[0];
      const client = await createClient(user.email, user.workspaceId);

      // Check presence was created
      const presence = await db.select().from(userPresenceTable)
        .where(eq(userPresenceTable.userEmail, user.email));

      expect(presence).toHaveLength(1);
      expect(presence[0].status).toBe('online');

      // Disconnect and check presence update
      client.disconnect();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedPresence = await db.select().from(userPresenceTable)
        .where(eq(userPresenceTable.userEmail, user.email));

      expect(updatedPresence[0].status).toBe('offline');
    });
  });

  describe('Channel Operations', () => {
    it('should allow users to join channels in their workspace', async () => {
      const user = testUsers[0];
      const channel = testChannels[0]; // Same workspace
      const client = await createClient(user.email, user.workspaceId);

      const joinPromise = new Promise<void>((resolve) => {
        client.on('chat:user_event', (data) => {
          if (data.type === 'user_joined' && data.channelId === channel.id) {
            resolve();
          }
        });
      });

      client.emit('chat:join_channel', { channelId: channel.id });

      await joinPromise;
    });

    it('should prevent users from joining channels outside their workspace', async () => {
      const user = testUsers[0]; // workspace-1
      const channel = testChannels[2]; // workspace-2
      const client = await createClient(user.email, user.workspaceId);

      const errorPromise = new Promise<string>((resolve) => {
        client.on('error', (error) => {
          resolve(error.error);
        });
      });

      client.emit('chat:join_channel', { channelId: channel.id });

      const error = await errorPromise;
      expect(error).toContain('Access denied');
    });

    it('should broadcast join/leave events to channel members', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const channel = testChannels[0];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // User1 joins channel first
      client1.emit('chat:join_channel', { channelId: channel.id });
      await new Promise(resolve => setTimeout(resolve, 100));

      // User2 should receive notification when joining
      const joinEventPromise = new Promise<any>((resolve) => {
        client1.on('chat:user_event', (data) => {
          if (data.type === 'user_joined' && data.data.userEmail === user2.email) {
            resolve(data);
          }
        });
      });

      client2.emit('chat:join_channel', { channelId: channel.id });

      const joinEvent = await joinEventPromise;
      expect(joinEvent.channelId).toBe(channel.id);
      expect(joinEvent.data.userEmail).toBe(user2.email);
    });
  });

  describe('Message Handling', () => {
    it('should deliver messages between channel members', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const channel = testChannels[0];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // Both join channel
      client1.emit('chat:join_channel', { channelId: channel.id });
      client2.emit('chat:join_channel', { channelId: channel.id });

      await new Promise(resolve => setTimeout(resolve, 200));

      // User2 waits for message
      const messagePromise = new Promise<any>((resolve) => {
        client2.on('chat:message', (message) => {
          resolve(message);
        });
      });

      // User1 sends message
      const testMessage = 'Hello from integration test!';
      client1.emit('chat:message', {
        channelId: channel.id,
        content: testMessage,
        messageType: 'text'
      });

      const receivedMessage = await messagePromise;
      expect(receivedMessage.data.content).toBe(testMessage);
      expect(receivedMessage.userEmail).toBe(user1.email);
      expect(receivedMessage.channelId).toBe(channel.id);
    });

    it('should persist messages to database', async () => {
      const user = testUsers[0];
      const channel = testChannels[0];
      const client = await createClient(user.email, user.workspaceId);

      client.emit('chat:join_channel', { channelId: channel.id });
      await new Promise(resolve => setTimeout(resolve, 100));

      const testMessage = 'Persistent message test';
      client.emit('chat:message', {
        channelId: channel.id,
        content: testMessage,
        messageType: 'text'
      });

      // Wait for database persistence
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check message was stored
      const messages = await db.select().from(messageTable)
        .where(eq(messageTable.channelId, channel.id));

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(testMessage);
      expect(messages[0].userEmail).toBe(user.email);
    });

    it('should handle message delivery status', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const channel = testChannels[0];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // Both join channel
      client1.emit('chat:join_channel', { channelId: channel.id });
      client2.emit('chat:join_channel', { channelId: channel.id });

      await new Promise(resolve => setTimeout(resolve, 200));

      // User1 waits for delivery confirmation
      const deliveryPromise = new Promise<any>((resolve) => {
        client1.on('chat:message_delivered', (data) => {
          resolve(data);
        });
      });

      // Send message
      client1.emit('chat:message', {
        channelId: channel.id,
        content: 'Delivery test message',
        messageType: 'text'
      });

      const deliveryStatus = await deliveryPromise;
      expect(deliveryStatus.deliveryStatus).toBe('delivered');
      expect(deliveryStatus.messageId).toBeDefined();
    });

    it('should prevent message spam with rate limiting', async () => {
      const user = testUsers[0];
      const channel = testChannels[0];
      const client = await createClient(user.email, user.workspaceId);

      client.emit('chat:join_channel', { channelId: channel.id });
      await new Promise(resolve => setTimeout(resolve, 100));

      let rateLimitError: string | null = null;
      client.on('error', (error) => {
        if (error.error.includes('rate limit')) {
          rateLimitError = error.error;
        }
      });

      // Send many messages rapidly
      for (let i = 0; i < 20; i++) {
        client.emit('chat:message', {
          channelId: channel.id,
          content: `Spam message ${i}`,
          messageType: 'text'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(rateLimitError).toBeTruthy();
    });
  });

  describe('Typing Indicators', () => {
    it('should broadcast typing indicators to channel members', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const channel = testChannels[0];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // Both join channel
      client1.emit('chat:join_channel', { channelId: channel.id });
      client2.emit('chat:join_channel', { channelId: channel.id });

      await new Promise(resolve => setTimeout(resolve, 200));

      // User2 waits for typing indicator
      const typingPromise = new Promise<any>((resolve) => {
        client2.on('chat:typing', (data) => {
          if (data.type === 'typing') {
            resolve(data);
          }
        });
      });

      // User1 starts typing
      client1.emit('chat:typing', { channelId: channel.id });

      const typingEvent = await typingPromise;
      expect(typingEvent.data.userEmail).toBe(user1.email);
      expect(typingEvent.channelId).toBe(channel.id);
    });

    it('should auto-clear typing indicators after timeout', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const channel = testChannels[0];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // Both join channel
      client1.emit('chat:join_channel', { channelId: channel.id });
      client2.emit('chat:join_channel', { channelId: channel.id });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Track typing events
      const typingEvents: any[] = [];
      client2.on('chat:typing', (data) => {
        typingEvents.push(data);
      });

      // User1 starts typing
      client1.emit('chat:typing', { channelId: channel.id });

      // Wait for auto-stop timeout (should be ~3 seconds)
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Should have received both typing and stop_typing events
      expect(typingEvents).toHaveLength(2);
      expect(typingEvents[0].type).toBe('typing');
      expect(typingEvents[1].type).toBe('stop_typing');
    });
  });

  describe('Presence System', () => {
    it('should broadcast presence updates to workspace members', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1]; // Same workspace
      const user3 = testUsers[2]; // Different workspace

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);
      const client3 = await createClient(user3.email, user3.workspaceId);

      await new Promise(resolve => setTimeout(resolve, 200));

      // User2 should receive presence updates from User1 (same workspace)
      const presencePromise = new Promise<any>((resolve) => {
        client2.on('realtime:presence', (data) => {
          if (data.userEmail === user1.email) {
            resolve(data);
          }
        });
      });

      // User1 updates presence
      client1.emit('realtime:presence', {
        status: 'away',
        currentPage: '/dashboard/projects'
      });

      const presenceUpdate = await presencePromise;
      expect(presenceUpdate.userEmail).toBe(user1.email);
      expect(presenceUpdate.presence).toBe('away');
      expect(presenceUpdate.currentPage).toBe('/dashboard/projects');

      // User3 (different workspace) should not receive the update
      let user3ReceivedUpdate = false;
      client3.on('realtime:presence', (data) => {
        if (data.userEmail === user1.email) {
          user3ReceivedUpdate = true;
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(user3ReceivedUpdate).toBe(false);
    });

    it('should provide presence list for workspace members', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // Wait for initial presence sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // User1 should receive presence list including User2
      const presenceListPromise = new Promise<any>((resolve) => {
        client1.on('realtime:presence_list', (data) => {
          resolve(data);
        });
      });

      // Request presence list (this would typically happen automatically)
      client1.emit('realtime:get_presence');

      const presenceList = await presenceListPromise;
      expect(presenceList.users).toBeDefined();
      expect(presenceList.users.some((u: any) => u.userEmail === user2.email)).toBe(true);
    });
  });

  describe('Real-time Collaboration', () => {
    it('should sync cursor positions between users', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      await new Promise(resolve => setTimeout(resolve, 200));

      // User2 waits for cursor updates
      const cursorPromise = new Promise<any>((resolve) => {
        client2.on('realtime:cursor', (data) => {
          resolve(data);
        });
      });

      // User1 updates cursor position
      client1.emit('realtime:cursor', {
        x: 150,
        y: 300,
        elementId: 'task-456',
        resourceId: 'project-789'
      });

      const cursorUpdate = await cursorPromise;
      expect(cursorUpdate.x).toBe(150);
      expect(cursorUpdate.y).toBe(300);
      expect(cursorUpdate.elementId).toBe('task-456');
      expect(cursorUpdate.resourceId).toBe('project-789');
      expect(cursorUpdate.userEmail).toBe(user1.email);
    });

    it('should broadcast task updates in real-time', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      await new Promise(resolve => setTimeout(resolve, 200));

      // User2 waits for sync updates
      const syncPromise = new Promise<any>((resolve) => {
        client2.on('realtime:sync', (data) => {
          if (data.type === 'task_updated') {
            resolve(data);
          }
        });
      });

      // User1 broadcasts task update
      client1.emit('realtime:sync', {
        type: 'task_updated',
        data: {
          taskId: 'task-123',
          title: 'Updated Task Title',
          status: 'completed',
          updatedBy: user1.email
        }
      });

      const taskUpdate = await syncPromise;
      expect(taskUpdate.type).toBe('task_updated');
      expect(taskUpdate.data.taskId).toBe('task-123');
      expect(taskUpdate.data.status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed message data gracefully', async () => {
      const user = testUsers[0];
      const client = await createClient(user.email, user.workspaceId);

      let errorReceived = false;
      client.on('error', () => {
        errorReceived = true;
      });

      // Send malformed message
      client.emit('chat:message', {
        // Missing required fields
        content: 'Test message'
        // Missing channelId
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(errorReceived).toBe(true);
    });

    it('should validate message content and prevent XSS', async () => {
      const user = testUsers[0];
      const channel = testChannels[0];
      const client = await createClient(user.email, user.workspaceId);

      client.emit('chat:join_channel', { channelId: channel.id });
      await new Promise(resolve => setTimeout(resolve, 100));

      let errorReceived = false;
      client.on('error', (error) => {
        if (error.error.includes('Invalid content')) {
          errorReceived = true;
        }
      });

      // Send potentially malicious content
      client.emit('chat:message', {
        channelId: channel.id,
        content: '<script>alert("xss")</script>',
        messageType: 'text'
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(errorReceived).toBe(true);
    });

    it('should handle client disconnections gracefully', async () => {
      const user = testUsers[0];
      const client = await createClient(user.email, user.workspaceId);

      // Verify connection
      expect(client.connected).toBe(true);

      // Abrupt disconnect
      client.disconnect();

      // Should not throw errors or crash server
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Presence should be updated to offline
      const presence = await db.select().from(userPresenceTable)
        .where(eq(userPresenceTable.userEmail, user.email));

      expect(presence[0].status).toBe('offline');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent message sending efficiently', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const channel = testChannels[0];

      const client1 = await createClient(user1.email, user1.workspaceId);
      const client2 = await createClient(user2.email, user2.workspaceId);

      // Both join channel
      client1.emit('chat:join_channel', { channelId: channel.id });
      client2.emit('chat:join_channel', { channelId: channel.id });

      await new Promise(resolve => setTimeout(resolve, 200));

      const messageCount = 50;
      const receivedMessages: any[] = [];

      client2.on('chat:message', (message) => {
        receivedMessages.push(message);
      });

      const startTime = Date.now();

      // Send messages concurrently
      const messagePromises = [];
      for (let i = 0; i < messageCount; i++) {
        messagePromises.push(
          new Promise<void>((resolve) => {
            client1.emit('chat:message', {
              channelId: channel.id,
              content: `Concurrent message ${i}`,
              messageType: 'text'
            });
            resolve();
          })
        );
      }

      await Promise.all(messagePromises);

      // Wait for all messages to be received
      await waitFor(() => receivedMessages.length === messageCount, 10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(receivedMessages).toHaveLength(messageCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should clean up resources on connection close', async () => {
      const user = testUsers[0];
      const client = await createClient(user.email, user.workspaceId);

      const socketId = client.id;
      expect(client.connected).toBe(true);

      // Disconnect and verify cleanup
      client.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify socket cleanup (this would be internal to the server)
      // In a real test, we'd check server's internal connection maps
    });
  });
});

// Helper function for waiting with timeout
function waitFor(condition: () => boolean, timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}

