import { looseClient } from "@/lib/rpc-client";

async function markAllNotificationsAsRead() {
  const response = await looseClient.notification["read-all"].$patch();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default markAllNotificationsAsRead;
