import { getDatabase } from "../../database/connection";
import { userStatus, users } from "../../database/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../../utils/logger";

export async function getUserStatus(userEmail: string) {
  const db = getDatabase();
  
  try {
    const [status] = await db
      .select({
        userEmail: userStatus.userEmail,
        status: userStatus.status,
        statusMessage: userStatus.statusMessage,
        emoji: userStatus.emoji,
        expiresAt: userStatus.expiresAt,
        updatedAt: userStatus.updatedAt,
      })
      .from(userStatus)
      .where(eq(userStatus.userEmail, userEmail))
      .limit(1);
    
    if (!status) {
      return {
        userEmail,
        status: 'available',
        statusMessage: null,
        emoji: null,
        expiresAt: null,
        updatedAt: new Date(),
      };
    }
    
    // Check if status expired
    if (status.expiresAt && new Date() > new Date(status.expiresAt)) {
      // Clear expired status
      await db
        .delete(userStatus)
        .where(eq(userStatus.userEmail, userEmail));
      
      return {
        userEmail,
        status: 'available',
        statusMessage: null,
        emoji: null,
        expiresAt: null,
        updatedAt: new Date(),
      };
    }
    
    return status;
  } catch (error) {
    logger.error("Failed to get user status:", error);
    throw new Error("Failed to fetch user status");
  }
}

export async function getWorkspaceStatuses(workspaceId: string) {
  const db = getDatabase();
  
  try {
    // Get all workspace users with their statuses
    const statuses = await db
      .select({
        userEmail: users.email,
        userName: users.name,
        userAvatar: users.avatar,
        status: userStatus.status,
        statusMessage: userStatus.statusMessage,
        emoji: userStatus.emoji,
        expiresAt: userStatus.expiresAt,
        updatedAt: userStatus.updatedAt,
      })
      .from(users)
      .leftJoin(userStatus, eq(userStatus.userEmail, users.email))
      .where(eq(users.workspaceId, workspaceId));
    
    // Filter out expired statuses and set defaults
    const now = new Date();
    return statuses.map((s) => {
      const expired = s.expiresAt && now > new Date(s.expiresAt);
      
      return {
        userEmail: s.userEmail,
        userName: s.userName,
        userAvatar: s.userAvatar,
        status: expired || !s.status ? 'available' : s.status,
        statusMessage: expired ? null : s.statusMessage,
        emoji: expired ? null : s.emoji,
        expiresAt: expired ? null : s.expiresAt,
        updatedAt: s.updatedAt || now,
      };
    });
  } catch (error) {
    logger.error("Failed to get workspace statuses:", error);
    throw new Error("Failed to fetch workspace statuses");
  }
}


