import { looseClient } from "@/lib/rpc-client";

async function markNotificationAsRead(id: string) {
  const response = await looseClient.notification[":id"].read.$patch({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default markNotificationAsRead;
