/**
 * 🔒 Chat Rate Limiter Middleware
 * Prevents spam and DoS attacks on chat/messaging endpoints
 * 
 * Rate Limits:
 * - Messages: 20 per minute per user
 * - Channel Joins: 10 per minute per user
 * - Typing Events: 60 per minute per user (1 per second)
 * - File Uploads: 5 per minute per user
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import logger from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  points: number;      // Number of requests allowed
  duration: number;    // Time window in milliseconds
  blockDuration?: number; // How long to block after limit exceeded (ms)
}

class ChatRateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private blocked: Map<string, number> = new Map(); // userId -> unblock timestamp

  /**
   * Check if user can perform action
   */
  async consume(userId: string, config: RateLimitConfig): Promise<void> {
    const key = userId;

    // Check if user is currently blocked
    const blockUntil = this.blocked.get(key);
    if (blockUntil && Date.now() < blockUntil) {
      const remainingSeconds = Math.ceil((blockUntil - Date.now()) / 1000);
      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${remainingSeconds} seconds.`
      });
    }

    const now = Date.now();
    const entry = this.storage.get(key);

    // Initialize or reset if window expired
    if (!entry || now >= entry.resetTime) {
      this.storage.set(key, {
        count: 1,
        resetTime: now + config.duration
      });
      return;
    }

    // Check if limit exceeded
    if (entry.count >= config.points) {
      // Block user if blockDuration specified
      if (config.blockDuration) {
        this.blocked.set(key, now + config.blockDuration);
      }

      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      
      logger.warn('Rate limit exceeded', {
        userId,
        points: entry.count,
        limit: config.points,
        resetIn
      });

      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`
      });
    }

    // Increment counter
    entry.count++;
    this.storage.set(key, entry);
  }

  /**
   * Get remaining attempts for user
   */
  getRemainingAttempts(userId: string, config: RateLimitConfig): number {
    const entry = this.storage.get(userId);
    if (!entry || Date.now() >= entry.resetTime) {
      return config.points;
    }
    return Math.max(0, config.points - entry.count);
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up rate limit entries
    for (const [key, entry] of this.storage.entries()) {
      if (now >= entry.resetTime) {
        this.storage.delete(key);
      }
    }

    // Clean up blocks
    for (const [key, unblockTime] of this.blocked.entries()) {
      if (now >= unblockTime) {
        this.blocked.delete(key);
      }
    }
  }
}

// Singleton instance
const rateLimiter = new ChatRateLimiter();

// Run cleanup every minute
setInterval(() => rateLimiter.cleanup(), 60000);

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  // Chat & Messaging
  SEND_MESSAGE: {
    points: 20,           // 20 messages
    duration: 60 * 1000,  // per minute
    blockDuration: 60 * 1000, // Block for 1 minute if exceeded
  },
  JOIN_CHANNEL: {
    points: 10,           // 10 joins
    duration: 60 * 1000,  // per minute
    blockDuration: 30 * 1000, // Block for 30 seconds
  },
  TYPING_EVENT: {
    points: 60,           // 60 typing events (1 per second)
    duration: 60 * 1000,  // per minute
    blockDuration: 10 * 1000, // Block for 10 seconds
  },
  FILE_UPLOAD: {
    points: 5,            // 5 uploads
    duration: 60 * 1000,  // per minute
    blockDuration: 120 * 1000, // Block for 2 minutes
  },
  CREATE_CHANNEL: {
    points: 5,            // 5 channels
    duration: 60 * 1000,  // per minute
  },
  CREATE_DM: {
    points: 10,           // 10 DMs
    duration: 60 * 1000,  // per minute
  },
  
  // 🔒 Task Operations
  CREATE_TASK: {
    points: 20,           // 20 tasks
    duration: 60 * 1000,  // per minute
    blockDuration: 60 * 1000, // Block for 1 minute
  },
  UPDATE_TASK: {
    points: 50,           // 50 updates
    duration: 60 * 1000,  // per minute
    blockDuration: 30 * 1000, // Block for 30 seconds
  },
  DELETE_TASK: {
    points: 20,           // 20 deletions
    duration: 60 * 1000,  // per minute
    blockDuration: 60 * 1000, // Block for 1 minute
  },
  
  // 🔒 Project Operations
  CREATE_PROJECT: {
    points: 5,            // 5 projects
    duration: 60 * 1000,  // per minute
    blockDuration: 120 * 1000, // Block for 2 minutes
  },
  UPDATE_PROJECT: {
    points: 20,           // 20 updates
    duration: 60 * 1000,  // per minute
    blockDuration: 30 * 1000, // Block for 30 seconds
  },
  DELETE_PROJECT: {
    points: 5,            // 5 deletions
    duration: 60 * 1000,  // per minute
    blockDuration: 120 * 1000, // Block for 2 minutes
  },
  
  // 🔒 Team Operations
  CREATE_TEAM: {
    points: 10,           // 10 teams
    duration: 60 * 1000,  // per minute
    blockDuration: 60 * 1000, // Block for 1 minute
  },
  UPDATE_TEAM: {
    points: 30,           // 30 updates
    duration: 60 * 1000,  // per minute
  },
  
  // 🔒 Comment & Note Operations
  CREATE_COMMENT: {
    points: 30,           // 30 comments
    duration: 60 * 1000,  // per minute
    blockDuration: 30 * 1000, // Block for 30 seconds
  },
  CREATE_NOTE: {
    points: 20,           // 20 notes
    duration: 60 * 1000,  // per minute
  },
} as const;

/**
 * Middleware factory for rate limiting
 */
export function createChatRateLimitMiddleware(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    if (!userId) {
      // If no userId, user is not authenticated - let auth middleware handle it
      return next();
    }

    try {
      await rateLimiter.consume(userId, config);
      return next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: 'Rate limiting error' });
    }
  };
}

/**
 * Direct usage for programmatic rate limiting
 */
export async function checkRateLimit(userId: string, config: RateLimitConfig): Promise<void> {
  await rateLimiter.consume(userId, config);
}

/**
 * Get remaining attempts
 */
export function getRemainingAttempts(userId: string, config: RateLimitConfig): number {
  return rateLimiter.getRemainingAttempts(userId, config);
}

export default rateLimiter;

