import { count, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { taskTable } from "../../database/schema";

async function getNextTaskNumber(projectId: string) {
  const db = getDatabase(); // Must be inside function, not at module level
  
  const [task] = await db
    .select({ count: count() })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId));

  return task ? task.count : 0;
}

export default getNextTaskNumber;

