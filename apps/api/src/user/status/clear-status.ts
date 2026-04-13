import { getDatabase } from "../../database/connection";
import { userStatus } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

export async function clearUserStatus(userEmail: string) {
  const db = getDatabase();
  
  try {
    await db
      .delete(userStatus)
      .where(eq(userStatus.userEmail, userEmail));
    
    logger.info(`Status cleared for ${userEmail}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to clear user status:", error);
    throw new Error("Failed to clear user status");
  }
}


