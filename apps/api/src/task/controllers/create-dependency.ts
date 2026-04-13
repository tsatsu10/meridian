import { eq, and, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskDependencyTable, taskTable } from "../../database/schema";

async function createTaskDependency({
  dependentTaskId,
  requiredTaskId,
  type = 'blocks'
}: {
  dependentTaskId: string;
  requiredTaskId: string;
  type?: 'blocks' | 'blocked_by';
}) {
  const db = getDatabase();
  // Validate that both tasks exist
  const [dependentTask, requiredTask] = await Promise.all([
    db.select().from(taskTable).where(eq(taskTable.id, dependentTaskId)).limit(1),
    db.select().from(taskTable).where(eq(taskTable.id, requiredTaskId)).limit(1)
  ]);

  if (!dependentTask.length || !requiredTask.length) {
    throw new HTTPException(404, {
      message: "One or both tasks not found",
    });
  }

  // Prevent self-dependency
  if (dependentTaskId === requiredTaskId) {
    throw new HTTPException(400, {
      message: "A task cannot depend on itself",
    });
  }

  // Check if dependency already exists
  const existingDependency = await db
    .select()
    .from(taskDependencyTable)
    .where(
      and(
        eq(taskDependencyTable.dependentTaskId, dependentTaskId),
        eq(taskDependencyTable.requiredTaskId, requiredTaskId)
      )
    )
    .limit(1);

  if (existingDependency.length > 0) {
    throw new HTTPException(400, {
      message: "Dependency already exists",
    });
  }

  // Check for circular dependencies
  const wouldCreateCircularDependency = await checkCircularDependency(
    dependentTaskId,
    requiredTaskId
  );

  if (wouldCreateCircularDependency) {
    throw new HTTPException(400, {
      message: "This dependency would create a circular dependency",
    });
  }

  // Create the dependency
  const [createdDependency] = await db
    .insert(taskDependencyTable)
    .values({
      dependentTaskId,
      requiredTaskId,
      type,
    })
    .returning();

  return createdDependency;
}

// Helper function to check for circular dependencies
async function checkCircularDependency(
  dependentTaskId: string,
  requiredTaskId: string
): Promise<boolean> {
  const db = getDatabase();
  
  // Get all dependencies where requiredTaskId is the dependent task
  const dependencies = await db
    .select()
    .from(taskDependencyTable)
    .where(eq(taskDependencyTable.dependentTaskId, requiredTaskId));

  // If requiredTask depends on dependentTask (directly or indirectly), it's circular
  for (const dep of dependencies) {
    if (dep.requiredTaskId === dependentTaskId) {
      return true; // Direct circular dependency
    }
    
    // Check for indirect circular dependency recursively
    const hasIndirectCircular = await checkCircularDependency(
      dependentTaskId,
      dep.requiredTaskId
    );
    
    if (hasIndirectCircular) {
      return true;
    }
  }

  return false;
}

export default createTaskDependency; 
