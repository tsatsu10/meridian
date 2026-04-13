import { client } from "@meridian/libs";

async function getNotifications(options: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = options;
  
  const response = await client.notification.$get({
    query: {
      limit: limit.toString(),
      offset: offset.toString(),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getNotifications;
