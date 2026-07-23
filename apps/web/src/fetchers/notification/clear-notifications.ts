import { looseClient } from "@/lib/rpc-client";

async function clearNotifications() {
  const response = await looseClient.notification["clear-all"].$delete();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default clearNotifications;
