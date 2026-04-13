import { eq, and, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function batchMarkAsRead(userEmail: string, notificationIds: string[]) {
  const db = getDatabase();

  if (notificationIds.length === 0) {
    return { 
      count: 0,
      notifications: [] 
    };
  }

  // Update multiple notifications
  const result = await db
    .update(notificationTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationTable.userEmail, userEmail),
        inArray(notificationTable.id, notificationIds)
      )
    )
    .returning();

  return {
    count: result.length,
    notifications: result,
  };
}

export default batchMarkAsRead;


