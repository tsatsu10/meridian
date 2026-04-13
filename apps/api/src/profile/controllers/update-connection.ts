import { eq, and, or } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userConnectionTable } from "../../database/schema";
import logger from '../../utils/logger';

interface ConnectionData {
  status?: "pending" | "accepted" | "blocked";
  note?: string;
}

const updateConnection = async (userId: string, connectionId: string, connectionData: ConnectionData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .update(userConnectionTable)
      .set({
        status: connectionData.status,
        note: connectionData.note,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userConnectionTable.id, connectionId),
        or(
          eq(userConnectionTable.followerId, userId),
          eq(userConnectionTable.followingId, userId)
        )
      ))
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error updating connection:", error);
    throw new Error("Failed to update connection");
  }
};

export default updateConnection; 
