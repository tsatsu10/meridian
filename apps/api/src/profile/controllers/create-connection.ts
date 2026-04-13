import { getDatabase } from "../../database/connection";
import { userConnectionTable } from "../../database/schema";
import logger from '../../utils/logger';

interface ConnectionData {
  followingId: string;
  note?: string;
}

const createConnection = async (userId: string, connectionData: ConnectionData) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .insert(userConnectionTable)
      .values({
        followerId: userId,
        followingId: connectionData.followingId,
        status: "pending",
        note: connectionData.note,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  } catch (error) {
    logger.error("Error creating connection:", error);
    throw new Error("Failed to create connection");
  }
};

export default createConnection; 
