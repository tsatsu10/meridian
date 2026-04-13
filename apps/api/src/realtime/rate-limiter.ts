/**
 * 🛡️ WebSocket Rate Limiter
 * Prevents abuse and DoS attacks on WebSocket connections
 */

import { logger } from '../utils/logger';

export interface RateLimitConfig {
  // Connection limits
  maxConnectionsPerIP: number;
  maxConnectionsPerUser: number;
  connectionWindowMs: number;
  
  // Message limits
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  messageBurstSize: number;
  
  // Event-specific limits
  maxTypingEventsPerMinute: number;
  maxPresenceUpdatesPerMinute: number;
  maxChannelJoinsPerHour: number;
  
  // Punishment settings
  blockDurationMs: number;
  warningThreshold: number;
}

export interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  blockedUntil?: number;
  warnings: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  isBlocked: boolean;
  blockReason?: string;
}

export class WebSocketRateLimiter {
  private config: RateLimitConfig;
  
  // Rate limiting stores
  private connectionsByIP = new Map<string, RateLimitEntry>();
  private connectionsByUser = new Map<string, RateLimitEntry>();
  private messagesBySocket = new Map<string, RateLimitEntry>();
  private messagesByUser = new Map<string, RateLimitEntry>();
  private typingBySocket = new Map<string, RateLimitEntry>();
  private presenceBySocket = new Map<string, RateLimitEntry>();
  private channelJoinsByUser = new Map<string, RateLimitEntry>();
  
