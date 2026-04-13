// @epic-3.6-communication: Typing indicators and presence system controller
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../database/connection";
import { userPresenceTable, 
  channelTable, 
  channelMembershipTable,
  userTable } from "../../database/schema";
import logger from '../../utils/logger';
import { createId } from "@paralleldrive/cuid2";
import UnifiedWebSocketServer from "../../realtime/unified-websocket-server";

// Validation schemas
export const updatePresenceSchema = z.object({
  channelId: z.string().optional(),
  status: z.enum(["online", "away", "busy", "offline"]).default("online"),
  isTyping: z.boolean().default(false),
  deviceInfo: z.object({
    browser: z.string().optional(),
    platform: z.string().optional(),
    userAgent: z.string().optional(),
  }).optional(),
});

export const typingIndicatorSchema = z.object({
  channelId: z.string(),
  isTyping: z.boolean(),
});

// Update user presence status
export async function updateUserPresence(
  userEmail: string, 
  presenceData: z.infer<typeof updatePresenceSchema>,
  connectionId?: string
) {
  try {
    const db = getDatabase();
    const now = new Date();
    
    // Check if presence record exists for this user/channel combination
    let whereClause = eq(userPresenceTable.userEmail, userEmail);
    if (presenceData.channelId) {
      whereClause = and(
        eq(userPresenceTable.userEmail, userEmail),
        eq(userPresenceTable.channelId, presenceData.channelId)
      );
    }

    const [existingPresence] = await db
      .select()
      .from(userPresenceTable)
      .where(whereClause)
      .limit(1);

    const presenceRecord = {
      userEmail,
      channelId: presenceData.channelId || null,
      status: presenceData.status,
      isTyping: presenceData.isTyping,
      typingAt: presenceData.isTyping ? now : null,
      lastActiveAt: now,
      connectionId: connectionId || null,
      deviceInfo: presenceData.deviceInfo ? JSON.stringify(presenceData.deviceInfo) : null,
      updatedAt: now,
    };

    if (existingPresence) {
      // Update existing presence
      await db
        .update(userPresenceTable)
        .set(presenceRecord)
        .where(eq(userPresenceTable.id, existingPresence.id));
    } else {
      // Create new presence record
      await db
        .insert(userPresenceTable)
        .values({
          id: createId(),
          ...presenceRecord,
        });
    }

    // Get user info for WebSocket emission
    const [user] = await db
      .select({
        name: userTable.name,
        avatarUrl: userTable.avatarUrl,
      })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    // Emit WebSocket event for real-time presence updates
    const presenceUpdate = {
      userEmail,
      userName: user?.name || "Unknown User",
      userAvatar: user?.avatarUrl || null,
      status: presenceData.status,
      isTyping: presenceData.isTyping,
      channelId: presenceData.channelId,
      lastActiveAt: now.toISOString(),
    };

    if (presenceData.channelId) {
      // Broadcast to specific channel
      try {
        await unifiedWebSocketService.broadcastToChannel(presenceData.channelId, {
          type: "presence:user_status_changed",
          data: presenceUpdate,
        });
      } catch (wsError) {
        logger.error("Error emitting channel presence:", wsError);
      }
    } else {
      // Broadcast to all user's channels
      try {
        await unifiedWebSocketService.sendToUser(userEmail, {
          type: "presence:status_updated",
          data: presenceUpdate,
        });
      } catch (wsError) {
        logger.error("Error emitting user presence:", wsError);
      }
    }

    return { success: true, presence: presenceUpdate };
  } catch (error) {
    logger.error("Error updating user presence:", error);
    throw new Error("Failed to update user presence");
  }
}

