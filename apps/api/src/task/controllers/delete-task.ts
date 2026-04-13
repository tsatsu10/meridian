import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskTable, projectTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { ActivityTracker } from "../../services/team-awareness/activity-tracker";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";

async function deleteTask(taskId: string, deleterId?: string) {
  try {
    const db = getDatabase();
  const deletedTasks = await db
    .delete(taskTable)
    .where(eq(taskTable.id, taskId))
    .returning()
    .execute();

  if (!deletedTasks || deletedTasks.length === 0) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  const deletedTask = deletedTasks[0];

  // Publish task.deleted event
  await publishEvent("task.deleted", {
    taskId: deletedTask.id,
    projectId: deletedTask.projectId,
    title: deletedTask.title,
  });

  // 🎯 Log activity for task deletion
  try {
    if (deletedTask.projectId) {
      const [project] = await db
        .select({ workspaceId: projectTable.workspaceId })
        .from(projectTable)
        .where(eq(projectTable.id, deletedTask.projectId));

      if (project && project.workspaceId) {
        const actorUserId = deleterId || deletedTask.assigneeId || "";
        
        if (actorUserId) {
          await ActivityTracker.logTaskActivity(
            actorUserId,
            project.workspaceId,
            deletedTask.projectId,
            'deleted',
            deletedTask.id,
            deletedTask.title
          );
        }
      }
    }
  } catch (error) {
    console.error('Failed to log task deletion activity:', error);
  }

    // 📊 SENTRY: Add breadcrumb for successful deletion
    addBreadcrumb('Task deleted successfully', 'task', 'info', {
      taskId,
      deleterId,
    });

    return deletedTask;
  } catch (error) {
    logger.error("Error deleting task:", error);
    
    // 📊 SENTRY: Capture task deletion errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'tasks',
        action: 'delete_task',
        taskId,
        deleterId,
      });
    }
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to delete task" });
  }
}

export default deleteTask;

