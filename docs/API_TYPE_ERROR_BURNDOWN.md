# API Type-Error Burndown Plan: 973 → 0

**Goal:** eliminate all 973 TypeScript errors in `apps/api`, then flip the CI step
`Typecheck api` in `.github/workflows/ci.yml` from `continue-on-error: true` to blocking —
exactly like the web side was done in PR #33.

**Research snapshot (2026-07-10):** 973 errors across 171 files.
~424 errors sit in files knip proves are dead code (delete them), ~27 in one-shot
migration scripts (exclude them), leaving **~522 real errors in 96 live files**, most of
which fall into six mechanical patterns described below.

---

## 0. Ground rules — READ BEFORE EVERY PHASE

### The only commands that matter

```bash
# Typecheck (run from repo root; writes snapshot for analysis)
cd apps/api && npx tsc --noEmit > "$TEMP/api-e.txt" 2>&1; grep -c "error TS" "$TEMP/api-e.txt"

# Count errors per file (rank the worklist)
grep -oE "^src/[^(]+" "$TEMP/api-e.txt" | sort | uniq -c | sort -rn | head -30

# Bundle check (catches broken runtime imports tsc's path mapping can mask)
npm run build --workspace=@meridian/api

# Unit tests (pre-existing failures exist; only compare against baseline)
npm run test:run --workspace=@meridian/api
```

There is **no** `typecheck` trap on the API side (unlike web) — `npx tsc --noEmit` in
`apps/api` is the real check, same as `npm run typecheck --workspace=@meridian/api`.

### Hard rules (violating any of these = do it over)

1. **NEVER** add `// @ts-ignore`, `// @ts-expect-error`, or `// @ts-nocheck`. Zero exceptions.
2. **NEVER** spray `as any` to silence an error. `any`/`unknown` casts are allowed only at
   true data boundaries (raw SQL results, `JSON.parse`, third-party lib gaps) and each one
   needs a one-line comment saying why.
3. **NEVER** loosen a compiler flag. `strict` and `noUncheckedIndexedAccess` stay on.
4. **NEVER** edit `apps/api/src/database/schema.ts` (or `database/schema/*.ts`) to make code
   compile. The schema is the source of truth for the real database. If code references a
   column that doesn't exist in the schema, the CODE is wrong (see Phase 7 decision tree).
   The single allowed schema edit category: none in this plan.
5. **NEVER** run `drizzle-kit push`, `db:setup`, or any command that touches the database.
   This is a types-only effort.
6. **Windows/CRLF trap:** most files have CRLF line endings. Multi-line string replacement
   with `\n` literals silently no-ops. Either (a) use single-line replacements, (b) use
   `\r?\n` in regexes, or (c) after EVERY scripted edit, grep to confirm the change landed.
   If a scripted edit "succeeded" but the error count didn't move, this is why.
7. **Fix root causes, not symptoms.** If 10 errors share one bad type/signature, fix the
   type once. Before editing any file, read the whole function containing the error.
8. **When a fix reveals a runtime bug** (dead code path, wrong column, handler that can't
   work), fix the bug honestly or remove the dead affordance — do not paper over it.
   Precedent: PR #33 did exactly this on the web side.
9. **Checkpoint-commit** every ~50–100 errors cleared with the count in the message, e.g.
   `fix(api): guard drizzle returning() rows (522 -> 440)`. Never let more than ~150 errors
   of work sit uncommitted.
10. **Re-run the typecheck after every file or small batch.** Never assume a fix worked.
11. This repo lives in OneDrive which corrupts `.git` during heavy operations. Plain
    commits are fine; do NOT run `git gc`, history rewrites, or repacks locally.

### The fallout loop (use whenever a deletion/type-change breaks something else)

1. The new error names a file importing the deleted/changed symbol. Open that file.
2. If that file is itself dead (knip list, no importers) → delete it too.
3. If it's live → remove only the import + call sites, or adapt to the corrected type.
4. Re-run typecheck. Repeat until the count only goes down.

---

## Phase 0 — Branch + baseline

