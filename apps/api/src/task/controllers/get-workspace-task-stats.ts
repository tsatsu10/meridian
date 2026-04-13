import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTable, taskTable } from "../../database/schema";

export interface WorkspaceTaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

/**
 * Single-query aggregates for the All Tasks overview cards (replaces client-side 10k fetches).
 */
export default async function getWorkspaceTaskStats(
  workspaceId: string
): Promise<WorkspaceTaskStats> {
  const db = getDatabase();

  const now = new Date().toISOString();

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${taskTable.status} = 'done')::int`,
      inProgress: sql<number>`count(*) filter (where ${taskTable.status} = 'in_progress')::int`,
      overdue: sql<number>`count(*) filter (where ${taskTable.dueDate} is not null and ${taskTable.dueDate} < ${now}::timestamptz and ${taskTable.status} in ('todo', 'in_progress'))::int`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(projectTable.workspaceId, workspaceId));

  return {
    total: Number(row?.total ?? 0),
    completed: Number(row?.completed ?? 0),
    inProgress: Number(row?.inProgress ?? 0),
    overdue: Number(row?.overdue ?? 0),
  };
}
