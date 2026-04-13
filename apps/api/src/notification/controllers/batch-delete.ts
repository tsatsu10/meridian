import { eq, and, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function batchDelete(userEmail: string, notificationIds: string[]) {
  const db = getDatabase();

  if (notificationIds.length === 0) {
    return { 
      count: 0,
      notifications: []
    };
  }

  // Delete multiple notifications
  const result = await db
    .delete(notificationTable)
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

export default batchDelete;