```bash
cd "<repo root>"
git checkout main && git pull
git checkout -b chore/api-typecheck-burndown
cd apps/api && npx tsc --noEmit > "$TEMP/api-e.txt" 2>&1; grep -c "error TS" "$TEMP/api-e.txt"
```

Expected count: **973** (if main moved since 2026-07-10 the count may differ slightly —
that's fine, the phases still apply). Also record the unit-test baseline:

```bash
npm run test:run --workspace=@meridian/api 2>&1 | tail -5   # note pass/fail counts
```

Known pre-existing failing API test files (NOT yours to fix, only don't add more):
auth-flow, ErrorHandler, create-task.

---

## Phase 1 — Delete knip-verified dead files (~424 errors, 71 error-files + ~147 clean dead files)

knip reports **218 unused files** in `apps/api` (no importers, not entry points). 71 of them
contain 424 of the 973 errors. Deleting dead code is the correct fix — this codebase already
had 537 dead web files removed the same way.

### 1.1 Regenerate the list fresh (do NOT reuse a stale list)

```bash
cd "<repo root>"
npx knip --workspace apps/api --include files 2>&1 | grep "^apps/api" > "$TEMP/knip-api.txt"
wc -l "$TEMP/knip-api.txt"    # ~218 expected
```

### 1.2 Verification protocol — run for EVERY file before deleting

knip is good but not infallible (dynamic imports, `require()` strings, npm-script wiring).
For each candidate `apps/api/<path>`:

```bash
base=$(basename <path> .ts)
# a) any static importer? (should print nothing or only the file itself / commented lines)
grep -rn "from ['\"].*${base}['\"]" apps/api/src --include=*.ts | grep -v "^apps/api/<path>"
# b) any dynamic import or require by string?
grep -rn "import(.*${base}\|require(.*${base}" apps/api/src --include=*.ts
# c) wired to an npm script?
grep -n "${base}" apps/api/package.json
```

- All three empty → **delete the file**.
- (a) shows only commented-out imports (e.g. `workspace/index.ts` has commented imports of
  `invite-user` / `accept-invitation`) → delete the file AND the commented import lines.
- (c) hits → do NOT delete; it goes to Phase 2 (scripts) or stays.
- Genuine live importer found → skip the file, leave it for Phases 3–8.

### 1.3 Deletion order and batching

Delete in batches of ~20 files, typecheck between batches (deletions can UNMASK errors in
survivors — that's the fallout loop). Suggested order (biggest error payoff first):

Dead files that carry the most errors (verify each per 1.2, then delete):

```
src/routes/roles-unified/index.ts            (37 errors)
src/pdf/controllers/pdf-generator.ts         (32)  # references 'projectTableTable' — never compiled
src/pdf/services/real-pdf-service.ts         (14)
src/pdf/index.ts
src/services/rbac/role-assignment-service.ts (28)
src/services/rbac/unified-role-service.ts    (21)
src/services/analytics/metrics-service.ts    (20)
src/performance/index.ts                     (20)
src/performance/controllers/performance-metrics.ts
src/routes/monitoring.ts                     (19)
src/services/reports/report-service.ts       (17)
src/services/WorkspaceService.ts             (15)
src/services/UserService.ts                  (13)
src/routes/metrics.ts                        (13)
src/routes/files.ts                          (13)
src/middlewares/rbac-unified.ts              (16)
src/utils/query-builders.ts                  (9)
src/services/auth/two-factor-service.ts      (10)  # delete with its only importer, dead routes/two-factor.ts
src/services/resources/resource-service.ts   (10)
src/monitoring/backup-manager.ts             (6)
src/utils/analytics-query-builder.ts         (6)
```

…then the remaining ~190 knip files that have no errors but are still dead weight
(all of `src/reports/controllers/*` if unreferenced by `src/reports/index.ts`, the unused
middlewares, `src/services/cache/*`, `src/tracing/*`, `src/utils/*` orphans, etc.).
The full authoritative list is whatever 1.1 regenerates — trust that plus 1.2, not this doc.

**Special caution files (pre-verified 2026-07-10, re-verify anyway):**
- `src/utils/lazy-loader.ts` — grep for `lazyLoaders`/dynamic loads before deleting.
- `src/middlewares/rbac-unified.ts` is imported ONLY by dead `routes/roles-unified/index.ts`
  → delete both together. `src/middlewares/rbac.ts` is LIVE (imported by analytics,
  milestone, project, task index files) — its errors are Phase 6 work, never delete it.
- `src/services/auth/two-factor-service.ts` is imported ONLY by dead `routes/two-factor.ts`
  → delete both together. The LIVE 2FA route is `src/auth/routes/two-factor.ts`
  (mounted at `/api/auth/two-factor`) — do not touch that one.
- Anything under `src/task/`, `src/workspace/`, `src/notification/` — these modules are
  core; double-check knip isn't confused by re-export barrels.
- `src/task/controllers/duplicate-task.ts` is genuinely unmounted (no route in
  `task/index.ts`). Deleting it removes the duplicate-task feature's dead server half —
  first grep the WEB app for a fetcher calling `/duplicate`; if the web calls it, the
  correct fix is to MOUNT it in `task/index.ts` instead of deleting.

### 1.4 Phase gate

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep -c "error TS"     # expect ≈ 549
npm run build --workspace=@meridian/api                        # must pass
npm run dev --workspace=@meridian/api &                        # boot check
curl -s localhost:3005/api/health | head -1                    # expect 200 JSON, then kill dev
```

Commit: `chore(api): delete knip-verified dead files (973 -> ~549 errors)`

---

## Phase 2 — Exclude one-shot migration scripts from typecheck (~27 errors)

`src/scripts/*.ts` are tsx-run one-off admin/migration scripts (`deploy-rbac-production`,
`run-rbac-unification-migration`, `verify-rbac-migration`, `verify-rbac-rollback`, etc.).
Several are wired to npm scripts so they can't be deleted, but they are not part of the
server program — the seeds directory is already excluded on exactly this precedent.

In `apps/api/tsconfig.json` add to `"exclude"`:

```json
"src/scripts/**"
```

**Exception check:** `grep -rn "from ['\"].*scripts/" apps/api/src --include=*.ts` — if any
live src file imports from `src/scripts/`, that file can't be excluded; move the shared
piece out of scripts/ first. (As of research: no such importer.)

Their `.rows` errors are real, by the way — postgres.js returns arrays, not `{rows}` —
so if anyone ever runs those scripts they'll misbehave. Out of scope; note it in the PR.

Gate: typecheck (expect ≈ 522), commit `chore(api): exclude one-shot scripts from tsc program`.

---

## Phase 3 — One-line root-cause fixes (~70 errors)

### 3.1 `LogCategory` is missing `'RBAC'` (63 errors, TS2345)

`src/utils/logger.ts:14`:

```ts
export type LogCategory = 'SYSTEM' | 'AUTH' | 'DATABASE' | 'API' | 'WEBSOCKET' | 'ERROR' | 'VALIDATION' | 'PERFORMANCE';
```

Add `'RBAC'`:

```ts
export type LogCategory = 'SYSTEM' | 'AUTH' | 'DATABASE' | 'API' | 'WEBSOCKET' | 'ERROR' | 'VALIDATION' | 'PERFORMANCE' | 'RBAC';
```

This is honest: dozens of RBAC call sites pass `'RBAC'` deliberately; the union simply never
caught up. BUT a handful of call sites are actually bugs with the wrong argument in the
category position — after the union fix, re-run tsc and individually repair the survivors:
- `Argument of type '"items"'` → caller passed a data field where category goes; move it
  into the `data` object and pass a real category.
- `Argument of type '{ category: string }'` → same: object in the wrong parameter slot.
- `Argument of type 'unknown'` in category position → caller swapped `error` and `category`.
Read each call, match the real signature `logger.error(message, data?, category?, context?)`.

### 3.2 node-cron namespace (3 errors, TS2503 in `digest-scheduler.ts`, `rule-scheduler.ts`)

`Cannot find namespace 'cron'` — the type annotations use `cron.ScheduledTask` but the
import is default-style. Fix the import in both files:

```ts
import * as cron from "node-cron";
```

(Verify how `cron` is used in each file first; if it calls `cron.schedule(...)` a namespace
import satisfies both value and type uses.)

### 3.3 isolatedModules re-export (2 errors, TS1205 in `middlewares/analytics-error-handler.ts:433`)

Wait — this file is on the knip dead list; it should already be deleted in Phase 1. If it
survived (has importers), change `export { X, Y }` to `export type { X, Y }` for type-only
names.

Gate: typecheck (expect ≈ 450), checkpoint commit.

---

## Phase 4 — Codemod A: `'error' is of type 'unknown'` in catch blocks (~34 live errors, TS18046 + ~26 TS2345 `unknown → Error`)

Every one is a `catch (error)` block using `error.message`, `error.stack`, or passing
`error` to something typed `Error`. There is no shared helper in live code — **create one**:

`src/utils/errors.ts` (new file):

```ts
/** Narrow an unknown catch value to a usable Error. */
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
```

Recipe per site (do NOT blanket-regex; read each):

```ts
// BEFORE
} catch (error) {
  logger.error("Failed to X", { error: error.message });
// AFTER
} catch (error) {
  logger.error("Failed to X", { error: errorMessage(error) });
```

```ts
// BEFORE (passing unknown where Error expected)
handleError(error, c);
// AFTER
handleError(toError(error), c);
```

A diagnostics-driven codemod is the efficient route (same technique as the web burndown):
write a `.cjs` script (NOT inline `node -e` — bash mangles backticks/`?.` on Windows) that
loads the tsc program, filters `getPreEmitDiagnostics` for codes 18046/2345 whose message
mentions `'error' is of type 'unknown'`, and rewrites `error.message` → `errorMessage(error)`
end-of-file-to-start. Add the import per touched file. Verify with tsc after; hand-fix
stragglers. Delete the codemod script when done.

Gate: typecheck (expect ≈ 390), checkpoint commit.

---

## Phase 5 — Codemod B: missing identifiers (~15 live errors, TS2304/TS2724)

`Cannot find name 'taskTable' / 'task' / 'user' / 'eq' / 'desc' / 'milestoneTable' ...`

Two flavors:

1. **Missing import** — the file uses `eq`/`desc`/`sql` (from `drizzle-orm`) or
   `taskTable`/`userTable`/`milestoneTable` (from `../../database/schema`) without importing.
   Fix: add to the existing import lines.
2. **Out-of-scope variable** — e.g. `src/project/controllers/archive-project.ts:152` uses
   `user` inside a `catch`/later scope where the `const [user]` from an earlier `try` isn't
   visible, or the audit-log call was pasted from another function. Read the function;
   either hoist the variable (`let user: ... | undefined` before the try) or re-derive it.
   Do not import something random just to make the name resolve.

`TS2724 'no exported member named X. Did you mean Y?'` — trust the suggestion after checking
schema.ts actually exports Y (e.g. `users` vs `user`).

Gate: typecheck, checkpoint commit.

---

## Phase 6 — The big one: unchecked index/destructure access (~190 live errors: TS18048 + TS2532 + TS18047)

Root cause: `noUncheckedIndexedAccess: true` + the pervasive drizzle patterns:

```ts
const [row] = await db.insert(t).values(v).returning();   // row: T | undefined
const list = await db.select()...; list[0].id;             // element: T | undefined
```

### Canonical recipes (pick by context, in this order of preference)

**R1 — mutation `.returning()` (insert/update/delete):** the row can only be missing if the
DB misbehaved → guard and fail loudly. This is the fix for `deletedTask`, `archivedProject`,
`newFile`, `newRole`, `restoredVersion`, `version`, etc.:

```ts
const [updated] = await db.update(t).set(v).where(w).returning();
if (!updated) {
  throw new HTTPException(500, { message: "Update returned no row" });
}
// `updated` is now narrowed for the rest of the scope
```

(If the file returns `c.json({error},500)` instead of throwing HTTPException, match the
file's existing style.)

**R2 — lookup `.limit(1)` selects:** absence is a real case → 404/guard:

```ts
const [project] = await db.select().from(projectTable).where(...).limit(1);
if (!project) {
  return c.json({ error: "Project not found" }, 404);
}
```

Many files already have this guard but then use `list[0].field` later instead of the
narrowed variable — replace `list[0].x` with the destructured, guarded variable.

**R3 — `arr[i]` in loops/reduces where the index is provably in range:** restructure to
`for (const item of arr)` / `arr.map((item) => ...)` so no index access happens. Only if
restructuring is genuinely awkward, use a local `const item = arr[i]; if (!item) continue;`.

**Never** fix these with `!` non-null assertions on mutation results you didn't guard —
assertions hide the 500-with-stack-trace we actually want.

### Worklist for this phase (the TS18048/TS2532-dominated files)

```
src/services/file-versioning/version-service.ts  (32)  # also has the v.version unknown cluster, see below
src/project/controllers/delete-project.ts        (18)
src/project/controllers/update-project.ts        (18)
src/project/controllers/archive-project.ts       (16)
src/middlewares/rbac.ts                          (15)  # user[0].id, roleAssignment[0].role patterns
src/rbac/index.ts                                (22)
src/services/rbac/permission-checker.ts          (21)
src/task/controllers/delete-task.ts              (9)
src/user-preferences/index.ts                    (9)
src/team/index.ts                                (6)
... (every remaining file in Appendix A with 18048/2532 errors)
```

`version-service.ts` extra cluster: `'v.version' is of type 'unknown'` (9×) — a query builder
returns an untyped row; find where `versions` is built (probably a raw/dynamic select at
line ~153, which also throws TS2322 on the query builder). Fix by giving the select an
explicit column map (drizzle `select({ version: filesTable.version, ... })`) so rows are
typed; then the `.map(v => ...)` sites type-check for free. Its `string | null` →
`string | undefined` returns: change the service's return DTO field to `x: string | null`
or coalesce `?? undefined` — check which shape callers expect first.

Gate: typecheck after each file; checkpoint commit every 50–100 (expect to land ≈ 170).

---

## Phase 7 — Schema-drift files (needs judgment; ~110 errors)

These files were written against tables/columns that don't exist. The DATABASE SCHEMA WINS.
Decision tree for every "Property X does not exist on table T" error:

1. Open the table in `src/database/schema.ts`. Does a differently-named column carry the
   same meaning (e.g. `assigneeId` vs `assignee`, `avatar` vs `avatarUrl`, `lastRunAt` vs
   `lastRun`, `createdAt` vs `timestamp`)? → rename the reference in code. TS2551's
   "Did you mean" is usually right — verify, then accept.
2. No equivalent column exists and the feature can be expressed with real columns →
   rewrite the query honestly against real columns.
3. No equivalent exists and the feature fundamentally needs the missing data → the endpoint
   never worked. Replace the broken branch with an explicit
   `return c.json({ error: "<feature> is not available" }, 501)` + `// TODO:` naming the
   missing column, and delete now-dead helper code below it. Note every 501 in the PR body.
   Do NOT add columns to the schema.

### 7.1 `src/settings/controllers/get-audit-logs.ts` (30 errors) — worst offender

Queries `activities` expecting `workspaceId, userEmail, action, entityType, entityId,
entityName, changes, ipAddress, userAgent`. The real `activities` table has only
`id, taskId, userId, type, content, metadata, createdAt`. This endpoint can never have
returned data.

Fix: rewrite the audit-log listing against what exists. Two real sources:
- `activities` (task-level activity): map `type`→action, `content/metadata`→details,
  join `users` on `userId` for the display name.
- `settingsAuditLog` (settings changes): has `userEmail, section, action, oldValue,
  newValue, metadata, createdAt` — note `createdAt`, NOT `timestamp` (that alone is 16 of
  the errors, spread between this file and `import-export.ts`).
Filters the schema can't support (entityType, ipAddress) → drop the filter parameters from
the endpoint honestly (and grep the web app for anything sending them; as of research the
web audit-logs page reads generic rows and survives).

### 7.2 `src/settings/controllers/role-manager.ts` (33 errors)

`getRoles()` selects from `customPermissionTable` (`custom_permissions`: per-user permission
rows with `userId, permission, ...`) but maps rows as if they were custom ROLE definitions
(`roleName, description, permissions, color`). There is no custom-roles table in the schema.

Fix: custom roles don't exist as data. Make `getRoles()` return only the predefined roles
array (already in the file) and make create/update/delete custom-role handlers return 501
per the decision tree. Check `settings/index.ts` for which handlers are actually routed,
and grep the web `roles-unified` settings page to confirm it tolerates an empty custom-role
list (it fetches and renders arrays; empty is fine).

### 7.3 `src/security-metrics/*` (~30 errors: index.ts 15, sessions.ts 9, gdpr.ts 4, two-factor.ts 3)

`sessions` table references to `createdAt`/`sessionId` that don't exist — open the real
`sessions` table in schema.ts, map to actual columns (likely `expiresAt`, `id`, `token`).
Same decision tree; the raw-SQL numbers dashboards can compute from real columns stay,
fabricated ones become 501/omitted fields.

### 7.4 `src/notification/services/rules/rule-engine.ts` (4) + `src/settings/controllers/advanced-search.ts` (9)

`tasks.assignee` → `tasks.assigneeId` (TS2551 suggestion is correct). In advanced-search
also `users.avatarUrl` → `users.avatar`. Where the code then treats `assigneeId` as an
email string, look at how the rest of the codebase resolves assignees (join on users) and
match it.

### 7.5 `src/reports/index.ts` (12)

`lastRun`/`nextRun` → real columns are `lastRunAt`/`nextRunAt`. Plus the usual guards.

### 7.6 `src/profile/*` (16), `src/templates/controllers/*` (15), `src/notification/services/notification-delivery.ts` (8), `src/utils/audit-logger.ts` (4), remaining TS2353 object-literal errors

Same treatment: each TS2353 "X does not exist in type" on a drizzle `.set()`/`.values()`
means the code invents a column — check schema, rename or drop the property. `updatedAt`
in `.set()` on tables that HAVE updatedAt is fine; the 5 TS2353 `updatedAt` errors are on
tables WITHOUT that column — remove the property.

Gate: typecheck (expect ≈ 60), checkpoint commit(s).

---

## Phase 8 — Long tail (~60 errors, files with 1–7 errors each)

Work down Appendix A rank order. Recurring recipes:

- **TS7006 implicit any** (7): add parameter types from the surrounding drizzle row type,
  e.g. `milestones.map((m) => ...)` → derive `type MilestoneRow = typeof milestoneTable.$inferSelect`
  and annotate. Never write `(m: any)`.
- **TS2769 no-overload** on `db.update(...).set(...)` / `.where(...)` chains (44): almost
  always caused by ONE bad property inside — usually `undefined` passed to a non-nullable
  column or a stray column name. Pull `.set({...})` object into a typed const to surface
  the precise field, then fix that field (coalesce, guard, or rename).
- **TS2367 no-overlap comparisons** (4): the comparison is dead code — read intent; either
  the union type is too narrow (widen the DECLARED type if other real values exist) or the
  branch is unreachable (delete it).
- **TS2345 `string | undefined → string`** (~20): a `c.req.param()`/`query()` result or an
  optional field feeding a required parameter → guard with early `return c.json({error},400)`
  when it's request input; `??` default only when a default is semantically correct.
- **`services/cache.ts` TS2783 duplicate keys** (2): `{ enabled: true, ttl: 300, ...config }`
  style spread-overwrite warnings — reorder so the spread comes first or remove the
  shadowed literals.
- **`utils/redis-client.ts` (8) / `services/redis-session-store.ts` (3)**: type the ioredis
  usage properly; if errors are `possibly undefined` on lazy singletons, add a
  `getRedis(): Redis` accessor that throws when unconfigured instead of `client!`.
- **`modules/upload/index.ts` (9)**: usual guards + probably `File | string` narrowing from
  `c.req.parseBody()` — narrow with `instanceof File`.

Gate: **0 errors**. Commit.

---

## Phase 9 — Flip CI, verify, PR

1. `.github/workflows/ci.yml` — the `Typecheck api` step: delete the
   `continue-on-error: true` line and update the comment (mirror what the web step looks
   like after PR #33).
2. Full gate, all must pass locally:
   ```bash
   cd apps/api && npx tsc --noEmit          # 0 errors
   npm run build --workspace=@meridian/api  # bundles
   npm run test:run --workspace=@meridian/api   # same-or-better vs Phase 0 baseline
   npm run dev --workspace=@meridian/api    # boots; GET /api/health -> 200; then stop
   ```
3. Push branch, open PR to main. PR body must list:
   - error count trajectory (973 → 0) and per-phase commits,
   - every deleted file group (knip evidence),
   - every endpoint stubbed to 501 in Phase 7 with its missing-schema reason,
   - runtime bugs fixed (wrong columns, dead queries),
   - test comparison against the Phase 0 baseline.
4. Confirm the PR's `Typecheck, test, build` check is green with the API step blocking.

---

## Appendix A — Ranked live-file worklist (after Phase 1 deletions + Phase 2 exclude)

96 files, ~522 errors. Numbers from the 2026-07-10 snapshot; re-rank from your own
`$TEMP/api-e.txt` as you go.

```
33 settings/controllers/role-manager.ts      → Phase 7.2
32 services/file-versioning/version-service.ts → Phase 6
30 settings/controllers/get-audit-logs.ts    → Phase 7.1
22 rbac/index.ts                             → Phases 3.1/6
21 services/rbac/permission-checker.ts       → Phases 3.1/6
18 project/controllers/delete-project.ts     → Phase 6
18 project/controllers/update-project.ts     → Phase 6
16 project/controllers/archive-project.ts    → Phases 5/6
15 middlewares/rbac.ts                       → Phase 6
15 security-metrics/index.ts                 → Phase 7.3
12 reports/index.ts                          → Phase 7.5
12 settings/controllers/import-export.ts     → Phases 6/7.1 (settingsAuditLog.createdAt)
11 services/rbac/role-audit-service.ts       → Phases 3.1/6
 9 modules/upload/index.ts                   → Phase 8
 9 security-metrics/sessions.ts              → Phase 7.3
 9 settings/controllers/advanced-search.ts   → Phase 7.4
 9 task/controllers/delete-task.ts           → Phase 6
 9 user-preferences/index.ts                 → Phase 6
 8 notification/services/notification-delivery.ts → Phase 7.6
 8 profile/controllers/get-profile.ts        → Phase 7.6
 8 profile/index.ts                          → Phase 7.6
 8 rbac/stats.ts                             → Phase 6
 8 utils/redis-client.ts                     → Phase 8
 7 project/controllers/update-project-settings.ts → Phase 6
 7 project/index.ts                          → Phase 6
 6 milestone/controllers/get-milestones.ts   → Phase 8 (TS7006)
 6 project/controllers/create-status-column.ts → Phase 6
 6 task/controllers/bulk-operations.ts       → Phase 6
 6 team/index.ts                             → Phase 6
 6 templates/controllers/get-template-stats.ts → Phase 7.6
 5 project/controllers/create-project.ts     → Phase 6
 5 project/controllers/get-project-overview.ts → Phase 6
 5 templates/controllers/get-template.ts     → Phase 8 (TS2769)
 4 notification/services/rules/rule-engine.ts → Phase 7.4
 4 project/controllers/teams/add-member.ts   → Phase 6
 4 project/controllers/teams/update-member-role.ts → Phase 6
 4 security-metrics/gdpr.ts                  → Phase 7.3
 4 templates/controllers/apply-template.ts   → Phase 6
 4 utils/audit-logger.ts                     → Phase 7.6
 3 monitoring/index.ts; notification/services/digest-scheduler.ts (3.2);
   project-notes/index.ts; project/controllers/export-project.ts;
   project/controllers/get-projects.ts; security-metrics/two-factor.ts;
   services/monitoring/sentry.ts; services/redis-session-store.ts;
   settings/controllers/localization.ts; templates/controllers/rate-template.ts;
   user/status/index.ts
 2 each: milestone/controllers/{delete,update}-milestone.ts; modules/file-versions/index.ts;
   notification/services/notification-grouper.ts; profile/controllers/get-experience.ts;
   routes/errors.ts; services/log-aggregation.ts; services/monitoring/monitoring-service.ts;
   services/storage/storage-service.ts; services/team-awareness/{activity-tracker,
   mood-tracker-service,skills-service}.ts; services/user-work-activity-service.ts;
   settings/controllers/email-templates.ts; task/controllers/{get-all-tasks,get-tasks,
   import-tasks,update-task}.ts; team/controllers/{create-team,update-team}.ts
 1 each: middlewares/{cache-middleware,error-handler,security-audit,security,
   sliding-window-rate-limiter}.ts; milestone/controllers/create-milestone.ts;
   modules/{files,system-health}/index.ts; notification/controllers/{alert-rules,
   archive-notification,get-notifications,unarchive-notification}.ts;
   notification/services/rules/rule-scheduler.ts (3.2);
   project/controllers/{delete-status-column,get-project-settings,teams/create-team}.ts;
   services/{file-storage.service,team-awareness/user-status-service,
   user-availability-service}.ts; settings/controllers/update-email-settings.ts;
   task/controllers/create-task.ts; task/index.ts; team/controllers/delete-team.ts;
   templates/controllers/{create-template,list-templates}.ts; user/status/get-status.ts
```

## Appendix B — Error-code → recipe index

| Code | Count (live) | Meaning | Recipe |
|---|---|---|---|
| TS2339 | 126 | property doesn't exist | Phase 7 decision tree (schema drift) or Phase 6 (narrowed-var reuse) |
| TS18048 | 125 | possibly undefined | Phase 6 R1/R2/R3 |
| TS2532 | 56 | object possibly undefined | Phase 6 (usually `arr[0].x`) |
| TS2769 | 44 | no overload matches | Phase 8 (extract `.set()` object, find the one bad field) |
| TS2345 | 41 | bad argument | 3.1 (LogCategory), Phase 4 (unknown→Error), Phase 8 (undefined→string) |
| TS18046 | 34 | value is unknown | Phase 4 (catch blocks), Phase 6 (untyped select in version-service) |
| TS2322 | 20 | bad assignment | null↔undefined coalescing; match the declared DTO |
| TS2551 | 19 | did-you-mean | Phase 7.4/7.5 — verify against schema then accept suggestion |
| TS2304 | 15 | cannot find name | Phase 5 |
| TS2353 | 9 | unknown object key | Phase 7.6 (invented columns in `.set()/.values()`) |
| TS18047 | 9 | possibly null | same recipes as 18048, null flavor |
| TS7006 | 7 | implicit any param | Phase 8 (`$inferSelect` row types) |
| TS2367 | 4 | impossible comparison | Phase 8 (dead branch or too-narrow declared type) |
| TS2503 | 3 | missing namespace | 3.2 (node-cron) |

## Appendix C — Facts the executor must not rediscover the hard way

- `noUncheckedIndexedAccess: true` is inherited from `packages/typescript-config/base.json`.
  It is the single biggest error driver and it STAYS ON.
- `esbuild` (npm run build) already passes — every error here is type-level; the plan's
  boot/build gates exist to catch deletions of things loaded dynamically.
- Web app is at ZERO errors with a BLOCKING CI step — do not break `packages/libs` or
  anything the web imports; after Phase 1 deletions, also run
  `cd apps/web && npx tsc --noEmit -p tsconfig.app.json` once to prove web is still 0.
- The generated Hono `AppType` in `packages/libs/src/hono.ts` intentionally does not
  resolve (`@meridian/api` has no types entry ON PURPOSE — adding one explodes the web
  typecheck). Don't "fix" that.
- Windows: write codemods as `.cjs` files and run `node script.cjs`; inline `node -e` with
  backticks/optional-chaining WILL be mangled by the shell.
- Background shell commands that pipe to `tail` buffer invisibly — redirect to a file and
  read the file.
```