  // Blocked entities
  private blockedIPs = new Set<string>();
  private blockedUsers = new Set<string>();
  private blockedSockets = new Set<string>();
  
  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    
    logger.info('WebSocket Rate Limiter initialized', {
      maxConnectionsPerIP: config.maxConnectionsPerIP,
      maxConnectionsPerUser: config.maxConnectionsPerUser,
      maxMessagesPerMinute: config.maxMessagesPerMinute,
      blockDurationMs: config.blockDurationMs
    });
  }

  /**
   * Check if connection is allowed
   */
  checkConnection(ip: string, userId: string): RateLimitResult {
    const now = Date.now();
    
    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + this.config.blockDurationMs,
        isBlocked: true,
        blockReason: 'IP blocked due to abuse'
      };
    }
    
    // Check if user is blocked
    if (this.blockedUsers.has(userId)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + this.config.blockDurationMs,
        isBlocked: true,
        blockReason: 'User blocked due to abuse'
      };
    }

    // Check IP connection limit
    const ipResult = this.checkLimit(
      this.connectionsByIP,
      ip,
      this.config.maxConnectionsPerIP,
      this.config.connectionWindowMs,
      'IP connection'
    );
    
    if (!ipResult.allowed) {
      this.handleViolation('ip', ip, 'Too many connections from IP');
      return ipResult;
    }

    // Check user connection limit
    const userResult = this.checkLimit(
      this.connectionsByUser,
      userId,
      this.config.maxConnectionsPerUser,
      this.config.connectionWindowMs,
      'User connection'
    );
    
    if (!userResult.allowed) {
      this.handleViolation('user', userId, 'Too many connections from user');
      return userResult;
    }

    return {
      allowed: true,
      remainingRequests: Math.min(ipResult.remainingRequests, userResult.remainingRequests),
      resetTime: Math.max(ipResult.resetTime, userResult.resetTime),
      isBlocked: false
    };
  }

  /**
   * Check if message is allowed
   */
  checkMessage(socketId: string, userId: string): RateLimitResult {
    // Check if socket is blocked
    if (this.blockedSockets.has(socketId)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + this.config.blockDurationMs,
        isBlocked: true,
        blockReason: 'Socket blocked due to abuse'
      };
    }

    // Check per-minute message limit
    const minuteResult = this.checkLimit(
      this.messagesBySocket,
      socketId,
      this.config.maxMessagesPerMinute,
      60 * 1000,
      'Messages per minute'
    );
    
    if (!minuteResult.allowed) {
      this.handleViolation('socket', socketId, 'Message rate limit exceeded');
      return minuteResult;
    }

    // Check hourly message limit for user
    const hourResult = this.checkLimit(
      this.messagesByUser,
      userId,
      this.config.maxMessagesPerHour,
      60 * 60 * 1000,
      'Messages per hour'
    );
    
    if (!hourResult.allowed) {
      this.handleViolation('user', userId, 'Hourly message limit exceeded');
      return hourResult;
    }

    return {
      allowed: true,
      remainingRequests: Math.min(minuteResult.remainingRequests, hourResult.remainingRequests),
      resetTime: Math.max(minuteResult.resetTime, hourResult.resetTime),
      isBlocked: false
    };
  }

  /**
   * Check typing event limit
   */
  checkTypingEvent(socketId: string): RateLimitResult {
    if (this.blockedSockets.has(socketId)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + this.config.blockDurationMs,
        isBlocked: true,
        blockReason: 'Socket blocked due to abuse'
      };
    }

    return this.checkLimit(
      this.typingBySocket,
      socketId,
      this.config.maxTypingEventsPerMinute,
      60 * 1000,
      'Typing events per minute'
    );
  }

  /**
   * Check presence update limit
   */
  checkPresenceUpdate(socketId: string): RateLimitResult {
    if (this.blockedSockets.has(socketId)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + this.config.blockDurationMs,
        isBlocked: true,
        blockReason: 'Socket blocked due to abuse'
      };
    }

    return this.checkLimit(
      this.presenceBySocket,
      socketId,
      this.config.maxPresenceUpdatesPerMinute,
      60 * 1000,
      'Presence updates per minute'
    );
  }

  /**
   * Check channel join limit
   */
  checkChannelJoin(userId: string): RateLimitResult {
    if (this.blockedUsers.has(userId)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + this.config.blockDurationMs,
        isBlocked: true,
        blockReason: 'User blocked due to abuse'
      };
    }

    return this.checkLimit(
      this.channelJoinsByUser,
      userId,
      this.config.maxChannelJoinsPerHour,
      60 * 60 * 1000,
      'Channel joins per hour'
    );
  }

  /**
   * Generic rate limit check
   */
  private checkLimit(
    store: Map<string, RateLimitEntry>,
    key: string,
    maxRequests: number,
    windowMs: number,
    limitType: string
  ): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry) {
      // First request
      store.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
        warnings: 0
      });
      
      return {
        allowed: true,
        remainingRequests: maxRequests - 1,
        resetTime: now + windowMs,
        isBlocked: false
      };
    }

    // Check if window has expired
    if (now - entry.firstRequest > windowMs) {
      // Reset the window
      entry.count = 1;
      entry.firstRequest = now;
      entry.lastRequest = now;
      entry.blocked = false;
      
      return {
        allowed: true,
        remainingRequests: maxRequests - 1,
        resetTime: now + windowMs,
        isBlocked: false
      };
    }

    // Check if blocked
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: entry.blockedUntil,
        isBlocked: true,
        blockReason: `${limitType} limit exceeded`
      };
    }

    // Increment count
    entry.count++;
    entry.lastRequest = now;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      entry.blocked = true;
      entry.blockedUntil = now + this.config.blockDurationMs;
      entry.warnings++;
      
      logger.warn(`Rate limit exceeded: ${limitType}`, {
        key,
        count: entry.count,
        maxRequests,
        windowMs,
        warnings: entry.warnings
      });
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: entry.blockedUntil,
        isBlocked: true,
        blockReason: `${limitType} limit exceeded`
      };
    }

    // Issue warning if approaching limit
    if (entry.count > maxRequests * 0.8 && entry.warnings < this.config.warningThreshold) {
      entry.warnings++;
      logger.warn(`Approaching rate limit: ${limitType}`, {
        key,
        count: entry.count,
        maxRequests,
        remaining: maxRequests - entry.count
      });
    }

    return {
      allowed: true,
      remainingRequests: maxRequests - entry.count,
      resetTime: entry.firstRequest + windowMs,
      isBlocked: false
    };
  }

  /**
   * Handle rate limit violation
   */
  private handleViolation(type: 'ip' | 'user' | 'socket', identifier: string, reason: string): void {
    logger.warn(`Rate limit violation: ${reason}`, { type, identifier });
    
    switch (type) {
      case 'ip':
        this.blockedIPs.add(identifier);
        setTimeout(() => {
          this.blockedIPs.delete(identifier);
          logger.info(`IP unblocked: ${identifier}`);
        }, this.config.blockDurationMs);
        break;
        
      case 'user':
        this.blockedUsers.add(identifier);
        setTimeout(() => {
          this.blockedUsers.delete(identifier);
          logger.info(`User unblocked: ${identifier}`);
        }, this.config.blockDurationMs);
        break;
        
      case 'socket':
        this.blockedSockets.add(identifier);
        setTimeout(() => {
          this.blockedSockets.delete(identifier);
          logger.info(`Socket unblocked: ${identifier}`);
        }, this.config.blockDurationMs);
        break;
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    return {
      connectionsTracked: {
        byIP: this.connectionsByIP.size,
        byUser: this.connectionsByUser.size
      },
      messagesTracked: {
        bySocket: this.messagesBySocket.size,
        byUser: this.messagesByUser.size
      },
      eventsTracked: {
        typing: this.typingBySocket.size,
        presence: this.presenceBySocket.size,
        channelJoins: this.channelJoinsByUser.size
      },
      blocked: {
        ips: this.blockedIPs.size,
        users: this.blockedUsers.size,
        sockets: this.blockedSockets.size
      },
      config: this.config
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup function for any store
    const cleanupStore = (store: Map<string, RateLimitEntry>, windowMs: number) => {
      for (const [key, entry] of store.entries()) {
        if (now - entry.lastRequest > windowMs) {
          store.delete(key);
          cleaned++;
        }
      }
    };

    // Clean up all stores
    cleanupStore(this.connectionsByIP, this.config.connectionWindowMs);
    cleanupStore(this.connectionsByUser, this.config.connectionWindowMs);
    cleanupStore(this.messagesBySocket, 60 * 1000); // 1 minute
    cleanupStore(this.messagesByUser, 60 * 60 * 1000); // 1 hour
    cleanupStore(this.typingBySocket, 60 * 1000); // 1 minute
    cleanupStore(this.presenceBySocket, 60 * 1000); // 1 minute
    cleanupStore(this.channelJoinsByUser, 60 * 60 * 1000); // 1 hour

    if (cleaned > 0) {
      logger.info(`Rate limiter cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Manual unblock methods
   */
  unblockIP(ip: string): boolean {
    const wasBlocked = this.blockedIPs.has(ip);
    this.blockedIPs.delete(ip);
    if (wasBlocked) {
      logger.info(`Manually unblocked IP: ${ip}`);
    }
    return wasBlocked;
  }

  unblockUser(userId: string): boolean {
    const wasBlocked = this.blockedUsers.has(userId);
    this.blockedUsers.delete(userId);
    if (wasBlocked) {
      logger.info(`Manually unblocked user: ${userId}`);
    }
    return wasBlocked;
  }

  unblockSocket(socketId: string): boolean {
    const wasBlocked = this.blockedSockets.has(socketId);
    this.blockedSockets.delete(socketId);
    if (wasBlocked) {
      logger.info(`Manually unblocked socket: ${socketId}`);
    }
    return wasBlocked;
  }

  /**
   * Destroy rate limiter and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all maps
    this.connectionsByIP.clear();
    this.connectionsByUser.clear();
    this.messagesBySocket.clear();
    this.messagesByUser.clear();
    this.typingBySocket.clear();
    this.presenceBySocket.clear();
    this.channelJoinsByUser.clear();

    // Clear blocked sets
    this.blockedIPs.clear();
    this.blockedUsers.clear();
    this.blockedSockets.clear();

    logger.info('WebSocket Rate Limiter destroyed');
  }
}

// Create default configuration
export const defaultRateLimitConfig: RateLimitConfig = {
  // Connection limits
  maxConnectionsPerIP: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '10'),
  maxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '5'),
  connectionWindowMs: parseInt(process.env.WS_CONNECTION_WINDOW_MS || '60000'), // 1 minute
  
  // Message limits
  maxMessagesPerMinute: parseInt(process.env.WS_MAX_MESSAGES_PER_MINUTE || '60'),
  maxMessagesPerHour: parseInt(process.env.WS_MAX_MESSAGES_PER_HOUR || '1000'),
  messageBurstSize: parseInt(process.env.WS_MESSAGE_BURST_SIZE || '10'),
  
  // Event-specific limits
  maxTypingEventsPerMinute: parseInt(process.env.WS_MAX_TYPING_EVENTS_PER_MINUTE || '30'),
  maxPresenceUpdatesPerMinute: parseInt(process.env.WS_MAX_PRESENCE_UPDATES_PER_MINUTE || '20'),
  maxChannelJoinsPerHour: parseInt(process.env.WS_MAX_CHANNEL_JOINS_PER_HOUR || '100'),
  
  // Punishment settings
  blockDurationMs: parseInt(process.env.WS_BLOCK_DURATION_MS || '300000'), // 5 minutes
  warningThreshold: parseInt(process.env.WS_WARNING_THRESHOLD || '3')
};

export const webSocketRateLimiter = new WebSocketRateLimiter(defaultRateLimitConfig);
export default webSocketRateLimiter;

