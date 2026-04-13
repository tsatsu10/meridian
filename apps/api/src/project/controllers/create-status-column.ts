import { eq, gte, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectTable, statusColumnTable } from "../../database/schema";
import logger from '../../utils/logger';

// Fix position conflicts by renumbering all columns sequentially
async function fixPositionConflicts(projectId: string) {
  const db = getDatabase();
  logger.debug('🔧 Fixing position conflicts for project:', projectId);
  
  // Get all columns sorted by current position, then by creation date for tiebreaker
  const columns = await db
    .select()
    .from(statusColumnTable)
    .where(eq(statusColumnTable.projectId, projectId))
    .orderBy(statusColumnTable.position, statusColumnTable.createdAt);

  logger.debug('🔧 Current columns before fix:', columns.map(c => ({ 
    id: c.id, 
    name: c.name, 
    position: c.position, 
    isDefault: c.isDefault 
  })));

  // Renumber positions sequentially
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const newPosition = i; // 0, 1, 2, 3, 4...
    
    if (column.position !== newPosition) {
      logger.debug(`🔧 Updating ${column.name} position from ${column.position} to ${newPosition}`);
      await db
        .update(statusColumnTable)
        .set({ position: newPosition })
        .where(eq(statusColumnTable.id, column.id));
    }
  }
  
  logger.debug('🔧 Position conflicts fixed');
}

// @epic-1.1-subtasks: Create custom status columns for Sarah's PM workflow
async function createStatusColumn({
  projectId,
  name,
  color = "#6b7280",
  position,
}: {
  projectId: string;
  name: string;
  color?: string;
  position?: number;
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

  // Fix any existing position conflicts first
  await fixPositionConflicts(projectId);

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // If position is provided, shift existing columns to make room
  if (position !== undefined) {
    logger.debug('🔧 Shifting columns at position >=', position);
    
    // Get all columns at or after this position, ordered by position for predictable shifting
    const columnsToShift = await db
      .select()
      .from(statusColumnTable)
      .where(
        and(
          eq(statusColumnTable.projectId, projectId),
          gte(statusColumnTable.position, position)
        )
      )
      .orderBy(statusColumnTable.position);

    logger.debug('🔧 Columns to shift:', columnsToShift.map(c => ({ 
      name: c.name, 
      currentPosition: c.position, 
      newPosition: c.position + 1 
    })));

    // Shift each column by 1 position, starting from the highest position to avoid conflicts
    const sortedColumnsToShift = columnsToShift.sort((a, b) => b.position - a.position);
    
    for (const column of sortedColumnsToShift) {
      await db
        .update(statusColumnTable)
        .set({ position: column.position + 1 })
        .where(eq(statusColumnTable.id, column.id));
      
      logger.debug(`🔧 Shifted ${column.name} from position ${column.position} to ${column.position + 1}`);
    }
  } else {
    // If no position provided, get the next available position
    const columns = await db
      .select({ position: statusColumnTable.position })
      .from(statusColumnTable)
      .where(eq(statusColumnTable.projectId, projectId))
      .orderBy(statusColumnTable.position);
      
    position = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 4; // Start after default columns
  }

  logger.debug('🔧 Creating new column at position:', position);

  logger.debug('Inserting new column at position:', position);
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

  logger.debug('🔧 Created column:', { name: createdColumn.name, position: createdColumn.position });

  return createdColumn;
}

export default createStatusColumn; 
