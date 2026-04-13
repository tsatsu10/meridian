/**
 * Idempotent DB fix: dedupe workspace_members and ensure unique (workspace_id, user_id).
 * Use when `drizzle-kit migrate` cannot run from 0000 on an existing database (schema already applied).
 *
 * Run: npx tsx src/scripts/ensure-workspace-members-unique.ts
 * Optional: DRY_RUN=1 only logs duplicate groups without writing.
 */

import { sql } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../database/connection";

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  await initializeDatabase();
  const db = getDatabase();

  const dupes = await db.execute(sql`
    SELECT workspace_id, user_id, COUNT(*)::int AS c
    FROM workspace_members
    GROUP BY workspace_id, user_id
    HAVING COUNT(*) > 1
  `);
  const rowCount = Array.isArray(dupes) ? dupes.length : (dupes as { rowCount?: number }).rowCount ?? 0;
  if (rowCount > 0) {
    console.log(`Found duplicate (workspace_id, user_id) groups (see query result)`);
    console.log(dupes);
  }

  if (dryRun) {
    console.log("DRY_RUN=1 — no changes applied");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM workspace_members
      WHERE id IN (
        SELECT id FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY workspace_id, user_id
              ORDER BY
                CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                joined_at DESC NULLS LAST,
                id
            ) AS rn
          FROM workspace_members
        ) sub
        WHERE sub.rn > 1
      )
    `);
    await tx.execute(sql.raw(`DROP INDEX IF EXISTS idx_workspace_members_workspace_user`));
    await tx.execute(sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_workspace_user_unique
      ON workspace_members USING btree (workspace_id, user_id)
    `));
  });

  console.log("workspace_members: duplicates removed (if any), unique index ensured.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
