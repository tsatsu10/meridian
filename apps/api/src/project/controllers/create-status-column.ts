import { eq, gte, and, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectTable, statusColumnTable } from "../../database/schema";
import { ensureDefaultColumns } from "../utils/default-columns";
import logger from "../../utils/logger";

// @epic-1.1-subtasks: Create custom status columns for Sarah's PM workflow
async function createStatusColumn({
  projectId,
  name,
  color = "#6b7280",
  position,
  insertAfterColumnId,
}: {
  projectId: string;
  name: string;
  color?: string;
  position?: number;
  /**
   * Public id of the column the new one should sit directly after — the row
   * id for custom columns, the slug for defaults.
   *
   * Preferred over a raw `position`: normalising a project's columns can
   * renumber them, so any position the client computed from the board it was
   * looking at may be stale by the time it gets here. An id survives that.
   */
  insertAfterColumnId?: string;
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

  // Materialise the default columns and renumber everything contiguously, so
  // that the position the client asked for means the same thing here as the
  // slot it clicked on the board. Also self-heals projects created before
  // defaults became real rows.
  await ensureDefaultColumns(projectId);

  // Resolve "insert after this column" now that positions are settled.
  if (insertAfterColumnId !== undefined) {
    const anchor = await db.query.statusColumnTable.findFirst({
      where: and(
        eq(statusColumnTable.projectId, projectId),
        or(
          eq(statusColumnTable.id, insertAfterColumnId),
          and(
            eq(statusColumnTable.isDefault, true),
            eq(statusColumnTable.slug, insertAfterColumnId),
          ),
        ),
      ),
    });

    if (!anchor) {
      throw new HTTPException(404, {
        message: "Column to insert after not found",
      });
    }

    position = anchor.position + 1;
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // If position is provided, shift existing columns to make room
  if (position !== undefined) {
    logger.debug("🔧 Shifting columns at position >=", position);

    // Get all columns at or after this position, ordered by position for predictable shifting
    const columnsToShift = await db
      .select()
      .from(statusColumnTable)
      .where(
        and(
          eq(statusColumnTable.projectId, projectId),
          gte(statusColumnTable.position, position),
        ),
      )
      .orderBy(statusColumnTable.position);

    logger.debug(
      "🔧 Columns to shift:",
      columnsToShift.map((c) => ({
        name: c.name,
        currentPosition: c.position,
        newPosition: c.position + 1,
      })),
    );

    // Shift each column by 1 position, starting from the highest position to avoid conflicts
    const sortedColumnsToShift = columnsToShift.sort(
      (a, b) => b.position - a.position,
    );

    for (const column of sortedColumnsToShift) {
      await db
        .update(statusColumnTable)
        .set({ position: column.position + 1 })
        .where(eq(statusColumnTable.id, column.id));

      logger.debug(
        `🔧 Shifted ${column.name} from position ${column.position} to ${column.position + 1}`,
      );
    }
  } else {
    // If no position provided, get the next available position
    const columns = await db
      .select({ position: statusColumnTable.position })
      .from(statusColumnTable)
      .where(eq(statusColumnTable.projectId, projectId))
      .orderBy(statusColumnTable.position);

    position =
      columns.length > 0 ? Math.max(...columns.map((c) => c.position)) + 1 : 0;
  }

  logger.debug("🔧 Creating new column at position:", position);

  // Create the status column
  const [createdColumn] = await db
    .insert(statusColumnTable)
    .values({
      projectId,
      name,
      slug,
      color,
      position,
      isDefault: false,
    })
    .returning();

  if (!createdColumn) {
    throw new Error("createdColumn: write returned no row");
  }

  logger.debug("🔧 Created column:", {
    name: createdColumn.name,
    position: createdColumn.position,
  });

  return createdColumn;
}

export default createStatusColumn;
