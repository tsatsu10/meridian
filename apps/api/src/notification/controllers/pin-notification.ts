import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function pinNotification(id: string) {
  const db = getDatabase(); // FIX: Initialize database connection
  const [notification] = await db
    .update(notificationTable)
    .set({ isPinned: true })
    .where(eq(notificationTable.id, id))
    .returning();

  if (!notification) {
    throw new HTTPException(404, {
      message: "Notification not found",
    });
  }

  return notification;
}

export default pinNotification; 