// Set typing indicator for a channel
export async function setTypingIndicator(
  userEmail: string, 
  channelId: string, 
  isTyping: boolean,
  connectionId?: string
) {
  try {
    const db = getDatabase();
    const now = new Date();
    
    // Update or create presence record with typing status
    await updateUserPresence(
      userEmail, 
      { 
        channelId, 
        isTyping, 
        status: "online" // Assume online when typing
      },
      connectionId
    );

    if (isTyping) {
      // Schedule automatic typing stop after 3 seconds
      setTimeout(async () => {
        try {
          await setTypingIndicator(userEmail, channelId, false, connectionId);
        } catch (error) {
          logger.error("Error auto-stopping typing indicator:", error);
        }
      }, 3000);
    }

    // Get user info for better UX
    const [user] = await db
      .select({
        name: userTable.name,
        avatarUrl: userTable.avatarUrl,
      })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    // Emit typing indicator WebSocket event
    try {
      await unifiedWebSocketService.broadcastToChannelExcept(channelId, userEmail, {
        type: isTyping ? "typing:started" : "typing:stopped",
        data: {
          userEmail,
          userName: user?.name || "Unknown User",
          userAvatar: user?.avatarUrl || null,
          channelId,
          timestamp: now.toISOString(),
        },
      });
    } catch (wsError) {
      logger.error("Error emitting typing indicator:", wsError);
    }

    return { success: true, isTyping };
  } catch (error) {
    logger.error("Error setting typing indicator:", error);
    throw new Error("Failed to set typing indicator");
  }
}

// Get online users in a channel
export async function getChannelPresence(channelId: string) {
  try {
    const db = getDatabase();
    // Get users who have been active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const presenceList = await db
      .select({
        userEmail: userPresenceTable.userEmail,
        status: userPresenceTable.status,
        isTyping: userPresenceTable.isTyping,
        lastActiveAt: userPresenceTable.lastActiveAt,
        userName: userTable.name,
        userAvatar: userTable.avatarUrl,
      })
      .from(userPresenceTable)
      .leftJoin(userTable, eq(userPresenceTable.userEmail, userTable.email))
      .where(
        and(
          eq(userPresenceTable.channelId, channelId),
          gte(userPresenceTable.lastActiveAt, fiveMinutesAgo),
          // Only show users who are not offline
          userPresenceTable.status !== "offline"
        )
      );

    // Group by status for easier consumption
    const presenceSummary = {
      online: presenceList.filter(p => p.status === "online"),
      away: presenceList.filter(p => p.status === "away"),
      busy: presenceList.filter(p => p.status === "busy"),
      typing: presenceList.filter(p => p.isTyping),
      total: presenceList.length,
    };

    return {
      channelId,
      presence: presenceList,
      summary: presenceSummary,
    };
  } catch (error) {
    logger.error("Error getting channel presence:", error);
    throw new Error("Failed to get channel presence");
  }
}

// Get typing users in a channel
export async function getTypingUsers(channelId: string) {
  try {
    const db = getDatabase();
    // Get users who are currently typing (within last 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    
    const typingUsers = await db
      .select({
        userEmail: userPresenceTable.userEmail,
        userName: userTable.name,
        userAvatar: userTable.avatarUrl,
        typingAt: userPresenceTable.typingAt,
      })
      .from(userPresenceTable)
      .leftJoin(userTable, eq(userPresenceTable.userEmail, userTable.email))
      .where(
        and(
          eq(userPresenceTable.channelId, channelId),
          eq(userPresenceTable.isTyping, true),
          gte(userPresenceTable.typingAt, tenSecondsAgo)
        )
      );

    return {
      channelId,
      typingUsers,
      count: typingUsers.length,
    };
  } catch (error) {
    logger.error("Error getting typing users:", error);
    throw new Error("Failed to get typing users");
  }
}

