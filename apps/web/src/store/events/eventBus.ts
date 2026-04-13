// Event-driven architecture with central event bus

// Types
export interface MeridianEvent {
  id: string;
  type: string;
  category: 'user' | 'system' | 'network' | 'ui' | 'data' | 'error' | 'performance';
  payload: any;
  timestamp: number;
  source: string;
  target?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  persistent?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  currentRetries?: number;
  ttl?: number; // Time to live in milliseconds
}

export interface EventListener<T = any> {
  id: string;
  eventType: string;
  handler: (event: MeridianEvent<T>) => void | Promise<void>;
  filter?: (event: MeridianEvent<T>) => boolean;
  once?: boolean;
  priority: number;
  source?: string;
  category?: MeridianEvent['category'];
  active: boolean;
  errorHandler?: (error: Error, event: MeridianEvent<T>) => void;
}

export interface EventMiddleware {
  id: string;
  name: string;
  handler: (event: MeridianEvent, next: () => void) => void | Promise<void>;
  priority: number;
  active: boolean;
}

export interface EventBusConfig {
  maxListeners: number;
  maxQueueSize: number;
  enablePersistence: boolean;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  retryInterval: number;
  defaultTTL: number;
  performanceThreshold: number;
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  processingTimes: Record<string, number[]>;
  errors: number;
  retries: number;
  queueSize: number;
  lastProcessed: number;
}

// Event priority queue
class EventQueue {
  private queue: MeridianEvent[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  enqueue(event: MeridianEvent): boolean {
    if (this.queue.length >= this.maxSize) {
      // Remove oldest low priority events to make room
      this.queue = this.queue.filter(e => e.priority !== 'low').slice(-(this.maxSize - 1));
    }

    // Insert event based on priority
    const priorities = { critical: 0, high: 1, medium: 2, low: 3 };
    const eventPriority = priorities[event.priority];
    
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorities[this.queue[i].priority] > eventPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, event);
    return true;
  }

  dequeue(): MeridianEvent | undefined {
    return this.queue.shift();
  }

  peek(): MeridianEvent | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  removeExpired(): void {
    const now = Date.now();
    this.queue = this.queue.filter(event => {
      if (!event.ttl) return true;
      return (event.timestamp + event.ttl) > now;
    });
  }

  getEvents(): MeridianEvent[] {
    return [...this.queue];
  }
}

// Event persistence manager
class EventPersistence {
  private storage: Storage;
  private keyPrefix: string;

  constructor(storage: Storage = localStorage, keyPrefix: string = 'meridian_events') {
    this.storage = storage;
    this.keyPrefix = keyPrefix;
  }

  saveEvent(event: MeridianEvent): void {
    if (!event.persistent) return;

    try {
      const key = `${this.keyPrefix}_${event.id}`;
      this.storage.setItem(key, JSON.stringify(event));
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }

  loadEvents(): MeridianEvent[] {
    const events: MeridianEvent[] = [];

    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          const eventData = this.storage.getItem(key);
          if (eventData) {
            const event = JSON.parse(eventData);
            events.push(event);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted events:', error);
    }

    return events;
  }

  removeEvent(eventId: string): void {
    try {
      const key = `${this.keyPrefix}_${eventId}`;
      this.storage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove persisted event:', error);
    }
  }

  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear persisted events:', error);
    }
  }
}

