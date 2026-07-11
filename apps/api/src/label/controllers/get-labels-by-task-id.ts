import { getDatabase } from "../../database/connection";
import { labelTable, taskTable } from "../../database/schema";
import { eq } from "drizzle-orm";

/** Return labels for the task's project (labels table is project-scoped). */
async function getLabelsByTaskId(taskId: string) {
  const db = getDatabase();
  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task?.projectId) {
    return [];
  }

  return db
    .select()
    .from(labelTable)
    .where(eq(labelTable.projectId, task.projectId));
}

export default getLabelsByTaskId;
