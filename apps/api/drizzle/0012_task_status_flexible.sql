-- Custom columns (status_columns) were always writable via
-- POST /project/:id/status-columns, but a task's `status` was a fixed
-- Postgres enum ("todo"|"in_progress"|"done") and the board's read path
-- (get-tasks.ts) hardcoded its custom-columns list to empty - so a created
-- column saved fine but never appeared, and no task could ever be moved
-- into one anyway (the enum would reject any other value). This makes
-- status a free-form column so it can also hold a status_columns.id.
--
-- No FK to status_columns: the 3 built-in defaults stay virtual (never
-- rows in status_columns - see DEFAULT_COLUMNS in get-tasks.ts), so a real
-- FK would reject every existing task's "todo"/"in_progress"/"done".
ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'todo';
--> statement-breakpoint

-- Data cleanup: the project seed script (03-projects-tasks.ts) inserted
-- "In Progress"/"In Review"/"Done" as non-default status_columns rows for
-- every seeded project - decorative duplicates of the virtual defaults,
-- whose slugs ("in-progress", "review") never matched any real task
-- status. Once get-tasks.ts starts reading real non-default rows, these
-- would render as permanently-empty phantom columns on every seeded
-- project's board. Matched precisely by name+slug so this can't touch a
-- genuine user-created column.
DELETE FROM "status_columns"
WHERE "is_default" = false
  AND "name" IN ('In Progress', 'In Review', 'Done')
  AND "slug" IN ('in-progress', 'review', 'done');
