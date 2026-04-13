import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskDependencyTable } from "../../database/schema";

async function deleteTaskDependency(dependencyId: string) {
  const db = getDatabase();
  
  const [deletedDependency] = await db
    .delete(taskDependencyTable)
    .where(eq(taskDependencyTable.id, dependencyId))
    .returning();

  if (!deletedDependency) {
    throw new HTTPException(404, {
      message: "Dependency not found",
    });
  }

  return deletedDependency;
}

export default deleteTaskDependency; 
