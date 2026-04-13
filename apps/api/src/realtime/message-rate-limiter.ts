/**
 * 🔒 WebSocket Message Rate Limiter
 * 
 * Prevents abuse and DoS attacks through WebSocket message flooding.
 * Implements per-user rate limiting for different message types.
 * 
 * @epic-infrastructure: WebSocket security hardening
 */
import logger from '../utils/logger';


export interface RateLimitConfig {
  windowMs: number;
  maxMessages: number;
  banDuration?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  banned?: boolean;
}

/**
 * Rate limiter for WebSocket messages
 */
export class MessageRateLimiter {
  private userMessageCounts: Map<string, number[]> = new Map();
  private bannedUsers: Map<string, number> = new Map(); // userEmail -> unban timestamp
  
  private readonly config: Required<RateLimitConfig>;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: config.windowMs || 60000,        // 1 minute default
      maxMessages: config.maxMessages || 100,    // 100 messages/min default
      banDuration: config.banDuration || 300000, // 5 minutes ban default
    };
  }

  /**
   * Check if user can send a message
   */
  checkLimit(userEmail: string): RateLimitResult {
    const now = Date.now();

    // Check if user is banned
    const banExpiry = this.bannedUsers.get(userEmail);
    if (banExpiry && banExpiry > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: banExpiry,
        banned: true,
      };
    } else if (banExpiry) {
      // Ban expired, remove from banned list
      this.bannedUsers.delete(userEmail);
    }

    // Get user's message timestamps
    let timestamps = this.userMessageCounts.get(userEmail) || [];

    // Remove timestamps outside the window
    timestamps = timestamps.filter(timestamp => now - timestamp < this.config.windowMs);
    this.userMessageCounts.set(userEmail, timestamps);

    // Check if limit exceeded
    if (timestamps.length >= this.config.maxMessages) {
      const oldestTimestamp = Math.min(...timestamps);
      const resetAt = oldestTimestamp + this.config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        banned: false,
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxMessages - timestamps.length,
      resetAt: now + this.config.windowMs,
    };
  }

  /**
   * Record that a message was sent
   */
  recordMessage(userEmail: string): void {
    const timestamps = this.userMessageCounts.get(userEmail) || [];
    timestamps.push(Date.now());
    this.userMessageCounts.set(userEmail, timestamps);
  }

  /**
   * Ban a user temporarily for excessive messaging
   */
  banUser(userEmail: string, durationMs?: number): void {
    const banUntil = Date.now() + (durationMs || this.config.banDuration);
    this.bannedUsers.set(userEmail, banUntil);
    
    // Clear their message count
    this.userMessageCounts.delete(userEmail);
    
    logger.warn(`🚫 User ${userEmail} temporarily banned until ${new Date(banUntil).toISOString()}`);
  }

  /**
   * Unban a user
   */
  unbanUser(userEmail: string): void {
    this.bannedUsers.delete(userEmail);
    logger.debug(`✅ User ${userEmail} unbanned`);
  }

  /**
   * Check if user is currently banned
   */
  isBanned(userEmail: string): boolean {
    const banExpiry = this.bannedUsers.get(userEmail);
    if (!banExpiry) return false;
    
    const now = Date.now();
    if (banExpiry < now) {
      this.bannedUsers.delete(userEmail);
      return false;
    }
    
    return true;
  }

  /**
   * Get remaining time until rate limit resets
   */
  getResetTime(userEmail: string): number | null {
    const timestamps = this.userMessageCounts.get(userEmail);
    if (!timestamps || timestamps.length === 0) return null;

    const oldestTimestamp = Math.min(...timestamps);
    const resetTime = oldestTimestamp + this.config.windowMs;
    const now = Date.now();

    return resetTime > now ? resetTime - now : null;
  }

  /**
   * Get statistics for monitoring
   */
  getStats() {
    return {
      activeUsers: this.userMessageCounts.size,
      bannedUsers: this.bannedUsers.size,
      totalTrackedMessages: Array.from(this.userMessageCounts.values())
        .reduce((sum, timestamps) => sum + timestamps.length, 0),
    };
  }

  /**
   * Cleanup old data (run periodically)
   */
  cleanup(): void {
    const now = Date.now();

    // Remove expired message timestamps
    for (const [userEmail, timestamps] of this.userMessageCounts.entries()) {
      const validTimestamps = timestamps.filter(
        timestamp => now - timestamp < this.config.windowMs
      );
      
      if (validTimestamps.length === 0) {
        this.userMessageCounts.delete(userEmail);
      } else {
        this.userMessageCounts.set(userEmail, validTimestamps);
      }
    }

    // Remove expired bans
    for (const [userEmail, banExpiry] of this.bannedUsers.entries()) {
      if (banExpiry < now) {
        this.bannedUsers.delete(userEmail);
      }
    }
  }
}

