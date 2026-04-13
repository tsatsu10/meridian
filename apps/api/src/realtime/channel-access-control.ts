/**
 * 🔐 Channel Access Control System
 * Comprehensive authorization system for WebSocket channels and rooms
 */

import { logger } from '../utils/logger';
import { getDatabase } from "../database/connection";
import {
  channelTable,
  channelMembershipTable,
  workspaceUserTable,
  userTable,
  directMessageConversationsTable,
  roleAssignmentTable
} from '../database/schema';
import { eq, and, or } from 'drizzle-orm';

// Lazy database getter to avoid initialization issues
const getDb = () => getDatabase();

export interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  permissions?: string[];
  channelInfo?: {
    id: string;
    name: string;
    type: string;
    workspaceId: string;
  };
}

export interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canModerate: boolean;
  canManageMembers: boolean;
  canManageChannel: boolean;
  canDelete: boolean;
}

export class ChannelAccessControl {
  private permissionCache = new Map<string, { permissions: UserPermissions; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if user has access to a channel
   */
  async checkChannelAccess(
    userEmail: string, 
    channelId: string, 
    requiredPermission: keyof UserPermissions = 'canRead'
  ): Promise<AccessControlResult> {
    try {
      // Get user permissions for channel
      const permissions = await this.getUserChannelPermissions(userEmail, channelId);
      
      if (!permissions) {
        return {
          allowed: false,
          reason: 'Channel not found or user has no access'
        };
      }

      const hasPermission = permissions[requiredPermission];
      
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Insufficient permissions: ${requiredPermission} required`,
          permissions: Object.keys(permissions).filter(key => permissions[key as keyof UserPermissions])
        };
      }

      // Get channel info
      const channelInfo = await this.getChannelInfo(channelId);
      
      return {
        allowed: true,
        permissions: Object.keys(permissions).filter(key => permissions[key as keyof UserPermissions]),
        channelInfo
      };
      
    } catch (error) {
      logger.error('Channel access check failed', {
        userEmail,
        channelId,
        requiredPermission,
        error: error instanceof Error ? error.message : error
      });
      
      return {
        allowed: false,
        reason: 'Access check failed due to system error'
      };
    }
  }

  /**
   * Check if user has access to direct message conversation
   */
  async checkDirectMessageAccess(
    userEmail: string,
    conversationId: string
  ): Promise<AccessControlResult> {
    try {
      // Check if user is a participant in the conversation
      const conversation = await getDb()
        .select()
        .from(directMessageConversationsTable)
        .where(
          and(
            eq(directMessageConversationsTable.id, conversationId),
            or(
              eq(directMessageConversationsTable.participant1Email, userEmail),
              eq(directMessageConversationsTable.participant2Email, userEmail)
            )
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        return {
          allowed: false,
          reason: 'Direct message conversation not found or access denied'
        };
      }

      return {
        allowed: true,
        permissions: ['canRead', 'canWrite'],
        channelInfo: {
          id: conversationId,
          name: 'Direct Message',
          type: 'direct_message',
          workspaceId: conversation[0].workspaceId
        }
      };
      
    } catch (error) {
      logger.error('Direct message access check failed', {
        userEmail,
        conversationId,
        error: error instanceof Error ? error.message : error
      });
      
      return {
        allowed: false,
        reason: 'Access check failed due to system error'
      };
    }
  }

  /**
   * Check workspace access
   */
  async checkWorkspaceAccess(
    userEmail: string,
    workspaceId: string
  ): Promise<AccessControlResult> {
    try {
      // Check if user is a member of the workspace
      const membership = await getDb()
        .select({
          role: workspaceUserTable.role,
          status: workspaceUserTable.status
        })
        .from(workspaceUserTable)
        .where(
          and(
            eq(workspaceUserTable.userEmail, userEmail),
            eq(workspaceUserTable.workspaceId, workspaceId)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return {
          allowed: false,
          reason: 'User is not a member of this workspace'
        };
      }

      const member = membership[0];
      
      if (member.status !== 'active') {
        return {
          allowed: false,
          reason: `Workspace membership is ${member.status}`
        };
      }

      return {
        allowed: true,
        permissions: this.getWorkspacePermissions(member.role),
        channelInfo: {
          id: workspaceId,
          name: 'Workspace',
          type: 'workspace',
          workspaceId
        }
      };
      
    } catch (error) {
      logger.error('Workspace access check failed', {
        userEmail,
        workspaceId,
        error: error instanceof Error ? error.message : error
      });
      
      return {
        allowed: false,
        reason: 'Access check failed due to system error'
      };
    }
  }

  /**
   * Get user permissions for a specific channel
   */
  private async getUserChannelPermissions(
    userEmail: string,
    channelId: string
  ): Promise<UserPermissions | null> {
    // Check cache first
    const cacheKey = `${userEmail}:${channelId}`;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    try {
      // Get channel information
      const channelResult = await getDb()
        .select({
          id: channelTable.id,
          name: channelTable.name,
          type: channelTable.type,
          workspaceId: channelTable.workspaceId,
          isPrivate: channelTable.isPrivate,
          createdBy: channelTable.createdBy
        })
        .from(channelTable)
        .where(eq(channelTable.id, channelId))
        .limit(1);

      if (channelResult.length === 0) {
        return null; // Channel not found
      }

      const channel = channelResult[0];

      // Check workspace membership first
      const workspaceAccess = await this.checkWorkspaceAccess(userEmail, channel.workspaceId);
      if (!workspaceAccess.allowed) {
        return null; // User not in workspace
      }

      // For public channels, workspace members have read access by default
      if (!channel.isPrivate) {
        const permissions: UserPermissions = {
          canRead: true,
          canWrite: true,
          canModerate: false,
          canManageMembers: false,
          canManageChannel: channel.createdBy === userEmail,
          canDelete: channel.createdBy === userEmail
        };

        // Check if user has elevated permissions
        await this.enhancePermissionsWithRoles(permissions, userEmail, channel.workspaceId);
        
        // Cache the permissions
        this.permissionCache.set(cacheKey, {
          permissions,
          expiresAt: Date.now() + this.CACHE_TTL
        });
        
        return permissions;
      }

      // For private channels, check explicit membership
      const membership = await getDb()
        .select({
          role: channelMembershipTable.role,
          // Note: permissions field doesn't exist - derive from role instead
        })
        .from(channelMembershipTable)
        .where(
          and(
            eq(channelMembershipTable.channelId, channelId),
            eq(channelMembershipTable.userEmail, userEmail)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return null; // User not a member of private channel
      }

      const member = membership[0];
      const permissions = this.parseChannelPermissions(member.role);
      
      // Enhance with workspace-level roles
      await this.enhancePermissionsWithRoles(permissions, userEmail, channel.workspaceId);
      
      // Cache the permissions
      this.permissionCache.set(cacheKey, {
        permissions,
        expiresAt: Date.now() + this.CACHE_TTL
      });
      
      return permissions;
      
    } catch (error) {
      logger.error('Failed to get channel permissions', {
        userEmail,
        channelId,
        error: error instanceof Error ? error.message : error
      });
      return null;
    }
  }

  /**
   * Parse channel permissions from role (custom permissions not supported in current schema)
   */
  private parseChannelPermissions(role: string): UserPermissions {
    // Base permissions by role
    const rolePermissions: Record<string, UserPermissions> = {
      'member': {
        canRead: true,
        canWrite: true,
        canModerate: false,
        canManageMembers: false,
        canManageChannel: false,
        canDelete: false
      },
      'moderator': {
        canRead: true,
        canWrite: true,
        canModerate: true,
        canManageMembers: true,
        canManageChannel: false,
        canDelete: false
      },
      'admin': {
        canRead: true,
        canWrite: true,
        canModerate: true,
        canManageMembers: true,
        canManageChannel: true,
        canDelete: true
      },
      'owner': {
        canRead: true,
        canWrite: true,
        canModerate: true,
        canManageMembers: true,
        canManageChannel: true,
        canDelete: true
      }
    };

    let permissions = rolePermissions[role] || rolePermissions['member'];

    // Apply custom permissions if provided
    if (customPermissions) {
      try {
        const custom = JSON.parse(customPermissions);
        permissions = { ...permissions, ...custom };
      } catch (error) {
        logger.warn('Failed to parse custom permissions', { customPermissions, error });
      }
    }

    return permissions;
  }

  /**
   * Enhance permissions with workspace-level roles
   */
  private async enhancePermissionsWithRoles(
    permissions: UserPermissions,
    userEmail: string,
    workspaceId: string
  ): Promise<void> {
    try {
      // Get workspace role
      const workspaceMembership = await getDb()
        .select({ role: workspaceUserTable.role })
        .from(workspaceUserTable)
        .where(
          and(
            eq(workspaceUserTable.userEmail, userEmail),
            eq(workspaceUserTable.workspaceId, workspaceId)
          )
        )
        .limit(1);

      if (workspaceMembership.length > 0) {
        const workspaceRole = workspaceMembership[0].role;
        
        // Workspace admins and owners get elevated permissions
        if (workspaceRole === 'admin' || workspaceRole === 'owner') {
          permissions.canModerate = true;
          permissions.canManageMembers = true;
          permissions.canManageChannel = true;
        }
        
        if (workspaceRole === 'owner') {
          permissions.canDelete = true;
        }
      }
      
    } catch (error) {
      logger.error('Failed to enhance permissions with workspace roles', {
        userEmail,
        workspaceId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Get workspace permissions based on role
   */
  private getWorkspacePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'member': ['canRead', 'canWrite'],
      'moderator': ['canRead', 'canWrite', 'canModerate'],
      'admin': ['canRead', 'canWrite', 'canModerate', 'canManageMembers', 'canManageChannel'],
      'owner': ['canRead', 'canWrite', 'canModerate', 'canManageMembers', 'canManageChannel', 'canDelete']
    };

    return rolePermissions[role] || rolePermissions['member'];
  }

  /**
   * Get channel information
   */
  private async getChannelInfo(channelId: string) {
    try {
      const channel = await getDb()
        .select({
          id: channelTable.id,
          name: channelTable.name,
          type: channelTable.type,
          workspaceId: channelTable.workspaceId
        })
        .from(channelTable)
        .where(eq(channelTable.id, channelId))
        .limit(1);

      return channel.length > 0 ? channel[0] : undefined;
    } catch (error) {
      logger.error('Failed to get channel info', { channelId, error });
      return undefined;
    }
  }

  /**
   * Clear permission cache for user
   */
  clearUserCache(userEmail: string): void {
    for (const [key] of this.permissionCache.entries()) {
      if (key.startsWith(`${userEmail}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Clear permission cache for channel
   */
  clearChannelCache(channelId: string): void {
    for (const [key] of this.permissionCache.entries()) {
      if (key.endsWith(`:${channelId}`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    logger.info('Channel access control cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [, cache] of this.permissionCache.entries()) {
      if (cache.expiresAt <= now) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.permissionCache.size,
      active,
      expired,
      cacheTTL: this.CACHE_TTL
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cache] of this.permissionCache.entries()) {
      if (cache.expiresAt <= now) {
        this.permissionCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired permission cache entries`);
    }

    return cleaned;
  }
}

// Export singleton instance
export const channelAccessControl = new ChannelAccessControl();

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  channelAccessControl.cleanupExpiredCache();
}, 10 * 60 * 1000);

export default channelAccessControl;

