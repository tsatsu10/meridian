import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { timeEntryTable } from "../../database/schema";

async function getTimeEntry(id: string) {
  const db = getDatabase();
  const [timeEntry] = await db
    .select()
    .from(timeEntryTable)
    .where(eq(timeEntryTable.id, id));

  return timeEntry;
}

export default getTimeEntry;

