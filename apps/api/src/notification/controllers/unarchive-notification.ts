import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notifications as notificationTable } from "../../database/schema";
import { ForbiddenError, NotFoundError } from "../../core/ErrorHandler";

async function unarchiveNotification(
  userEmail: string,
  notificationId: string,
) {
  const db = getDatabase();

  // Update the notification's archived status
  const result = await db
    .update(notificationTable)
    .set({ isArchived: false })
    .where(eq(notificationTable.id, notificationId))
    .returning();

  if (result.length === 0) {
    throw new NotFoundError("Notification");
  }

  const [notification] = result;
  if (!notification) {
    throw new NotFoundError("Notification");
  }

  // Verify the notification belongs to the user
  if (notification.userEmail !== userEmail) {
    throw new ForbiddenError("Unauthorized");
  }

  return notification;
}

export default unarchiveNotification;
