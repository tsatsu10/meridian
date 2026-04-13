import { eq, or } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { taskDependencyTable, taskTable } from "../../database/schema";

async function getTaskDependencies(taskId: string) {
  // ✅ FIX: Get database instance
  const db = getDatabase();
  
  // Get all dependencies where this task is either dependent or required
  const dependencies = await db
    .select({
      id: taskDependencyTable.id,
      dependentTaskId: taskDependencyTable.dependentTaskId,
      requiredTaskId: taskDependencyTable.requiredTaskId,
      type: taskDependencyTable.type,
      createdAt: taskDependencyTable.createdAt,
    })
    .from(taskDependencyTable)
    .where(
      or(
        eq(taskDependencyTable.dependentTaskId, taskId),
        eq(taskDependencyTable.requiredTaskId, taskId)
      )
    );

  // Get all related task IDs
  const relatedTaskIds = new Set<string>();
  dependencies.forEach(dep => {
    relatedTaskIds.add(dep.dependentTaskId);
    relatedTaskIds.add(dep.requiredTaskId);
  });

  // Remove the current task ID
  relatedTaskIds.delete(taskId);

  // Fetch related task details
  // ✅ FIX: Handle empty array case for PostgreSQL compatibility
  const relatedTasks = relatedTaskIds.size > 0 
    ? await db
        .select({
          id: taskTable.id,
          title: taskTable.title,
          status: taskTable.status,
          priority: taskTable.priority,
          number: taskTable.number,
          userEmail: taskTable.userEmail,
        })
        .from(taskTable)
        .where(
          or(...Array.from(relatedTaskIds).map(id => eq(taskTable.id, id)))
        )
    : [];

  // Create a map for quick lookup
  const taskMap = new Map(relatedTasks.map(task => [task.id, task]));

  // Separate dependencies into blocks and blockedBy
  const blocks = dependencies
    .filter(dep => dep.dependentTaskId === taskId)
    .map(dep => ({
      ...dep,
      requiredTask: taskMap.get(dep.requiredTaskId),
    }));

  const blockedBy = dependencies
    .filter(dep => dep.requiredTaskId === taskId)
    .map(dep => ({
      ...dep,
      dependentTask: taskMap.get(dep.dependentTaskId),
    }));

  return {
    blocks,
    blockedBy,
  };
}

export default getTaskDependencies; 
