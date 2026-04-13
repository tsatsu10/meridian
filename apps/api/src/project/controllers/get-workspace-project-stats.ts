import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTable, taskTable } from "../../database/schema";
import logger from "../../utils/logger";

export interface WorkspaceProjectStats {
  total: number;
  active: number;
  completed: number;
  /** Average task completion % across projects (0–100). */
  avgProgress: number;
}

/**
 * Aggregates for the Projects dashboard (replaces unbounded list fetches for KPIs).
 */
export default async function getWorkspaceProjectStats(
  workspaceId: string,
): Promise<WorkspaceProjectStats> {
  const db = getDatabase();

  const baseWhere = and(
    eq(projectTable.workspaceId, workspaceId),
    eq(projectTable.isArchived, false),
  );

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${projectTable.status} in ('active','planning','on-hold'))::int`,
      completed: sql<number>`count(*) filter (where ${projectTable.status} = 'completed')::int`,
    })
    .from(projectTable)
    .where(baseWhere);

  const perProjectProgress = await db
    .select({
      pct: sql<number>`CASE WHEN COUNT(${taskTable.id}) = 0 THEN 0
        ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE ${taskTable.status} = 'done') / COUNT(${taskTable.id}))
        END`,
    })
    .from(projectTable)
    .leftJoin(taskTable, eq(taskTable.projectId, projectTable.id))
    .where(baseWhere)
    .groupBy(projectTable.id);

  const avgProgress =
    perProjectProgress.length === 0
      ? 0
      : Math.round(
          perProjectProgress.reduce((sum, r) => sum + Number(r.pct ?? 0), 0) /
            perProjectProgress.length,
        );

  logger.debug("workspace project stats", { workspaceId, row, avgProgress });

  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    completed: Number(row?.completed ?? 0),
    avgProgress: Number.isFinite(avgProgress) ? avgProgress : 0,
  };
}
