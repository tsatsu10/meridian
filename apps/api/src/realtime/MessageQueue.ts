/**
 * @epic-5.2-real-time-infrastructure - Message queuing and delivery
 * @persona-all - Consistent message delivery for all real-time features
 */

import { logger } from '../utils/logger';
import { getEventEmitter, EventTypes } from '../utils/EventEmitter';

export interface QueuedMessage {
  id: string;
  type: string;
  payload: any;
  userId: string;
  roomId?: string;
  workspaceId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledFor?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface MessageQueueStats {
  totalQueued: number;
  totalDelivered: number;
  totalFailed: number;
  queueSize: number;
  averageDeliveryTime: number;
  deliverySuccessRate: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing: boolean = false;
  private deliveryTimes: number[] = [];
  private stats = {
    totalQueued: 0,
    totalDelivered: 0,
    totalFailed: 0,
  };

  constructor() {
    this.startProcessing();
  }

  /**
   * Queue a message for delivery
   */
  async queueMessage(data: {
    type: string;
    payload: any;
    userId: string;
    roomId?: string;
    workspaceId?: string;
    priority?: QueuedMessage['priority'];
    scheduledFor?: Date;
    maxRetries?: number;
  }): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message: QueuedMessage = {
      id: messageId,
      type: data.type,
      payload: data.payload,
      userId: data.userId,
      roomId: data.roomId,
      workspaceId: data.workspaceId,
      priority: data.priority || 'normal',
      retryCount: 0,
      maxRetries: data.maxRetries || 3,
      createdAt: new Date(),
      scheduledFor: data.scheduledFor,
    };

    // Add to queue based on priority
    this.addToQueue(message);
    this.stats.totalQueued++;

    logger.info('Message queued', {
      messageId,
      type: data.type,
      userId: data.userId,
      priority: message.priority,
      queueSize: this.queue.length,
    });

    return messageId;
  }

  /**
   * Add message to queue with priority ordering
   */
  private addToQueue(message: QueuedMessage): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    
    // Find insertion point based on priority
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = priorityOrder[this.queue[i].priority];
      const newPriority = priorityOrder[message.priority];
      
      if (newPriority < currentPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
  }

  /**
   * Start message processing
   */
  private startProcessing(): void {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.processQueue();
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    while (this.processing) {
      try {
        const message = this.getNextMessage();
        if (!message) {
          // No messages to process, wait a bit
          await this.sleep(100);
          continue;
        }

        await this.deliverMessage(message);
      } catch (error) {
        logger.error('Error processing message queue', {
          error: error instanceof Error ? error.message : error,
        });
        await this.sleep(1000); // Wait longer on error
      }
    }
  }

  /**
   * Get next message to process
   */
  private getNextMessage(): QueuedMessage | null {
    if (this.queue.length === 0) {
      return null;
    }

    const now = new Date();
    
    // Find first message that's ready for delivery
    for (let i = 0; i < this.queue.length; i++) {
      const message = this.queue[i];
      
      // Check if message is scheduled for future delivery
      if (message.scheduledFor && message.scheduledFor > now) {
        continue;
      }

      // Remove message from queue
      this.queue.splice(i, 1);
      return message;
    }

    return null;
  }

  /**
   * Set Socket.IO instance for message delivery
   */
  setSocketIO(io: any): void {
    this.io = io;
    logger.info('Socket.IO instance set for MessageQueue');
  }

  private io: any = null;

