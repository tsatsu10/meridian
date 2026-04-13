import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { taskTable } from "../../database/schema";

async function updateTaskStatus({
  id,
  status,
  userEmail,
}: { id: string; status: string; userEmail: string }) {
  const db = getDatabase();
  await db
    .update(taskTable)
    .set({ status, userEmail })
    .where(eq(taskTable.id, id));
}

export default updateTaskStatus;

