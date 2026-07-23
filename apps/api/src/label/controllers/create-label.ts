import { getDatabase } from "../../database/connection";
import { labelTable, taskTable } from "../../database/schema";
import { eq } from "drizzle-orm";

/** Labels are scoped to `project_id` in schema; resolve project from the task. */
async function createLabel(name: string, color: string, taskId: string) {
  const db = getDatabase();
  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new Error("Task not found");
  }

  const [label] = await db
    .insert(labelTable)
    .values({ name, color, projectId: task.projectId })
    .returning();

  return label;
}

export default createLabel;
