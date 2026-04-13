import { eq, and, or } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userConnectionTable } from "../../database/schema";
import logger from '../../utils/logger';

const deleteConnection = async (userId: string, connectionId: string) => {
  const db = getDatabase();
  
  try {
    const result = await db
      .delete(userConnectionTable)
      .where(and(
        eq(userConnectionTable.id, connectionId),
        or(
          eq(userConnectionTable.followerId, userId),
          eq(userConnectionTable.followingId, userId)
        )
      ));

    return { success: true, message: "Connection deleted successfully" };
  } catch (error) {
    logger.error("Error deleting connection:", error);
    throw new Error("Failed to delete connection");
  }
};

export default deleteConnection; 