// Main event bus implementation
export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private middleware: EventMiddleware[] = [];
  private queue: EventQueue;
  private persistence: EventPersistence;
  private config: EventBusConfig;
  private metrics: EventMetrics;
  private processing = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = {
      maxListeners: 100,
      maxQueueSize: 1000,
      enablePersistence: true,
      enableMetrics: true,
      enableDebugLogging: false,
      retryInterval: 1000,
      defaultTTL: 300000, // 5 minutes
      performanceThreshold: 100, // milliseconds
      ...config,
    };

    this.queue = new EventQueue(this.config.maxQueueSize);
    this.persistence = new EventPersistence();
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      eventsByCategory: {},
      processingTimes: {},
      errors: 0,
      retries: 0,
      queueSize: 0,
      lastProcessed: 0,
    };

    // Load persisted events if enabled
    if (this.config.enablePersistence) {
      this.loadPersistedEvents();
    }

    // Start processing queue
    this.startProcessing();

    // Cleanup expired events periodically
    setInterval(() => {
      this.queue.removeExpired();
    }, 60000); // Every minute
  }

  // Event emission
  emit<T = any>(
    type: string,
    payload: T,
    options: Partial<Pick<MeridianEvent, 'category' | 'source' | 'target' | 'userId' | 'sessionId' | 'metadata' | 'priority' | 'persistent' | 'retryable' | 'maxRetries' | 'ttl'>> = {}
  ): string {
    const event: MeridianEvent = {
      id: this.generateEventId(),
      type,
      category: options.category || 'user',
      payload,
      timestamp: Date.now(),
      source: options.source || 'unknown',
      target: options.target,
      userId: options.userId,
      sessionId: options.sessionId,
      metadata: options.metadata,
      priority: options.priority || 'medium',
      persistent: options.persistent || false,
      retryable: options.retryable || false,
      maxRetries: options.maxRetries || 3,
      currentRetries: 0,
      ttl: options.ttl || this.config.defaultTTL,
    };

    if (this.config.enableDebugLogging) {
      logger.info("🔥 Event emitted:");
    }

    // Add to queue for processing
    this.queue.enqueue(event);

    // Persist if required
    if (this.config.enablePersistence && event.persistent) {
      this.persistence.saveEvent(event);
    }

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(event);
    }

    return event.id;
  }

  // Event listening
  on<T = any>(
    eventType: string,
    handler: (event: MeridianEvent<T>) => void | Promise<void>,
    options: Partial<Pick<EventListener, 'filter' | 'once' | 'priority' | 'source' | 'category' | 'errorHandler'>> = {}
  ): string {
    const listener: EventListener<T> = {
      id: this.generateListenerId(),
      eventType,
      handler,
      filter: options.filter,
      once: options.once || false,
      priority: options.priority || 5,
      source: options.source,
      category: options.category,
      active: true,
      errorHandler: options.errorHandler,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const eventListeners = this.listeners.get(eventType)!;
    eventListeners.push(listener);

    // Sort by priority (lower number = higher priority)
    eventListeners.sort((a, b) => a.priority - b.priority);

    // Check max listeners limit
    if (eventListeners.length > this.config.maxListeners) {
      console.warn(`Max listeners (${this.config.maxListeners}) exceeded for event type: ${eventType}`);
    }

    if (this.config.enableDebugLogging) {
      logger.info("👂 Listener added for ${eventType}:");
    }

    return listener.id;
  }

  // Once listener (automatically removes after first execution)
  once<T = any>(
    eventType: string,
    handler: (event: MeridianEvent<T>) => void | Promise<void>,
    options: Partial<Pick<EventListener, 'filter' | 'priority' | 'source' | 'category' | 'errorHandler'>> = {}
  ): string {
    return this.on(eventType, handler, { ...options, once: true });
  }

  // Remove listener
  off(listenerId: string): boolean {
    for (const [eventType, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.listeners.delete(eventType);
        }
        return true;
      }
    }
    return false;
  }

  // Remove all listeners for an event type
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  // Middleware management
  use(middleware: Omit<EventMiddleware, 'id'>): string {
    const id = this.generateMiddlewareId();
    const fullMiddleware: EventMiddleware = { ...middleware, id };
    
    this.middleware.push(fullMiddleware);
    this.middleware.sort((a, b) => a.priority - b.priority);

    return id;
  }

  removeMiddleware(middlewareId: string): boolean {
    const index = this.middleware.findIndex(m => m.id === middlewareId);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  // Event processing
  private async startProcessing(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.processing) {
      const event = this.queue.dequeue();
      if (event) {
        await this.processEvent(event);
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  private async processEvent(event: MeridianEvent): Promise<void> {
    const startTime = performance.now();

    try {
      // Apply middleware
      await this.applyMiddleware(event);

      // Get listeners for this event type
      const listeners = this.listeners.get(event.type) || [];
      const filteredListeners = listeners.filter(listener => 
        listener.active && this.shouldProcessListener(listener, event)
      );

      // Process all listeners
      await Promise.allSettled(
        filteredListeners.map(listener => this.executeListener(listener, event))
      );

      // Remove one-time listeners
      filteredListeners
        .filter(listener => listener.once)
        .forEach(listener => this.off(listener.id));

      // Remove from persistence if it was persisted
      if (event.persistent) {
        this.persistence.removeEvent(event.id);
      }

    } catch (error) {
      console.error('Error processing event:', error);
      
      if (this.config.enableMetrics) {
        this.metrics.errors++;
      }

      // Retry if retryable
      if (event.retryable && event.currentRetries! < event.maxRetries!) {
        await this.scheduleRetry(event);
      }
    }

    // Update performance metrics
    if (this.config.enableMetrics) {
      const duration = performance.now() - startTime;
      this.updateProcessingTime(event.type, duration);
      
      if (duration > this.config.performanceThreshold) {
        console.warn(`Slow event processing detected: ${event.type} took ${duration.toFixed(2)}ms`);
      }
    }

    this.metrics.lastProcessed = Date.now();
    this.metrics.queueSize = this.queue.size();
  }

  private async applyMiddleware(event: MeridianEvent): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middleware.length) return;

      const middleware = this.middleware[index];
      index++;

      if (middleware.active) {
        await middleware.handler(event, next);
      } else {
        await next();
      }
    };

    await next();
  }

  private shouldProcessListener(listener: EventListener, event: MeridianEvent): boolean {
    // Check source filter
    if (listener.source && listener.source !== event.source) {
      return false;
    }

    // Check category filter
    if (listener.category && listener.category !== event.category) {
      return false;
    }

    // Apply custom filter
    if (listener.filter && !listener.filter(event)) {
      return false;
    }

    return true;
  }

  private async executeListener(listener: EventListener, event: MeridianEvent): Promise<void> {
    try {
      await listener.handler(event);
    } catch (error) {
      if (listener.errorHandler) {
        listener.errorHandler(error as Error, event);
      } else {
        console.error(`Error in event listener ${listener.id}:`, error);
      }
      throw error;
    }
  }

  private async scheduleRetry(event: MeridianEvent): Promise<void> {
    event.currentRetries = (event.currentRetries || 0) + 1;
    
    if (this.config.enableMetrics) {
      this.metrics.retries++;
    }

    const delay = this.config.retryInterval * Math.pow(2, event.currentRetries - 1); // Exponential backoff
    
    const timeoutId = setTimeout(() => {
      this.queue.enqueue(event);
      this.retryTimeouts.delete(event.id);
    }, delay);

    this.retryTimeouts.set(event.id, timeoutId);
  }

  private updateMetrics(event: MeridianEvent): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1;
    this.metrics.eventsByCategory[event.category] = (this.metrics.eventsByCategory[event.category] || 0) + 1;
  }

  private updateProcessingTime(eventType: string, duration: number): void {
    if (!this.metrics.processingTimes[eventType]) {
      this.metrics.processingTimes[eventType] = [];
    }

    this.metrics.processingTimes[eventType].push(duration);

    // Keep only last 100 measurements
    if (this.metrics.processingTimes[eventType].length > 100) {
      this.metrics.processingTimes[eventType] = this.metrics.processingTimes[eventType].slice(-100);
    }
  }

  private loadPersistedEvents(): void {
    const events = this.persistence.loadEvents();
    events.forEach(event => {
      this.queue.enqueue(event);
    });

    if (this.config.enableDebugLogging && events.length > 0) {
      logger.info("Loaded ${events.length} persisted events");
    }
  }

  // Utility methods
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMiddlewareId(): string {
    return `middleware_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  getQueueStatus(): { size: number; events: MeridianEvent[] } {
    return {
      size: this.queue.size(),
      events: this.queue.getEvents(),
    };
  }

  getListeners(eventType?: string): EventListener[] {
    if (eventType) {
      return this.listeners.get(eventType) || [];
    }

    const allListeners: EventListener[] = [];
    for (const listeners of this.listeners.values()) {
      allListeners.push(...listeners);
    }
    return allListeners;
  }

  getMiddleware(): EventMiddleware[] {
    return [...this.middleware];
  }

  clearQueue(): void {
    this.queue.clear();
  }

  clearPersistence(): void {
    this.persistence.clear();
  }

  destroy(): void {
    this.processing = false;
    this.clearQueue();
    this.removeAllListeners();
    this.middleware = [];
    
    // Clear all retry timeouts
    for (const timeoutId of this.retryTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.retryTimeouts.clear();
  }
}

// Global event bus instance
export const eventBus = new EventBus({
  enableDebugLogging: process.env.NODE_ENV === 'development',
  enableMetrics: true,
  enablePersistence: true,
});

// Convenience functions
export const emit = eventBus.emit.bind(eventBus);
export const on = eventBus.on.bind(eventBus);
export const once = eventBus.once.bind(eventBus);
export const off = eventBus.off.bind(eventBus);

// Default export
export default eventBus;