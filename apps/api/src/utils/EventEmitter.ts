/**
 * @epic-5.1-api-standardization - Event emitter for real-time features
 * @persona-all - Consistent event handling for all real-time operations
 */

import { logger } from './logger';

export interface EventData {
  type: string;
  payload: any;
  timestamp: number;
  source: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, any>;
}

export interface EventListener {
  id: string;
  callback: (data: EventData) => void | Promise<void>;
  filter?: (data: EventData) => boolean;
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  activeListeners: number;
  averageProcessingTime: number;
}

export class EventEmitter {
  private static instance: EventEmitter;
  private listeners: Map<string, EventListener[]> = new Map();
  private stats: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    processingTimes: number[];
  } = {
    totalEvents: 0,
    eventsByType: {},
    processingTimes: [],
  };

  private constructor() {}

  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) {
      EventEmitter.instance = new EventEmitter();
    }
    return EventEmitter.instance;
  }

  /**
   * Emit an event
   */
  async emit(eventType: string, payload: any, options: {
    source: string;
    userId?: string;
    workspaceId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const eventData: EventData = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: options.source,
        userId: options.userId,
        workspaceId: options.workspaceId,
        metadata: options.metadata,
      };

      // Update statistics
      this.stats.totalEvents++;
      this.stats.eventsByType[eventType] = (this.stats.eventsByType[eventType] || 0) + 1;

      // Get listeners for this event type
      const listeners = this.listeners.get(eventType) || [];
      
      if (listeners.length === 0) {
        logger.debug('No listeners for event', { eventType, source: options.source });
        return;
      }

      // Execute all listeners
      const promises = listeners.map(async (listener) => {
        try {
          // Apply filter if present
          if (listener.filter && !listener.filter(eventData)) {
            return;
          }

          await listener.callback(eventData);
        } catch (error) {
          logger.error('Error in event listener', {
            eventType,
            listenerId: listener.id,
            error: error instanceof Error ? error.message : error,
          });
        }
      });

      await Promise.allSettled(promises);

      const processingTime = Date.now() - startTime;
      this.stats.processingTimes.push(processingTime);

      // Keep only last 100 processing times for average calculation
      if (this.stats.processingTimes.length > 100) {
        this.stats.processingTimes = this.stats.processingTimes.slice(-100);
      }

      logger.debug('Event emitted', {
        eventType,
        source: options.source,
        listenerCount: listeners.length,
        processingTime: `${processingTime}ms`,
      });
    } catch (error) {
      logger.error('Failed to emit event', {
        eventType,
        source: options.source,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Add an event listener
   */
  on(eventType: string, callback: (data: EventData) => void | Promise<void>, options?: {
    id?: string;
    filter?: (data: EventData) => boolean;
  }): string {
    const listenerId = options?.id || `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const listener: EventListener = {
      id: listenerId,
      callback,
      filter: options?.filter,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType)!.push(listener);

    logger.debug('Event listener added', {
      eventType,
      listenerId,
      hasFilter: !!options?.filter,
    });

    return listenerId;
  }

  /**
   * Remove an event listener
   */
  off(eventType: string, listenerId: string): boolean {
    const listeners = this.listeners.get(eventType);
    if (!listeners) {
      return false;
    }

    const initialLength = listeners.length;
    const filteredListeners = listeners.filter(listener => listener.id !== listenerId);
    
    if (filteredListeners.length === initialLength) {
      return false;
    }

    this.listeners.set(eventType, filteredListeners);

    logger.debug('Event listener removed', {
      eventType,
      listenerId,
    });

    return true;
  }

  /**
   * Remove all listeners for an event type
   */
  offAll(eventType: string): number {
    const listeners = this.listeners.get(eventType);
    if (!listeners) {
      return 0;
    }

    const count = listeners.length;
    this.listeners.delete(eventType);

    logger.debug('All event listeners removed', {
      eventType,
      count,
    });

    return count;
  }

  /**
   * Get all event types that have listeners
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listeners for a specific event type
   */
  getListeners(eventType: string): EventListener[] {
    return this.listeners.get(eventType) || [];
  }

  /**
   * Get event statistics
   */
  getStats(): EventStats {
    const totalListeners = Array.from(this.listeners.values()).reduce(
      (sum, listeners) => sum + listeners.length,
      0
    );

    const averageProcessingTime = this.stats.processingTimes.length > 0
      ? this.stats.processingTimes.reduce((sum, time) => sum + time, 0) / this.stats.processingTimes.length
      : 0;

    return {
      totalEvents: this.stats.totalEvents,
      eventsByType: { ...this.stats.eventsByType },
      activeListeners: totalListeners,
      averageProcessingTime,
    };
  }

  /**
   * Clear all listeners and reset statistics
   */
  clear(): void {
    this.listeners.clear();
    this.stats = {
      totalEvents: 0,
      eventsByType: {},
      processingTimes: [],
    };

    logger.info('Event emitter cleared');
  }

  /**
   * Emit workspace-specific event
   */
  async emitWorkspaceEvent(
    eventType: string,
    payload: any,
    workspaceId: string,
    options: {
      source: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.emit(eventType, payload, {
      ...options,
      workspaceId,
    });
  }

  /**
   * Emit user-specific event
   */
  async emitUserEvent(
    eventType: string,
    payload: any,
    userId: string,
    options: {
      source: string;
      workspaceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.emit(eventType, payload, {
      ...options,
      userId,
    });
  }

  /**
   * Add workspace-specific listener
   */
  onWorkspaceEvent(
    eventType: string,
    workspaceId: string,
    callback: (data: EventData) => void | Promise<void>,
    options?: { id?: string }
  ): string {
    return this.on(eventType, callback, {
      ...options,
      filter: (data) => data.workspaceId === workspaceId,
    });
  }

  /**
   * Add user-specific listener
   */
  onUserEvent(
    eventType: string,
    userId: string,
    callback: (data: EventData) => void | Promise<void>,
    options?: { id?: string }
  ): string {
    return this.on(eventType, callback, {
      ...options,
      filter: (data) => data.userId === userId,
    });
  }
}

// Export a convenience function for getting the event emitter instance
export const getEventEmitter = (): EventEmitter => {
  return EventEmitter.getInstance();
};

// Common event types
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',

  // Workspace events
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  WORKSPACE_MEMBER_ADDED: 'workspace.member_added',
  WORKSPACE_MEMBER_REMOVED: 'workspace.member_removed',

  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_STATUS_CHANGED: 'project.status_changed',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',

  // Team events
  TEAM_CREATED: 'team.created',
  TEAM_UPDATED: 'team.updated',
  TEAM_DELETED: 'team.deleted',
  TEAM_MEMBER_ADDED: 'team.member_added',
  TEAM_MEMBER_REMOVED: 'team.member_removed',

  // Message events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',

  // Time tracking events
  TIME_ENTRY_STARTED: 'time_entry.started',
  TIME_ENTRY_STOPPED: 'time_entry.stopped',
  TIME_ENTRY_UPDATED: 'time_entry.updated',
  TIME_ENTRY_DELETED: 'time_entry.deleted',

  // System events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes]; 

