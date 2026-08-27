#!/usr/bin/env tsx
/**
 * Applies the hand-written SQL in drizzle/manual/.
 * Usage: npm run db:migrate:manual
 *
 * Some schema changes can't go through `drizzle-kit generate`: it stops on an
 * interactive prompt about a pre-existing enum rename, which no CI or piped
 * shell can answer. Those changes live in drizzle/manual/ as additive SQL.
 *
 * Until now nobody ran them automatically — 0001 and 0002 were each applied by
 * hand on one machine, which means any other environment silently lacks the
 * columns and tables they add. This runner closes that gap: it is idempotent,
 * records what it has applied in `manual_migrations`, and is wired into
 * db:setup so a fresh environment gets them without anyone remembering.
 */

import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import logger from "../utils/logger";

const MANUAL_DIR = join(process.cwd(), "drizzle", "manual");

/**
 * Splits a file into executable statements.
 *
 * Comments are stripped *before* splitting on semicolons, not after: these
 * files carry long explanatory headers, and prose containing a semicolon would
 * otherwise be cut in half and the tail handed to Postgres as SQL.
 */
export function statementsOf(sqlText: string): string[] {
  const withoutComments = sqlText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) {
        return "";
      }
      // Only strip a trailing comment when the line has no string literal, so
      // a legitimate "--" inside quoted text is left alone.
      const marker = line.indexOf("--");
      if (marker !== -1 && !line.includes("'")) {
        return line.slice(0, marker);
      }
      return line;
    })
    .join("\n");

  return withoutComments
    .split(";")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is missing. Set it in apps/api/.env");
  }

  const sql = postgres(databaseUrl, {
    ssl: databaseUrl.includes("localhost") ? false : "require",
    prepare: false,
    onnotice: () => {},
  });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS manual_migrations (
        filename text PRIMARY KEY,
        applied_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `;

    const applied = await sql<{ filename: string }[]>`
      SELECT filename FROM manual_migrations
    `;
    const alreadyApplied = new Set(applied.map((row) => row.filename));

    const files = readdirSync(MANUAL_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    let ran = 0;
    for (const filename of files) {
      if (alreadyApplied.has(filename)) {
        logger.debug(`⏭️  ${filename} (already applied)`);
        continue;
      }

      const body = readFileSync(join(MANUAL_DIR, filename), "utf8");

      // Each file is applied in one transaction so a partial failure leaves
      // nothing half-done and the filename unrecorded.
      await sql.begin(async (tx) => {
        for (const statement of statementsOf(body)) {
          await tx.unsafe(statement);
        }
        await tx`INSERT INTO manual_migrations (filename) VALUES (${filename})`;
      });

      logger.debug(`✅ ${filename}`);
      ran += 1;
    }

    logger.debug(
      ran === 0
        ? "Manual migrations: nothing to do."
        : `Manual migrations: applied ${ran} file(s).`,
    );
  } finally {
    await sql.end();
  }
}

// Only run when invoked directly. Without this guard, importing anything from
// this module — the splitter is unit-tested — would execute migrations as a
// side effect of the import.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main()
    .then(() => {
      // Explicit exit, like the seed scripts. Importing the shared logger
      // starts the log-aggregation service, whose timer keeps the event loop
      // alive forever — without this the script finishes its work and then
      // hangs, which is exactly how the seed scripts used to behave.
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Manual migrations failed:", error);
      process.exit(1);
    });
}
