import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function clearNotifications(userEmail: string) {
  const db = getDatabase(); // FIX: Initialize database connection
  await db
    .delete(notificationTable)
    .where(eq(notificationTable.userEmail, userEmail));

  return { success: true };
}

export default clearNotifications;