  /**
   * Deliver a message
   */
  private async deliverMessage(message: QueuedMessage): Promise<void> {
    if (!this.io) {
      throw new Error('Socket.IO instance not set in MessageQueue');
    }

    const startTime = Date.now();
    
    try {
      let deliveredTo = 0;
      
      switch (message.type) {
        case 'user':
          // Deliver to specific user
          deliveredTo = await this.deliverToUser(message);
          break;

        case 'workspace':
          // Deliver to workspace members
          deliveredTo = await this.deliverToWorkspace(message);
          break;

        case 'room':
        case 'channel':
          // Deliver to room/channel members
          deliveredTo = await this.deliverToRoom(message);
          break;

        case 'broadcast':
          // Broadcast to all connected clients
          deliveredTo = await this.deliverBroadcast(message);
          break;

        case 'notification':
          // Deliver notification
          deliveredTo = await this.deliverNotification(message);
          break;

        case 'presence':
          // Deliver presence update
          deliveredTo = await this.deliverPresenceUpdate(message);
          break;

        case 'typing':
          // Deliver typing indicator
          deliveredTo = await this.deliverTypingIndicator(message);
          break;

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      // Mark message as delivered
      message.deliveredAt = new Date();
      const deliveryTime = Date.now() - startTime;
      
      // Track delivery time for statistics
      this.deliveryTimes.push(deliveryTime);
      if (this.deliveryTimes.length > 1000) {
        this.deliveryTimes = this.deliveryTimes.slice(-1000); // Keep last 1000
      }
      
      this.stats.totalDelivered++;
      
      logger.info('Message delivered successfully', {
        messageId: message.id,
        type: message.type,
        priority: message.priority,
        deliveredTo,
        deliveryTimeMs: deliveryTime
      });
      
    } catch (error) {
      throw new Error(`Message delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deliver message to specific user
   */
  private async deliverToUser(message: QueuedMessage): Promise<number> {
    const userRoomName = `user_${message.userId}`;
    const userSockets = this.io.sockets.adapter.rooms.get(userRoomName);
    
    if (!userSockets || userSockets.size === 0) {
      // User is offline, store for later delivery
      await this.storeOfflineMessage(message);
      return 0;
    }

    let deliveredCount = 0;
    for (const socketId of userSockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.emit(this.getEventName(message.type), {
          id: message.id,
          type: message.type,
          payload: message.payload,
          timestamp: new Date().toISOString(),
          priority: message.priority
        });
        deliveredCount++;
      }
    }

    return deliveredCount;
  }

  /**
   * Deliver message to workspace
   */
  private async deliverToWorkspace(message: QueuedMessage): Promise<number> {
    const workspaceRoomName = `workspace_${message.workspaceId}`;
    const room = this.io.sockets.adapter.rooms.get(workspaceRoomName);
    
    if (!room || room.size === 0) {
      logger.warn(`No active connections in workspace: ${message.workspaceId}`);
      return 0;
    }

    this.io.to(workspaceRoomName).emit(this.getEventName(message.type), {
      id: message.id,
      type: message.type,
      payload: message.payload,
      timestamp: new Date().toISOString(),
      priority: message.priority,
      workspaceId: message.workspaceId
    });

    return room.size;
  }

  /**
   * Deliver message to room/channel
   */
  private async deliverToRoom(message: QueuedMessage): Promise<number> {
    const roomName = `room_${message.roomId}`;
    const room = this.io.sockets.adapter.rooms.get(roomName);
    
    if (!room || room.size === 0) {
      logger.warn(`No active connections in room: ${message.roomId}`);
      return 0;
    }

    this.io.to(roomName).emit(this.getEventName(message.type), {
      id: message.id,
      type: message.type,
      payload: message.payload,
      timestamp: new Date().toISOString(),
      priority: message.priority,
      roomId: message.roomId
    });

    return room.size;
  }

  /**
   * Deliver broadcast message
   */
  private async deliverBroadcast(message: QueuedMessage): Promise<number> {
    const connectedSockets = this.io.sockets.sockets.size;
    
    this.io.emit(this.getEventName(message.type), {
      id: message.id,
      type: message.type,
      payload: message.payload,
      timestamp: new Date().toISOString(),
      priority: message.priority
    });

    return connectedSockets;
  }

  /**
   * Deliver notification
   */
  private async deliverNotification(message: QueuedMessage): Promise<number> {
    return this.deliverToUser(message);
  }

  /**
   * Deliver presence update
   */
  private async deliverPresenceUpdate(message: QueuedMessage): Promise<number> {
    // Deliver to workspace members
    return this.deliverToWorkspace(message);
  }

  /**
   * Deliver typing indicator
   */
  private async deliverTypingIndicator(message: QueuedMessage): Promise<number> {
    // Deliver to room/channel members
    return this.deliverToRoom(message);
  }

  /**
   * Get event name for message type
   */
  private getEventName(messageType: string): string {
    const eventMap: Record<string, string> = {
      'user': 'user_message',
      'workspace': 'workspace_message',
      'room': 'room_message',
      'channel': 'channel_message',
      'broadcast': 'broadcast_message',
      'notification': 'notification',
      'presence': 'presence_update',
      'typing': 'typing_indicator'
    };

    return eventMap[messageType] || 'message';
  }

  /**
   * Store message for offline delivery
   */
  private async storeOfflineMessage(message: QueuedMessage): Promise<void> {
    // In a real implementation, this would store in database
    // For now, log and potentially implement later
    logger.info('Message stored for offline delivery', {
      messageId: message.id,
      userId: message.userId,
      type: message.type
    });
    
    // Could implement with database storage:
    // await db.insert(offlineMessagesTable).values({
    //   messageId: message.id,
    //   userId: message.userId,
    //   payload: JSON.stringify(message.payload),
    //   type: message.type,
    //   createdAt: new Date()
    // });
  }

  /**
   * Attempt to deliver a message
   */
  private async attemptDelivery(message: QueuedMessage): Promise<void> {
    // TODO: Implement actual message delivery logic
    // This would typically involve:
    // 1. Checking if user is online
    // 2. Sending via WebSocket if online
    // 3. Storing in database for offline delivery
    // 4. Sending push notifications if configured

    // For now, simulate delivery
    await this.sleep(Math.random() * 100); // Simulate network delay

    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Simulated delivery failure');
    }

    // Emit internal event for message delivery
    const eventEmitter = getEventEmitter();
    await eventEmitter.emit('message_delivered', {
      messageId: message.id,
      type: message.type,
      userId: message.userId,
      roomId: message.roomId,
      workspaceId: message.workspaceId,
    }, {
      source: 'message_queue',
    });
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(message: QueuedMessage, error: any): Promise<void> {
    message.retryCount++;
    message.error = error instanceof Error ? error.message : 'Unknown error';

    if (message.retryCount >= message.maxRetries) {
      // Max retries exceeded, mark as failed
      message.failedAt = new Date();
      this.stats.totalFailed++;

      logger.error('Message delivery failed permanently', {
        messageId: message.id,
        type: message.type,
        userId: message.userId,
        retryCount: message.retryCount,
        error: message.error,
      });

      // Emit failure event
      const eventEmitter = getEventEmitter();
      await eventEmitter.emit('message_delivery_failed', {
        messageId: message.id,
        type: message.type,
        userId: message.userId,
        error: message.error,
        retryCount: message.retryCount,
      }, {
        source: 'message_queue',
      });

    } else {
      // Retry with exponential backoff
      const backoffDelay = Math.min(1000 * Math.pow(2, message.retryCount), 30000);
      message.scheduledFor = new Date(Date.now() + backoffDelay);

      // Re-add to queue
      this.addToQueue(message);

      logger.warn('Message delivery failed, retrying', {
        messageId: message.id,
        type: message.type,
        userId: message.userId,
        retryCount: message.retryCount,
        nextRetry: message.scheduledFor,
        error: message.error,
      });
    }
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): QueuedMessage | null {
    return this.queue.find(msg => msg.id === messageId) || null;
  }

  /**
   * Cancel a queued message
   */
  cancelMessage(messageId: string): boolean {
    const index = this.queue.findIndex(msg => msg.id === messageId);
    if (index === -1) {
      return false;
    }

    const message = this.queue.splice(index, 1)[0];
    
    logger.info('Message cancelled', {
      messageId,
      type: message.type,
      userId: message.userId,
    });

    return true;
  }

  /**
   * Get queue statistics
   */
  getStats(): MessageQueueStats {
    const averageDeliveryTime = this.deliveryTimes.length > 0
      ? this.deliveryTimes.reduce((sum, time) => sum + time, 0) / this.deliveryTimes.length
      : 0;

    const totalProcessed = this.stats.totalDelivered + this.stats.totalFailed;
    const deliverySuccessRate = totalProcessed > 0
      ? (this.stats.totalDelivered / totalProcessed) * 100
      : 0;

    return {
      totalQueued: this.stats.totalQueued,
      totalDelivered: this.stats.totalDelivered,
      totalFailed: this.stats.totalFailed,
      queueSize: this.queue.length,
      averageDeliveryTime,
      deliverySuccessRate,
    };
  }

  /**
   * Get messages by user
   */
  getUserMessages(userId: string): QueuedMessage[] {
    return this.queue.filter(msg => msg.userId === userId);
  }

  /**
   * Get messages by room
   */
  getRoomMessages(roomId: string): QueuedMessage[] {
    return this.queue.filter(msg => msg.roomId === roomId);
  }

  /**
   * Get messages by workspace
   */
  getWorkspaceMessages(workspaceId: string): QueuedMessage[] {
    return this.queue.filter(msg => msg.workspaceId === workspaceId);
  }

  /**
   * Clear queue
   */
  clearQueue(): number {
    const count = this.queue.length;
    this.queue = [];
    
    logger.info('Message queue cleared', { count });
    return count;
  }

  /**
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.processing = false;
    this.queue = [];
    this.deliveryTimes = [];
    
    logger.info('Message queue cleaned up');
  }
} 

