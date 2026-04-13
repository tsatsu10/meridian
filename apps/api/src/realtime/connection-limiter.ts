/**
 * 🔒 WebSocket Connection Limiter
 * Advanced connection management with per-user and per-IP limits
 */

import { logger } from '../utils/logger';

export interface ConnectionLimits {
  maxConnectionsPerUser: number;
  maxConnectionsPerIP: number;
  maxConnectionsPerWorkspace: number;
  connectionTimeoutMs: number;
  graceConnectionsForPremium: number;
  blockDurationMs: number;
}

export interface ConnectionInfo {
  socketId: string;
  userEmail: string;
  workspaceId: string;
  ipAddress: string;
  userAgent: string;
  connectedAt: Date;
  lastActivity: Date;
  isPremium: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentConnections: number;
  maxAllowed: number;
  timeUntilSlotAvailable?: number;
}

export class ConnectionLimiter {
  private connections = new Map<string, ConnectionInfo>();
  private connectionsByUser = new Map<string, Set<string>>();
  private connectionsByIP = new Map<string, Set<string>>();
  private connectionsByWorkspace = new Map<string, Set<string>>();
  private blockedIPs = new Map<string, number>(); // IP -> blocked until timestamp
  private blockedUsers = new Map<string, number>(); // userEmail -> blocked until timestamp
  private limits: ConnectionLimits;

  constructor(limits: ConnectionLimits) {
    this.limits = limits;
    
    // Clean up expired connections every 5 minutes
    setInterval(() => {
      this.cleanupExpiredConnections();
    }, 5 * 60 * 1000);

    // Clean up expired blocks every minute
    setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 60 * 1000);

