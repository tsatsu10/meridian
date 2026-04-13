import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function markAllNotificationsAsRead(userEmail: string) {
  const db = getDatabase(); // FIX: Initialize database connection
  await db
    .update(notificationTable)
    .set({ isRead: true })
    .where(eq(notificationTable.userEmail, userEmail));

  return { success: true };
}

export default markAllNotificationsAsRead;

