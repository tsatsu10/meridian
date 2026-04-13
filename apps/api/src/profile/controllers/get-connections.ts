import { eq, desc, or, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userConnectionTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

const getConnections = async (userId: string) => {
  const db = getDatabase();
  
  try {
    // Get connections where user is either follower or following
    const connections = await db
      .select({
        id: userConnectionTable.id,
        followerId: userConnectionTable.followerId,
        followingId: userConnectionTable.followingId,
        status: userConnectionTable.status,
        note: userConnectionTable.note,
        createdAt: userConnectionTable.createdAt,
        // Connection details
        connectionName: userTable.name,
        connectionEmail: userTable.email,
      })
      .from(userConnectionTable)
      .leftJoin(userTable, 
        or(
          eq(userConnectionTable.followerId, userTable.id),
          eq(userConnectionTable.followingId, userTable.id)
        )
      )
      .where(or(
        eq(userConnectionTable.followerId, userId),
        eq(userConnectionTable.followingId, userId)
      ))
      .orderBy(desc(userConnectionTable.createdAt));

    return connections;
  } catch (error) {
    logger.error("Error fetching connections:", error);
    throw new Error("Failed to fetch connections");
  }
};

export default getConnections; 
