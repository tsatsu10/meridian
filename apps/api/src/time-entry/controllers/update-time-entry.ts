import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { timeEntryTable } from "../../database/schema";

async function updateTimeEntry(
  timeEntryId: string,
  endTime: Date,
  duration: number,
) {
  const db = getDatabase();
  const [existingTimeEntry] = await db
    .select()
    .from(timeEntryTable)
    .where(eq(timeEntryTable.id, timeEntryId));

  if (!existingTimeEntry) {
    throw new HTTPException(404, {
      message: "Time entry not found",
    });
  }

  const [updatedTimeEntry] = await db
    .update(timeEntryTable)
    .set({
      endTime,
      duration,
    })
    .where(eq(timeEntryTable.id, timeEntryId))
    .returning();

  return updatedTimeEntry;
}

export default updateTimeEntry;

