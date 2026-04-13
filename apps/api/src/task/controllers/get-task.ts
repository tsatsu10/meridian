import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskTable } from "../../database/schema";

async function getTask(taskId: string) {
  const db = getDatabase();
  const task = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, taskId),
  });

  if (!task) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  return task;
}

export default getTask;

