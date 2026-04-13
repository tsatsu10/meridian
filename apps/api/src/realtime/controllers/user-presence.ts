// @epic-2.2-realtime: User presence management for real-time collaboration
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userPresenceTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

export interface UpdateUserPresenceData {
  userEmail: string;
  workspaceId: string;
  status: string;
  socketId: string | null;
  currentPage?: string;
}

export async function updateUserPresence(data: UpdateUserPresenceData) {
  const db = getDatabase();
  try {
    // Check if presence record exists
    const existingPresence = await db.query.userPresenceTable.findFirst({
      where: and(
        eq(userPresenceTable.userEmail, data.userEmail),
        eq(userPresenceTable.workspaceId, data.workspaceId)
      ),
    });

    if (existingPresence) {
      // Update existing presence
      const [updatedPresence] = await db
        .update(userPresenceTable)
        .set({
          status: data.status,
          lastSeen: new Date(),
          currentPage: data.currentPage || existingPresence.currentPage,
          socketId: data.socketId,
        })
        .where(
          and(
            eq(userPresenceTable.userEmail, data.userEmail),
            eq(userPresenceTable.workspaceId, data.workspaceId)
          )
        )
        .returning();

      return updatedPresence;
    } else {
      // Create new presence record
      const [newPresence] = await db
        .insert(userPresenceTable)
        .values({
          userEmail: data.userEmail,
          workspaceId: data.workspaceId,
          status: data.status,
          lastSeen: new Date(),
          currentPage: data.currentPage || null,
          socketId: data.socketId,
        })
        .returning();

      return newPresence;
    }
  } catch (error) {
    logger.error('❌ Error updating user presence:', error);
    throw error;
  }
}

export async function getUserPresence(workspaceId: string) {
  try {
    const db = getDatabase();
    const presence = await db
      .select({
        userEmail: userPresenceTable.userEmail,
        userName: userTable.name,
        status: userPresenceTable.status,
        lastSeen: userPresenceTable.lastSeen,
        currentPage: userPresenceTable.currentPage,
      })
      .from(userPresenceTable)
      .leftJoin(userTable, eq(userPresenceTable.userEmail, userTable.email))
      .where(eq(userPresenceTable.workspaceId, workspaceId));

    return presence;
  } catch (error) {
    logger.error('❌ Error getting user presence:', error);
    throw error;
  }
}

export async function getOnlineUsers(workspaceId: string) {
  try {
    const db = getDatabase();
    const onlineUsers = await db
      .select({
        userEmail: userPresenceTable.userEmail,
        userName: userTable.name,
        status: userPresenceTable.status,
        currentPage: userPresenceTable.currentPage,
      })
      .from(userPresenceTable)
      .leftJoin(userTable, eq(userPresenceTable.userEmail, userTable.email))
      .where(
        and(
          eq(userPresenceTable.workspaceId, workspaceId),
          eq(userPresenceTable.status, 'online')
        )
      );

    return onlineUsers;
  } catch (error) {
    logger.error('❌ Error getting online users:', error);
    throw error;
  }
}

export async function cleanupStalePresence(timeoutMinutes: number = 5) {
  try {
    const db = getDatabase();
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    
    const stalePresence = await db
      .update(userPresenceTable)
      .set({ status: 'offline', socketId: null })
      .where(
        and(
          eq(userPresenceTable.status, 'online'),
          // lastSeen is older than cutoff time
        )
      )
      .returning();

    logger.debug(`🧹 Cleaned up ${stalePresence.length} stale presence records`);
    return stalePresence;
  } catch (error) {
    logger.error('❌ Error cleaning up stale presence:', error);
    throw error;
  }
} 