// Get user's global presence across all channels
export async function getUserGlobalPresence(userEmail: string) {
  try {
    const db = getDatabase();
    const userPresence = await db
      .select({
        channelId: userPresenceTable.channelId,
        status: userPresenceTable.status,
        isTyping: userPresenceTable.isTyping,
        lastActiveAt: userPresenceTable.lastActiveAt,
        channelName: channelTable.name,
      })
      .from(userPresenceTable)
      .leftJoin(channelTable, eq(userPresenceTable.channelId, channelTable.id))
      .where(eq(userPresenceTable.userEmail, userEmail));

    // Determine overall status (most active)
    const statuses = userPresence.map(p => p.status);
    let overallStatus = "offline";
    if (statuses.includes("online")) overallStatus = "online";
    else if (statuses.includes("busy")) overallStatus = "busy";
    else if (statuses.includes("away")) overallStatus = "away";

    return {
      userEmail,
      overallStatus,
      channels: userPresence,
      isTypingAnywhere: userPresence.some(p => p.isTyping),
    };
  } catch (error) {
    logger.error("Error getting user global presence:", error);
    throw new Error("Failed to get user global presence");
  }
}

// Mark user as offline (when disconnecting)
export async function markUserOffline(userEmail: string, connectionId?: string) {
  try {
    const db = getDatabase();
    const now = new Date();
    
    // Update all presence records for this user to offline
    let whereClause = eq(userPresenceTable.userEmail, userEmail);
    if (connectionId) {
      whereClause = and(
        eq(userPresenceTable.userEmail, userEmail),
        eq(userPresenceTable.connectionId, connectionId)
      );
    }

    const updatedRecords = await db
      .update(userPresenceTable)
      .set({
        status: "offline",
        isTyping: false,
        typingAt: null,
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(whereClause)
      .returning({ channelId: userPresenceTable.channelId });

    // Get user info for WebSocket emission
    const [user] = await db
      .select({
        name: userTable.name,
        avatarUrl: userTable.avatarUrl,
      })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    // Emit offline status to all channels user was in
    const uniqueChannels = [...new Set(updatedRecords.map(r => r.channelId).filter(Boolean))];
    
    for (const channelId of uniqueChannels) {
      try {
        await unifiedWebSocketService.broadcastToChannel(channelId, {
          type: "presence:user_offline",
          data: {
            userEmail,
            userName: user?.name || "Unknown User",
            userAvatar: user?.avatarUrl || null,
            channelId,
            timestamp: now.toISOString(),
          },
        });
      } catch (wsError) {
        logger.error(`Error emitting offline status for channel ${channelId}:`, wsError);
      }
    }

    return { success: true, channelsUpdated: uniqueChannels.length };
  } catch (error) {
    logger.error("Error marking user offline:", error);
    throw new Error("Failed to mark user offline");
  }
}

// Clean up stale presence records (maintenance)
export async function cleanupStalePresence(olderThanMinutes: number = 30) {
  try {
    const db = getDatabase();
    const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    const result = await db
      .delete(userPresenceTable)
      .where(
        and(
          eq(userPresenceTable.status, "offline"),
          lte(userPresenceTable.lastActiveAt, cutoffDate)
        )
      );

    return { success: true, cleanedCount: result.changes };
  } catch (error) {
    logger.error("Error cleaning up stale presence:", error);
    throw new Error("Failed to cleanup stale presence");
  }
}

// Bulk presence updates (for efficiency during high activity)
export async function bulkUpdatePresence(presenceUpdates: Array<{
  userEmail: string;
  channelId?: string;
  status?: "online" | "away" | "busy" | "offline";
  isTyping?: boolean;
}>) {
  try {
    const now = new Date();
    const results = [];

    for (const update of presenceUpdates) {
      try {
        const result = await updateUserPresence(
          update.userEmail,
          {
            channelId: update.channelId,
            status: update.status || "online",
            isTyping: update.isTyping || false,
          }
        );
        results.push(result);
      } catch (error) {
        logger.error(`Error updating presence for ${update.userEmail}:`, error);
        results.push({ success: false, userEmail: update.userEmail, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results,
    };
  } catch (error) {
    logger.error("Error bulk updating presence:", error);
    throw new Error("Failed to bulk update presence");
  }
}

