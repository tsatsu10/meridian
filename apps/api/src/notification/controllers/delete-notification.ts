import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function deleteNotification(userEmail: string, notificationId: string) {
  const db = getDatabase();

  const [deletedNotification] = await db
    .delete(notificationTable)
    .where(eq(notificationTable.id, notificationId))
    .returning();

  return deletedNotification;
}

export default deleteNotification;


