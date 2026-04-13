import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { callTable } from "../database/schema";
import { createId } from "@paralleldrive/cuid2";

const call = new Hono();

call.post("/", async (c) => {
  const db = getDatabase();
  const { title, description, organizerId, startTime, endTime, participants } =
    await c.req.json();
  if (!title || !organizerId || !startTime || !participants) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  const roomId = createId();
  const participantList = Array.isArray(participants) ? participants : [];
  const [row] = await db
    .insert(callTable)
    .values({
      id: createId(),
      title,
      description: description || "",
      organizerId,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      roomId,
      participants: participantList,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return c.json({ success: true, call: row });
});

call.get("/", async (c) => {
  const db = getDatabase();
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "Missing userId" }, 400);
  const now = Date.now();
  const calls = await db.select().from(callTable);
  const filtered = calls.filter((row) => {
    const parts = row.participants ?? [];
    return (
      (row.organizerId === userId || parts.includes(userId)) &&
      row.startTime.getTime() > now
    );
  });
  return c.json({ calls: filtered });
});

call.get("/:id", async (c) => {
  const db = getDatabase();
  const { id } = c.req.param();
  const [callObj] = await db
    .select()
    .from(callTable)
    .where(eq(callTable.id, id))
    .limit(1);
  if (!callObj) return c.json({ error: "Not found" }, 404);
  return c.json({ call: callObj });
});

call.patch("/:id", async (c) => {
  const db = getDatabase();
  const { id } = c.req.param();
  const updates = (await c.req.json()) as Record<string, unknown>;
  const next: Partial<typeof callTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof updates.title === "string") next.title = updates.title;
  if (typeof updates.description === "string") next.description = updates.description;
  if (updates.startTime !== undefined)
    next.startTime = new Date(String(updates.startTime));
  if (updates.endTime !== undefined && updates.endTime !== null)
    next.endTime = new Date(String(updates.endTime));
  if (typeof updates.roomId === "string") next.roomId = updates.roomId;
  if (Array.isArray(updates.participants))
    next.participants = updates.participants as string[];
  await db.update(callTable).set(next).where(eq(callTable.id, id));
  return c.json({ success: true });
});

call.delete("/:id", async (c) => {
  const db = getDatabase();
  const { id } = c.req.param();
  await db.delete(callTable).where(eq(callTable.id, id));
  return c.json({ success: true });
});

export default call;
