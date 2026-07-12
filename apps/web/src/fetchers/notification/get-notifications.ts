import { client } from "@meridian/libs";
import type { Notification } from "@/types/notification";

export interface NotificationsPage {
  notifications: Notification[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

async function getNotifications(
  options: { limit?: number; offset?: number; includeArchived?: boolean } = {},
): Promise<NotificationsPage> {
  const { limit = 50, offset = 0, includeArchived } = options;

  const response = await client.notification.$get({
    query: {
      limit: limit.toString(),
      offset: offset.toString(),
      ...(includeArchived !== undefined
        ? { includeArchived: String(includeArchived) }
        : {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as NotificationsPage;
}

export default getNotifications;
