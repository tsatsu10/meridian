import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function markNotificationAsRead(id: string) {
  const db = getDatabase(); // FIX: Initialize database connection
  const [notification] = await db
    .update(notificationTable)
    .set({ isRead: true })
    .where(eq(notificationTable.id, id))
    .returning();

  if (!notification) {
    throw new HTTPException(404, {
      message: "Notification not found",
    });
  }

  return notification;
}

export default markNotificationAsRead;

