import { getDatabase } from "../../database/connection";
import { userStatus } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

export async function setUserStatus(
  userEmail: string,
  data: {
    status: 'available' | 'in_meeting' | 'focus_mode' | 'away';
    statusMessage?: string;
    emoji?: string;
    expiresAt?: Date;
  }
) {
  const db = getDatabase();
  
  try {
    // Check if status already exists
    const [existing] = await db
      .select()
      .from(userStatus)
      .where(eq(userStatus.userEmail, userEmail))
      .limit(1);
    
    if (existing) {
      // Update existing status
      const [updated] = await db
        .update(userStatus)
        .set({
          status: data.status,
          statusMessage: data.statusMessage || null,
          emoji: data.emoji || null,
          expiresAt: data.expiresAt || null,
          updatedAt: new Date(),
        })
        .where(eq(userStatus.userEmail, userEmail))
        .returning();
      
      logger.info(`Status updated for ${userEmail}: ${data.status}`);
      return updated;
    } else {
      // Insert new status
      const [created] = await db
        .insert(userStatus)
        .values({
          userEmail,
          status: data.status,
          statusMessage: data.statusMessage || null,
          emoji: data.emoji || null,
          expiresAt: data.expiresAt || null,
        })
        .returning();
      
      logger.info(`Status created for ${userEmail}: ${data.status}`);
      return created;
    }
  } catch (error) {
    logger.error("Failed to set user status:", error);
    throw new Error("Failed to update user status");
  }
}


