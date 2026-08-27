import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { statusColumnTable } from "../../database/schema";

/**
 * The three columns every project starts with.
 *
 * These used to be *virtual*: hardcoded in get-tasks.ts at positions 0/1/2 and
 * never written to status_columns. That made them impossible to reorder around
 * — a new column asking for position 1 tied with "In Progress" and lost the
 * stable sort, so it always fell in behind every default it tied with, and no
 * integer position could ever express "between To Do and In Progress". They are
 * now real rows so that every column lives in one ordering space.
 *
 * `slug` is the load-bearing field: tasks store their column as
 * `task.status` = "todo" | "in_progress" | "done", and both get-tasks and the
 * board's drag handler bucket by `task.status === column.id`. So default rows
 * are exposed to clients with `id` = slug (their real row id travels as
 * `dbId`), which keeps every existing task and drag-drop working untouched.
 */
export const DEFAULT_COLUMN_DEFS = [
  { slug: "todo", name: "To Do", color: "#6b7280" },
  { slug: "in_progress", name: "In Progress", color: "#3b82f6" },
  { slug: "done", name: "Done", color: "#10b981" },
] as const;

const DEFAULT_SLUGS: string[] = DEFAULT_COLUMN_DEFS.map((d) => d.slug);

export type ColumnRow = {
  id?: string;
  slug: string;
  name: string;
  color: string | null;
  position: number;
  isDefault: boolean | null;
};

export type PlannedColumn = ColumnRow & {
  position: number;
  isDefault: boolean;
  isNew: boolean;
};

/**
 * Works out the full, ordered set of columns a project should have, adding any
 * missing defaults.
 *
 * Pure — it only plans; the caller performs the writes.
 *
 * The ordering deliberately reproduces what get-tasks.ts was already
 * rendering before defaults became real rows (virtual defaults pinned at
 * 0/1/2, merged with the custom rows and stable-sorted by position, ties
 * going to the defaults). Backfilling any other way would make existing
 * boards visibly reshuffle the first time someone adds a column.
 */
export function planDefaultColumnBackfill(rows: ColumnRow[]): PlannedColumn[] {
  const existingDefaults = new Map<string, ColumnRow>();
  for (const row of rows) {
    if (row.isDefault && DEFAULT_SLUGS.includes(row.slug)) {
      existingDefaults.set(row.slug, row);
    }
  }

  // Defaults first, so that on a tie they sort ahead of custom columns —
  // Array.prototype.sort is stable, which is what get-tasks.ts relied on.
  const planned: { column: PlannedColumn; sortKey: number }[] = [];

  DEFAULT_COLUMN_DEFS.forEach((def, index) => {
    const existing = existingDefaults.get(def.slug);
    planned.push({
      // A missing default falls back to its canonical slot, which is exactly
      // where the virtual column used to sit.
      sortKey: existing ? existing.position : index,
      column: {
        ...(existing ?? {}),
        slug: def.slug,
        name: existing?.name ?? def.name,
        color: existing?.color ?? def.color,
        position: 0,
        isDefault: true,
        isNew: !existing,
      },
    });
  });

  for (const row of rows) {
    if (row.isDefault && DEFAULT_SLUGS.includes(row.slug)) continue;
    planned.push({
      sortKey: row.position,
      column: { ...row, isDefault: false, isNew: false },
    });
  }

  planned.sort((a, b) => a.sortKey - b.sortKey);

  return planned.map((entry, index) => ({
    ...entry.column,
    position: index,
  }));
}

/**
 * Makes sure a project's three default columns exist as real rows and that
 * every column's position is contiguous, so "insert at position N" and
 * "the Nth column on the board" mean the same thing.
 *
 * Self-healing and idempotent: projects created before defaults were
 * materialised get backfilled the first time someone adds a column.
 */
export async function ensureDefaultColumns(projectId: string) {
  const db = getDatabase();

  const rows = await db
    .select()
    .from(statusColumnTable)
    .where(eq(statusColumnTable.projectId, projectId))
    .orderBy(statusColumnTable.position, statusColumnTable.createdAt);

  const plan = planDefaultColumnBackfill(rows as ColumnRow[]);

  for (const column of plan) {
    if (column.isNew) {
      await db.insert(statusColumnTable).values({
        projectId,
        name: column.name,
        slug: column.slug,
        color: column.color,
        position: column.position,
        isDefault: true,
      });
      continue;
    }

    const original = rows.find((r) => r.id === column.id);
    if (original && original.position !== column.position) {
      await db
        .update(statusColumnTable)
        .set({ position: column.position })
        .where(eq(statusColumnTable.id, column.id as string));
    }
  }

  return plan;
}
