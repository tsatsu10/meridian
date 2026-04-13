import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notifications as notificationTable } from "../../database/schema";

async function archiveNotification(userEmail: string, notificationId: string) {
  const db = getDatabase();

  // Update the notification's archived status
  const result = await db
    .update(notificationTable)
    .set({ isArchived: true })
    .where(eq(notificationTable.id, notificationId))
    .returning();

  if (result.length === 0) {
    throw new Error("Notification not found");
  }

  // Verify the notification belongs to the user
  if (result[0].userEmail !== userEmail) {
    throw new Error("Unauthorized");
  }

  return result[0];
}

export default archiveNotification;


