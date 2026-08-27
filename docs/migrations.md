# Database migrations

**Which command?**

| Goal | From `apps/api` |
|------|-----------------|
| Fresh local bootstrap | `npm run db:setup` (or `db:setup:full` for the full seed set) |
| Shared / staging / prod schema change | `npm run db:generate` then `npm run db:migrate` |
| Ephemeral CI / E2E DB only | `npm run db:push` (workflows use `drizzle-kit push --force`) |

Do **not** use `db:push` as the long-lived path for shared environments — it can diverge from the Drizzle journal.

The API does **not** auto-run migrations on startup.

## Source of truth (Drizzle journal)

**Drizzle** under `apps/api/drizzle/` (SQL + `meta/_journal.json`) is the schema migration path for Meridian.

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Create a new journal migration from schema diffs |
| `npm run db:migrate` | Apply journaled Drizzle migrations |
| `npm run db:push` | Push schema directly (local/dev; E2E smoke/full CI) |
| `npm run db:migrate:manual` | Apply additive SQL under `apps/api/drizzle/manual/` |

## Additive manual SQL (`drizzle/manual/`)

Some changes cannot go through interactive `drizzle-kit generate` (e.g. enum renames). Those live as **additive** SQL in `apps/api/drizzle/manual/` and are applied by `npm run db:migrate:manual` (idempotent; recorded in `manual_migrations`).

`db:setup` / `db:setup:full` run this step after `drizzle-kit push`.

## Historical SQL (`src/database/migrations/`)

`apps/api/src/database/migrations/` holds older hand-written SQL (RBAC unification, team messages, etc.). It is **not** applied by `db:migrate:manual` or the current setup scripts.

Some filenames share numeric prefixes (e.g. two `005_*` files) — that is historical naming, not a second Drizzle journal. Do not run this folder blindly against a modern DB without an explicit ops runbook.

## Local setup

From `apps/api` (requires `DATABASE_URL` in `.env`):

```bash
npm run db:setup
# or fuller seed set:
npm run db:setup:full
```

Typical flow: `drizzle-kit push` → `drizzle/manual` (`db:migrate:manual`) → seeds.

## CI / E2E note

The web E2E smoke and full workflows use `npx drizzle-kit push --force` against a fresh Postgres service. That can diverge from a production DB that only ever ran journaled `db:migrate`. Prefer migrate-from-journal for shared environments; use push only for ephemeral test DBs.