/**
 * Create rate limiters for different message types
 */
export class WebSocketRateLimitManager {
  private chatLimiter: MessageRateLimiter;
  private typingLimiter: MessageRateLimiter;
  private presenceLimiter: MessageRateLimiter;
  
  constructor() {
    // Chat messages: 100 per minute
    this.chatLimiter = new MessageRateLimiter({
      windowMs: 60000,
      maxMessages: 100,
      banDuration: 300000, // 5 minute ban
    });

    // Typing indicators: 30 per minute (prevent spam)
    this.typingLimiter = new MessageRateLimiter({
      windowMs: 60000,
      maxMessages: 30,
      banDuration: 60000, // 1 minute ban
    });

    // Presence updates: 60 per minute
    this.presenceLimiter = new MessageRateLimiter({
      windowMs: 60000,
      maxMessages: 60,
      banDuration: 120000, // 2 minute ban
    });

    // Cleanup old data every 5 minutes
    setInterval(() => {
      this.chatLimiter.cleanup();
      this.typingLimiter.cleanup();
      this.presenceLimiter.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check rate limit for chat messages
   */
  checkChatLimit(userEmail: string): RateLimitResult {
    return this.chatLimiter.checkLimit(userEmail);
  }

  /**
   * Record chat message sent
   */
  recordChatMessage(userEmail: string): void {
    this.chatLimiter.recordMessage(userEmail);
  }

  /**
   * Check rate limit for typing indicators
   */
  checkTypingLimit(userEmail: string): RateLimitResult {
    return this.typingLimiter.checkLimit(userEmail);
  }

  /**
   * Record typing indicator sent
   */
  recordTyping(userEmail: string): void {
    this.typingLimiter.recordMessage(userEmail);
  }

  /**
   * Check rate limit for presence updates
   */
  checkPresenceLimit(userEmail: string): RateLimitResult {
    return this.presenceLimiter.checkLimit(userEmail);
  }

  /**
   * Record presence update sent
   */
  recordPresence(userEmail: string): void {
    this.presenceLimiter.recordMessage(userEmail);
  }

  /**
   * Ban user from all WebSocket communication
   */
  banUser(userEmail: string, durationMs?: number): void {
    this.chatLimiter.banUser(userEmail, durationMs);
    this.typingLimiter.banUser(userEmail, durationMs);
    this.presenceLimiter.banUser(userEmail, durationMs);
  }

  /**
   * Unban user
   */
  unbanUser(userEmail: string): void {
    this.chatLimiter.unbanUser(userEmail);
    this.typingLimiter.unbanUser(userEmail);
    this.presenceLimiter.unbanUser(userEmail);
  }

  /**
   * Check if user is banned
   */
  isBanned(userEmail: string): boolean {
    return this.chatLimiter.isBanned(userEmail);
  }

  /**
   * Get overall statistics
   */
  getStats() {
    return {
      chat: this.chatLimiter.getStats(),
      typing: this.typingLimiter.getStats(),
      presence: this.presenceLimiter.getStats(),
    };
  }
}


