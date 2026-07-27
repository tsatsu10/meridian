/**
 * ☑️ Bulk Task Operations Controller
 *
 * Handles bulk operations on multiple tasks at once
 */

import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { tasks, activityTable, projectTable } from "../../database/schema";
import logger from "../../utils/logger";

export interface WorkspaceScopeError {
  error: "workspace_mismatch";
  message: string;
}

/**
 * SECURITY: every task ID in a bulk batch must resolve to a project that
 * belongs to the caller's stated workspace — fail closed on the whole
 * batch rather than silently applying the operation to a subset, so a
 * single ID from another workspace (typo, stale cache, tampered request)
 * can't leak a cross-tenant mutation through.
 *
 * `restrictedToProjectIds` (from checkWorkspacePermission) additionally
 * enforces the project-scoped role boundary: a project-manager/-viewer
 * assigned to specific projects only must not be able to reach tasks in
 * OTHER projects within the same workspace via these batch routes, even
 * though workspace-level permission alone would allow it.
 */
async function verifyTasksBelongToWorkspace(
  taskIds: string[],
  workspaceId: string,
  restrictedToProjectIds?: string[] | null,
): Promise<WorkspaceScopeError | null> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(tasks)
    .innerJoin(projectTable, eq(tasks.projectId, projectTable.id))
    .where(inArray(tasks.id, taskIds));

  const foundIds = new Set(rows.map((r) => r.id));
  const allFound = taskIds.every((id) => foundIds.has(id));
  const allInWorkspace = rows.every((r) => r.workspaceId === workspaceId);
  const allInAllowedProjects =
    !restrictedToProjectIds ||
    rows.every((r) => restrictedToProjectIds.includes(r.projectId));

  if (!allFound || !allInWorkspace || !allInAllowedProjects) {
    return {
      error: "workspace_mismatch",
      message:
        "One or more tasks were not found or are outside your assigned projects",
    };
  }

  return null;
}

// ⏩ Bulk Update Status
export async function bulkUpdateStatus(
  taskIds: string[],
  status: string,
  userId: string,
  workspaceId: string,
  restrictedToProjectIds: string[] | null = null,
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { updated: 0 };
    }

    const scopeError = await verifyTasksBelongToWorkspace(
      taskIds,
      workspaceId,
      restrictedToProjectIds,
    );
    if (scopeError) return scopeError;

    // Update all tasks
    const updatedTasks = await db
      .update(tasks)
      .set({
        status,
        // Real completion timestamp for cycle-time analytics. The CASE
        // references each row's *pre-update* status/completedAt (SQL
        // evaluates SET expressions against the old row), so a task that's
        // already done keeps its real original completion time instead of
        // getting bumped to "now" just because it was swept up in a bulk
        // selection that also included not-yet-done tasks.
        completedAt:
          status === "done"
            ? sql`CASE WHEN ${tasks.status} = 'done' THEN ${tasks.completedAt} ELSE NOW() END`
            : null,
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
        logger.error("Failed to log activity for task", {
          taskId: task.id,
          error: logError,
        });
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
  userId: string,
  workspaceId: string,
  restrictedToProjectIds: string[] | null = null,
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { updated: 0 };
    }

    const scopeError = await verifyTasksBelongToWorkspace(
      taskIds,
      workspaceId,
      restrictedToProjectIds,
    );
    if (scopeError) return scopeError;

    // Update all tasks
    const updatedTasks = await db
      .update(tasks)
      .set({
        priority: priority as (typeof tasks.priority.enumValues)[number],
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
        logger.error("Failed to log activity for task", {
          taskId: task.id,
          error: logError,
        });
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
  userId: string,
  workspaceId: string,
  restrictedToProjectIds: string[] | null = null,
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { updated: 0 };
    }

    const scopeError = await verifyTasksBelongToWorkspace(
      taskIds,
      workspaceId,
      restrictedToProjectIds,
    );
    if (scopeError) return scopeError;

    // Update all tasks
    const updatedTasks = await db
      .update(tasks)
      .set({
        assigneeId,
        // the tasks table stores the assignee email in userEmail
        userEmail: assigneeEmail,
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
        logger.error("Failed to log activity for task", {
          taskId: task.id,
          error: logError,
        });
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
export async function bulkDeleteTasks(
  taskIds: string[],
  userId: string,
  workspaceId: string,
  restrictedToProjectIds: string[] | null = null,
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { deleted: 0 };
    }

    const scopeError = await verifyTasksBelongToWorkspace(
      taskIds,
      workspaceId,
      restrictedToProjectIds,
    );
    if (scopeError) return scopeError;

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
        logger.error("Failed to log activity for task", {
          taskId: task.id,
          error: logError,
        });
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
export async function bulkArchiveTasks(
  taskIds: string[],
  userId: string,
  workspaceId: string,
  restrictedToProjectIds: string[] | null = null,
) {
  const db = getDatabase();

  try {
    if (taskIds.length === 0) {
      return { archived: 0 };
    }

    const scopeError = await verifyTasksBelongToWorkspace(
      taskIds,
      workspaceId,
      restrictedToProjectIds,
    );
    if (scopeError) return scopeError;

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
            text: "Archived task (bulk operation)",
            bulkOperation: true,
          },
        });
      } catch (logError) {
        logger.error("Failed to log activity for task", {
          taskId: task.id,
          error: logError,
        });
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
