/**
 * ☑️ Bulk Task Operations Controller
 * 
 * Handles bulk operations on multiple tasks at once
 */

import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { tasks, activityTable } from "../../database/schema";
import logger from '../../utils/logger';

// ⏩ Bulk Update Status
export async function bulkUpdateStatus(
  taskIds: string[],
  status: string,
  userId: string
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { updated: 0 };
    }

    // Update all tasks
    const updatedTasks = await db
      .update(tasks)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, taskIds))
      .returning();

    // 📊 Log activity for each task
    for (const task of updatedTasks) {
      try {
        await db.insert(activityTable).values({
          taskId: task.id,
          type: "task",
          userId,
          content: {
            text: `Updated status to ${status} (bulk operation)`,
            newStatus: status,
            bulkOperation: true,
          },
        });
      } catch (logError) {
        logger.error("Failed to log activity for task:", task.id, logError);
      }
    }

    return {
      updated: updatedTasks.length,
      tasks: updatedTasks,
    };
  } catch (error) {
    logger.error("Error in bulk status update:", error);
    throw new Error("Failed to update task statuses");
  }
}

// 🎯 Bulk Update Priority
export async function bulkUpdatePriority(
  taskIds: string[],
  priority: string,
  userId: string
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { updated: 0 };
    }

    // Update all tasks
    const updatedTasks = await db
      .update(tasks)
      .set({
        priority: priority as any,
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, taskIds))
      .returning();

    // 📊 Log activity for each task
    for (const task of updatedTasks) {
      try {
        await db.insert(activityTable).values({
          taskId: task.id,
          type: "task",
          userId,
          content: {
            text: `Updated priority to ${priority} (bulk operation)`,
            newPriority: priority,
            bulkOperation: true,
          },
        });
      } catch (logError) {
        logger.error("Failed to log activity for task:", task.id, logError);
      }
    }

    return {
      updated: updatedTasks.length,
      tasks: updatedTasks,
    };
  } catch (error) {
    logger.error("Error in bulk priority update:", error);
    throw new Error("Failed to update task priorities");
  }
}

// 👤 Bulk Assign Tasks
export async function bulkAssignTasks(
  taskIds: string[],
  assigneeId: string,
  assigneeEmail: string,
  userId: string
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { updated: 0 };
    }

    // Update all tasks
    const updatedTasks = await db
      .update(tasks)
      .set({
        assigneeId,
        assigneeEmail,
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, taskIds))
      .returning();

    // 📊 Log activity for each task
    for (const task of updatedTasks) {
      try {
        await db.insert(activityTable).values({
          taskId: task.id,
          type: "task",
          userId,
          content: {
            text: `Assigned to ${assigneeEmail} (bulk operation)`,
            assigneeId,
            assigneeEmail,
            bulkOperation: true,
          },
        });
      } catch (logError) {
        logger.error("Failed to log activity for task:", task.id, logError);
      }
    }

    return {
      updated: updatedTasks.length,
      tasks: updatedTasks,
    };
  } catch (error) {
    logger.error("Error in bulk assign:", error);
    throw new Error("Failed to assign tasks");
  }
}

// 🗑️ Bulk Delete Tasks
export async function bulkDeleteTasks(taskIds: string[], userId: string) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { deleted: 0 };
    }

    // Get tasks for logging before deletion
    const tasksToDelete = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    // Delete all tasks
    await db.delete(tasks).where(inArray(tasks.id, taskIds));

    // 📊 Log activity for each deleted task
    for (const task of tasksToDelete) {
      try {
        await db.insert(activityTable).values({
          taskId: task.id,
          type: "task",
          userId,
          content: {
            text: `Deleted task: ${task.title} (bulk operation)`,
            taskTitle: task.title,
            bulkOperation: true,
          },
        });
      } catch (logError) {
        logger.error("Failed to log activity for task:", task.id, logError);
      }
    }

    return {
      deleted: tasksToDelete.length,
    };
  } catch (error) {
    logger.error("Error in bulk delete:", error);
    throw new Error("Failed to delete tasks");
  }
}

// 📦 Bulk Archive Tasks (move to archived state)
export async function bulkArchiveTasks(taskIds: string[], userId: string) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { archived: 0 };
    }

    // Update all tasks to done status (or add archived field if it exists)
    const updatedTasks = await db
      .update(tasks)
      .set({
        status: "done",
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, taskIds))
      .returning();

    // 📊 Log activity for each task
    for (const task of updatedTasks) {
      try {
        await db.insert(activityTable).values({
          taskId: task.id,
          type: "task",
          userId,
          content: {
            text: `Archived task (bulk operation)`,
            bulkOperation: true,
          },
        });
      } catch (logError) {
        logger.error("Failed to log activity for task:", task.id, logError);
      }
    }

    return {
      archived: updatedTasks.length,
      tasks: updatedTasks,
    };
  } catch (error) {
    logger.error("Error in bulk archive:", error);
    throw new Error("Failed to archive tasks");
  }
}


