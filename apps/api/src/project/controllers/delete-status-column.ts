import { eq, and, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import {
  projectTable,
  statusColumnTable,
  taskTable,
} from "../../database/schema";

// @epic-1.1-subtasks: Delete custom status columns for Sarah's PM workflow
async function deleteStatusColumn({
  projectId,
  columnId,
}: {
  projectId: string;
  columnId: string;
}) {
  const db = getDatabase();
  // Verify project exists
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  // Tasks are bucketed by `task.status === column.id` (get-tasks.ts,
  // kanban-board's drag handler), and that's what the frontend sends here
  // as columnId. For custom columns that public id is the row id; for the
  // default columns it's the slug, so both have to be tried or a delete
  // aimed at a default would 404 instead of hitting the guard below.
  const statusColumn = await db.query.statusColumnTable.findFirst({
    where: and(
      eq(statusColumnTable.projectId, projectId),
      or(
        eq(statusColumnTable.id, columnId),
        and(
          eq(statusColumnTable.isDefault, true),
          eq(statusColumnTable.slug, columnId),
        ),
      ),
    ),
  });

  if (!statusColumn) {
    throw new HTTPException(404, {
      message: "Status column not found",
    });
  }

  // Check if it's a default column (cannot be deleted)
  if (statusColumn.isDefault) {
    throw new HTTPException(400, {
      message: "Default columns cannot be deleted",
    });
  }

  // Check if there are tasks using this status
  const tasksWithStatus = await db
    .select({ count: taskTable.id })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.projectId, projectId),
        eq(taskTable.status, statusColumn.id),
      ),
    );

  if (tasksWithStatus.length > 0) {
    throw new HTTPException(400, {
      message: `Cannot delete column. ${tasksWithStatus.length} task(s) are using this status. Please move them to another column first.`,
    });
  }

  // Delete the status column by its actual database ID
  await db
    .delete(statusColumnTable)
    .where(eq(statusColumnTable.id, statusColumn.id));

  return { success: true, message: "Status column deleted successfully" };
}

export default deleteStatusColumn;
