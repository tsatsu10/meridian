import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { pushSubscriptionTable } from "../database/schema";
import { createId } from "@paralleldrive/cuid2";

const push = new Hono();

// Subscribe endpoint
push.post("/subscribe", async (c) => {
  const db = getDatabase();
  const { userId, provider = 'web', endpoint, keys, token, deviceInfo } = await c.req.json();
  if (!userId || !provider || (provider === 'web' && !endpoint) || (provider === 'fcm' && !token)) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  // Upsert by (userId, provider, endpoint/token)
  let existing;
  if (provider === 'web') {
    existing = await db.query.pushSubscriptionTable.findFirst({
      where: (row, { eq, and }) => and(eq(row.userId, userId), eq(row.provider, 'web'), eq(row.endpoint, endpoint)),
    });
  } else if (provider === 'fcm') {
    existing = await db.query.pushSubscriptionTable.findFirst({
      where: (row, { eq, and }) => and(eq(row.userId, userId), eq(row.provider, 'fcm'), eq(row.token, token)),
    });
  }
  if (existing) {
    await db.update(pushSubscriptionTable)
      .set({
        endpoint: endpoint || null,
        keys: keys ? JSON.stringify(keys) : null,
        token: token || null,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        updatedAt: new Date(),
      })
      .where((row, { eq }) => eq(row.id, existing.id));
  } else {
    await db.insert(pushSubscriptionTable).values({
      id: createId(),
      userId,
      provider,
      endpoint: endpoint || null,
      keys: keys ? JSON.stringify(keys) : null,
      token: token || null,
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return c.json({ success: true });
});

// Unsubscribe endpoint
push.delete("/unsubscribe", async (c) => {
  const db = getDatabase();
  const { endpoint, token, provider = 'web', userId } = await c.req.json();
  if (provider === 'web' && endpoint) {
    await db.delete(pushSubscriptionTable).where((row, { eq, and }) => and(eq(row.endpoint, endpoint), eq(row.provider, 'web')));
  } else if (provider === 'fcm' && token && userId) {
    await db.delete(pushSubscriptionTable).where((row, { eq, and }) => and(eq(row.token, token), eq(row.provider, 'fcm'), eq(row.userId, userId)));
  }
  return c.json({ success: true });
});

export default push; 

