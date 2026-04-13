import { eq, and, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function batchArchive(userEmail: string, notificationIds: string[]) {
  const db = getDatabase();

  if (notificationIds.length === 0) {
    return { 
      count: 0,
      notifications: []
    };
  }

  // Update multiple notifications to archived
  const result = await db
    .update(notificationTable)
    .set({ isArchived: true })
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

export default batchArchive;