    logger.info('Connection Limiter initialized', {
      maxConnectionsPerUser: limits.maxConnectionsPerUser,
      maxConnectionsPerIP: limits.maxConnectionsPerIP,
      maxConnectionsPerWorkspace: limits.maxConnectionsPerWorkspace
    });
  }

  /**
   * Check if new connection is allowed
   */
  checkConnectionAllowed(
    userEmail: string,
    ipAddress: string,
    workspaceId: string,
    isPremium: boolean = false
  ): LimitCheckResult {
    const now = Date.now();

    // Check if IP is blocked
    const ipBlockedUntil = this.blockedIPs.get(ipAddress);
    if (ipBlockedUntil && now < ipBlockedUntil) {
      return {
        allowed: false,
        reason: 'IP address temporarily blocked due to too many connection attempts',
        currentConnections: 0,
        maxAllowed: 0,
        timeUntilSlotAvailable: ipBlockedUntil - now
      };
    }

    // Check if user is blocked
    const userBlockedUntil = this.blockedUsers.get(userEmail);
    if (userBlockedUntil && now < userBlockedUntil) {
      return {
        allowed: false,
        reason: 'User temporarily blocked due to too many connection attempts',
        currentConnections: 0,
        maxAllowed: 0,
        timeUntilSlotAvailable: userBlockedUntil - now
      };
    }

    // Check per-user limit
    const userConnections = this.connectionsByUser.get(userEmail) || new Set();
    const maxUserConnections = isPremium 
      ? this.limits.maxConnectionsPerUser + this.limits.graceConnectionsForPremium
      : this.limits.maxConnectionsPerUser;

    if (userConnections.size >= maxUserConnections) {
      // Check if any connections are stale and can be cleaned up
      const staleConnections = this.findStaleConnectionsForUser(userEmail);
      if (staleConnections.length > 0) {
        logger.info(`Cleaning up ${staleConnections.length} stale connections for user ${userEmail}`);
        staleConnections.forEach(socketId => this.removeConnection(socketId));
      }

      // Recheck after cleanup
      const updatedUserConnections = this.connectionsByUser.get(userEmail) || new Set();
      if (updatedUserConnections.size >= maxUserConnections) {
        return {
          allowed: false,
          reason: `Maximum connections per user exceeded (${updatedUserConnections.size}/${maxUserConnections})`,
          currentConnections: updatedUserConnections.size,
          maxAllowed: maxUserConnections
        };
      }
    }

    // Check per-IP limit
    const ipConnections = this.connectionsByIP.get(ipAddress) || new Set();
    if (ipConnections.size >= this.limits.maxConnectionsPerIP) {
      // Potentially block the IP if it keeps hitting the limit
      this.handleIPLimitExceeded(ipAddress);
      
      return {
        allowed: false,
        reason: `Maximum connections per IP exceeded (${ipConnections.size}/${this.limits.maxConnectionsPerIP})`,
        currentConnections: ipConnections.size,
        maxAllowed: this.limits.maxConnectionsPerIP
      };
    }

    // Check per-workspace limit
    const workspaceConnections = this.connectionsByWorkspace.get(workspaceId) || new Set();
    if (workspaceConnections.size >= this.limits.maxConnectionsPerWorkspace) {
      return {
        allowed: false,
        reason: `Maximum connections per workspace exceeded (${workspaceConnections.size}/${this.limits.maxConnectionsPerWorkspace})`,
        currentConnections: workspaceConnections.size,
        maxAllowed: this.limits.maxConnectionsPerWorkspace
      };
    }

    return {
      allowed: true,
      currentConnections: userConnections.size,
      maxAllowed: maxUserConnections
    };
  }

  /**
   * Register a new connection
   */
  addConnection(connectionInfo: ConnectionInfo): void {
    const { socketId, userEmail, workspaceId, ipAddress } = connectionInfo;

    // Store connection info
    this.connections.set(socketId, connectionInfo);

    // Update user connections
    if (!this.connectionsByUser.has(userEmail)) {
      this.connectionsByUser.set(userEmail, new Set());
    }
    this.connectionsByUser.get(userEmail)!.add(socketId);

    // Update IP connections
    if (!this.connectionsByIP.has(ipAddress)) {
      this.connectionsByIP.set(ipAddress, new Set());
    }
    this.connectionsByIP.get(ipAddress)!.add(socketId);

    // Update workspace connections
    if (!this.connectionsByWorkspace.has(workspaceId)) {
      this.connectionsByWorkspace.set(workspaceId, new Set());
    }
    this.connectionsByWorkspace.get(workspaceId)!.add(socketId);

    logger.info('Connection registered', {
      socketId,
      userEmail,
      ipAddress,
      workspaceId,
      totalConnections: this.connections.size,
      userConnections: this.connectionsByUser.get(userEmail)!.size,
      ipConnections: this.connectionsByIP.get(ipAddress)!.size
    });
  }

  /**
   * Remove a connection
   */
  removeConnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return;
    }

    const { userEmail, workspaceId, ipAddress } = connection;

    // Remove from main storage
    this.connections.delete(socketId);

    // Remove from user connections
    const userConnections = this.connectionsByUser.get(userEmail);
    if (userConnections) {
      userConnections.delete(socketId);
      if (userConnections.size === 0) {
        this.connectionsByUser.delete(userEmail);
      }
    }

    // Remove from IP connections
    const ipConnections = this.connectionsByIP.get(ipAddress);
    if (ipConnections) {
      ipConnections.delete(socketId);
      if (ipConnections.size === 0) {
        this.connectionsByIP.delete(ipAddress);
      }
    }

    // Remove from workspace connections
    const workspaceConnections = this.connectionsByWorkspace.get(workspaceId);
    if (workspaceConnections) {
      workspaceConnections.delete(socketId);
      if (workspaceConnections.size === 0) {
        this.connectionsByWorkspace.delete(workspaceId);
      }
    }

    logger.info('Connection removed', {
      socketId,
      userEmail,
      ipAddress,
      workspaceId,
      totalConnections: this.connections.size
    });
  }

  /**
   * Update connection activity
   */
  updateActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Find stale connections for a user
   */
  private findStaleConnectionsForUser(userEmail: string): string[] {
    const userConnections = this.connectionsByUser.get(userEmail) || new Set();
    const staleConnections: string[] = [];
    const staleThreshold = Date.now() - this.limits.connectionTimeoutMs;

    for (const socketId of userConnections) {
      const connection = this.connections.get(socketId);
      if (connection && connection.lastActivity.getTime() < staleThreshold) {
        staleConnections.push(socketId);
      }
    }

    return staleConnections;
  }

  /**
   * Handle IP limit exceeded - implement progressive blocking
   */
  private handleIPLimitExceeded(ipAddress: string): void {
    const blockUntil = Date.now() + this.limits.blockDurationMs;
    this.blockedIPs.set(ipAddress, blockUntil);
    
    logger.warn('IP temporarily blocked due to connection limit', {
      ipAddress,
      blockDurationMs: this.limits.blockDurationMs,
      blockedUntil: new Date(blockUntil).toISOString()
    });
  }

  /**
   * Clean up expired connections
   */
  private cleanupExpiredConnections(): void {
    const now = Date.now();
    const staleThreshold = now - this.limits.connectionTimeoutMs;
    const expiredConnections: string[] = [];

    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.lastActivity.getTime() < staleThreshold) {
        expiredConnections.push(socketId);
      }
    }

    for (const socketId of expiredConnections) {
      this.removeConnection(socketId);
    }

    if (expiredConnections.length > 0) {
      logger.info(`Cleaned up ${expiredConnections.length} expired connections`);
    }
  }

  /**
   * Clean up expired blocks
   */
  private cleanupExpiredBlocks(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean up IP blocks
    for (const [ip, blockedUntil] of this.blockedIPs.entries()) {
      if (now >= blockedUntil) {
        this.blockedIPs.delete(ip);
        cleanedCount++;
        logger.info(`IP unblocked: ${ip}`);
      }
    }

    // Clean up user blocks
    for (const [userEmail, blockedUntil] of this.blockedUsers.entries()) {
      if (now >= blockedUntil) {
        this.blockedUsers.delete(userEmail);
        cleanedCount++;
        logger.info(`User unblocked: ${userEmail}`);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired blocks`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const totalConnections = this.connections.size;
    const uniqueUsers = this.connectionsByUser.size;
    const uniqueIPs = this.connectionsByIP.size;
    const uniqueWorkspaces = this.connectionsByWorkspace.size;

    // Calculate average connections per user
    let totalUserConnections = 0;
    for (const connections of this.connectionsByUser.values()) {
      totalUserConnections += connections.size;
    }
    const avgConnectionsPerUser = uniqueUsers > 0 ? totalUserConnections / uniqueUsers : 0;

    return {
      totalConnections,
      uniqueUsers,
      uniqueIPs,
      uniqueWorkspaces,
      avgConnectionsPerUser: Math.round(avgConnectionsPerUser * 100) / 100,
      blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size,
      limits: this.limits
    };
  }

  /**
   * Get connections for a user
   */
  getUserConnections(userEmail: string): ConnectionInfo[] {
    const socketIds = this.connectionsByUser.get(userEmail) || new Set();
    const connections: ConnectionInfo[] = [];

    for (const socketId of socketIds) {
      const connection = this.connections.get(socketId);
      if (connection) {
        connections.push(connection);
      }
    }

    return connections;
  }

  /**
   * Force disconnect user connections
   */
  disconnectUser(userEmail: string): number {
    const connections = this.getUserConnections(userEmail);
    connections.forEach(connection => {
      this.removeConnection(connection.socketId);
    });
    
    logger.info(`Force disconnected ${connections.length} connections for user: ${userEmail}`);
    return connections.length;
  }

  /**
   * Temporarily block a user
   */
  blockUser(userEmail: string, durationMs?: number): void {
    const blockUntil = Date.now() + (durationMs || this.limits.blockDurationMs);
    this.blockedUsers.set(userEmail, blockUntil);
    
    // Disconnect existing connections
    this.disconnectUser(userEmail);
    
    logger.warn('User temporarily blocked', {
      userEmail,
      blockDurationMs: durationMs || this.limits.blockDurationMs,
      blockedUntil: new Date(blockUntil).toISOString()
    });
  }

  /**
   * Update connection limits
   */
  updateLimits(newLimits: Partial<ConnectionLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    logger.info('Connection limits updated', this.limits);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.connections.clear();
    this.connectionsByUser.clear();
    this.connectionsByIP.clear();
    this.connectionsByWorkspace.clear();
    this.blockedIPs.clear();
    this.blockedUsers.clear();
    
    logger.info('Connection limiter cleaned up');
  }
}

// Default configuration
const defaultLimits: ConnectionLimits = {
  maxConnectionsPerUser: parseInt(process.env.MAX_CONNECTIONS_PER_USER || '5'),
  maxConnectionsPerIP: parseInt(process.env.MAX_CONNECTIONS_PER_IP || '20'),
  maxConnectionsPerWorkspace: parseInt(process.env.MAX_CONNECTIONS_PER_WORKSPACE || '1000'),
  connectionTimeoutMs: parseInt(process.env.CONNECTION_TIMEOUT_MS || '300000'), // 5 minutes
  graceConnectionsForPremium: parseInt(process.env.GRACE_CONNECTIONS_PREMIUM || '3'),
  blockDurationMs: parseInt(process.env.CONNECTION_BLOCK_DURATION_MS || '300000') // 5 minutes
};

export const connectionLimiter = new ConnectionLimiter(defaultLimits);
export default connectionLimiter;

