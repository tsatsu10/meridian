# Meridian Backlog Burndown Plan

**Written 2026-07-11 against main `3048df7`. Every number below was measured, not assumed.**

This is an executable playbook. Each phase is independent, has exact commands, decision
tables with no ambiguity, and a machine-checkable exit gate. Follow phases in order unless
stated otherwise. If a step's verification fails and the recipe's fallback doesn't fix it,
**stop that phase, revert per §0.4, and record what happened** — do not improvise.

---

## Current state snapshot (the problem inventory)

| # | Issue | Size | Phase |
|---|-------|------|-------|
| 1 | `catch (error: any)` clauses | ~195 (subset of #3) | 1 |
| 2 | `noNonNullAssertion` in apps/api | 83 | 2 |
| 3 | `noExplicitAny` | 864 api + 978 web (382 in tests, 1,460 runtime) | 3–4 |
| 4 | a11y: `useSemanticElements` 75, `useKeyWithClickEvents` 61, `noLabelWithoutControl` 36 | 172 web | 5 |
| 5 | `noArrayIndexKey` | 114 web | 6 |
| 6 | `useExhaustiveDependencies` | 58 web | 7 |
| 7 | `noStaticOnlyClass` | 15 api + 3 web | 8 |
| 8 | Hard-skipped API test suites (`describe.skip`) | 34 files ≈ 800 tests | 9 |
| 9 | Web inline `it.skip` | ~23 sites | 9 |
| 10 | Drizzle config drift: 7 schema subfiles not in `drizzle.config.ts` | 24 tables (all EXIST in live DB — config-only drift) | 10 |
| 11 | TODO comments, incl. 3× "TODO: Add permission check" | 90 | 11 |
| 12 | E2E workflows exist but are label-gated and never run | 2 workflows | 12 |
| 13 | SendGrid API key absent (emails silently not sent; token persistence works) | config | USER |
| 14 | Full dev-boot click-through never done after the big changes | — | 12 |

Already at zero (do not re-litigate): npm audit vulnerabilities, open CodeQL alerts,
error-level Biome diagnostics, failing tests. CI blocks on lint + both suites.

---

## §0 Global rules — read before every phase

### 0.1 Hard invariants (violating any of these is failure)

1. **Never** add a new `any`, `as any`, `@ts-ignore`, or `@ts-expect-error`. If you cannot
   type something, use `unknown` and narrow, or leave the site untouched and record it.
2. **Never** edit `apps/web/src/routeTree.gen.ts` (generated; biome-ignored).
3. **Never** edit `apps/api/src/database/schema.ts` just to make code compile.
4. **Never** run `drizzle-kit push`, `db:setup`, or any DB-mutating command unless the
   phase explicitly says so AND the user approved in this session.
5. **Never** run two test suites concurrently (memory contention causes flakes).
6. **Never** force-push, rebase, or run `git gc` (repo lives in OneDrive; history rewrites
   are done only from a mirror outside OneDrive, and only with explicit user approval).
7. **Never** merge your own PR without the user explicitly approving that exact merge.
8. Behavior changes are bugs unless a recipe explicitly says the old behavior was wrong.
9. One rule (or one phase) per branch/PR. Small commits: ≤ ~20 fixed sites per commit.

### 0.2 The verification harness (memorize; used as "GATE" below)

```bash
# From repo root. GATE-API:
npm run typecheck --workspace=@meridian/api            # expect: exit 0, no "error TS"
npm run build     --workspace=@meridian/api            # expect: "Done in"
npm run test:run  --workspace=@meridian/api            # expect: 0 failed (55 passed | 34 skipped files)

# GATE-WEB (run tsc against tsconfig.app.json — bare tsc checks an EMPTY program):
cd apps/web && npx tsc --noEmit -p tsconfig.app.json   # expect: exit 0
npx vite build                                          # expect: "built in"
NODE_OPTIONS=--max-old-space-size=8192 npm run test:unit  # expect: 0 failed (73 passed | 3 skipped files)

# GATE-LINT (this is exactly what CI runs; must exit 0):
npx biome ci apps/web apps/api packages/libs

# Per-rule count (THE way to measure a rule — the summary reporter miscounts):
npx biome lint --only=<group>/<rule> --max-diagnostics=none <path> 2>&1 | grep -cE "<rule>"
```

Gotchas that will bite you if forgotten:
- Biome rule groups containing digits (`a11y`) do NOT match grep classes like `[a-zA-Z]+`.
  Use `[a-zA-Z0-9]+` in any grep for rule names.
- Local files are CRLF (OneDrive/Windows checkout); Biome formatter output is LF. Format
  complaints about files you didn't touch are line-ending display noise — trust `biome ci`'s
  exit code, and let git normalize on commit.
- CI pins Biome **1.9.4** (`.github/workflows/ci.yml`). Config is 1.x schema. Do not
  upgrade Biome as a side effect of anything.
- After fixing sites in a file, run `npx biome format --write <file>` before committing,
  or `biome ci` fails on formatting.

### 0.3 Batch loop (use for every mechanical phase)

```text
1. git checkout main && git pull && git checkout -b <phase-branch>
2. Get the full site list:  biome lint --only=<rule> --max-diagnostics=none <scope>
3. Take the next ≤20 sites (group by file). Apply the phase's recipe to each.
4. biome format --write <changed files>
5. Run the relevant GATE(s). Green → commit. Red → fix or `git checkout -- <file>` the
   offender and record it in the PR description under "Deferred sites".
6. Repeat until the rule count for the scope is 0 (or only recorded deferrals remain).
7. Promote the rule in biome.json from "warn" to error — i.e. DELETE its "warn" line so
   it reverts to the recommended severity (see §13) — run GATE-LINT, push, open PR.
```

### 0.4 Rollback

- Unstaged damage: `git checkout -- <file>` (single file) or `git checkout -- .`
- Bad commit not pushed: `git reset --soft HEAD~1`, fix, recommit. (Do NOT use `--hard`
  unless you intend to lose the work.)
- Bad commit pushed: `git revert <sha>` and push the revert. Never force-push.

---

## Phase 1 — `catch (error: any)` → `unknown` (~195 sites, mechanical)

Both workspaces are `strict: true`, so a bare `catch (error)` types the variable
`unknown`. Removing `: any` therefore forces narrowing at every `error.message` /
`error.code` usage — that's the point.

**Step 1.** Create the shared helper once per workspace (check it doesn't already exist:
`grep -rn "getErrorMessage" apps/api/src/utils apps/web/src/lib`):

```ts
// apps/api/src/utils/error-utils.ts  (and apps/web/src/lib/error-utils.ts)
/** Narrow an unknown catch value to a printable message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Narrow to an Error instance (wraps non-Errors). */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(getErrorMessage(error));
}
```

**Step 2.** Site recipe. Find sites: `grep -rn "catch (\w*: any)" apps/api/src apps/web/src`.

| Body uses | Rewrite to |
|---|---|
| `error.message` only | `catch (error) { ... getErrorMessage(error) ... }` |
| `error.message` + `error.stack`/`instanceof` | `catch (error) { const err = toError(error); ... err.message / err.stack ... }` |
| `error.code` / `error.status` (e.g. postgres, HTTP) | `catch (error) { const code = error instanceof Error && "code" in error ? (error as Error & { code?: string }).code : undefined; ... }` — if this cast-shape appears ≥3 times, add a `getErrorCode(error: unknown): string \| undefined` helper next to `getErrorMessage` instead |
| rethrows or ignores the value | just `catch (error)` (or `catch {}` if unused) |
| `HTTPException` re-thrown untouched first (`if (error instanceof HTTPException) throw error;`) | keep that line; it already narrows |

**GATE:** GATE-API + GATE-WEB after each batch. `logger.error("msg:", error)` calls accept
`unknown` fine (logger takes `any` today — do not fix the logger signature in this phase).

**Exit:** `grep -rc "catch (\w*: any)" apps/api/src apps/web/src` totals 0.

---

## Phase 2 — apps/api `noNonNullAssertion` (83 sites)

Same playbook that took web from 49→0. List sites:

```bash
npx biome lint --only=style/noNonNullAssertion --max-diagnostics=none apps/api 2>&1 \
  | grep -oE "apps/api[^ ]+:[0-9]+:[0-9]+" | sort -u
```

Decision table (match the site's pattern top-down; use the FIRST row that applies):

| Pattern at site | Fix |
|---|---|
| `if (map.has(k)) return map.get(k)!` | `const v = map.get(k); if (v !== undefined) return v;` |
| `map.get(k)!.push(x)` after an ensure-`set` | `let b = map.get(k); if (!b) { b = []; map.set(k, b); } b.push(x);` |
| `arr.find(...)!` | `const found = arr.find(...); if (!found) throw new HTTPException(404, { message: "<thing> not found" });` — pick 404 for lookups of client-supplied ids, 500 (`Internal error: <invariant>`) for internal invariants |
| `row[0]!` after an insert `.returning()` | `const [row] = await ...returning(); if (!row) throw new Error("insert returned no row");` |
| `process.env.X!` | read once at module top: `const X = process.env.X; if (!X) throw new Error("X env var is required");` — but NEVER do this for optional config; check how the value is consumed first |
| test file: value asserted then used (`expect(x).toBeDefined(); use(x!)`) | `if (!x) throw new Error("<what> not found"); use(x);` |
| test file: deferred assignment (`let p: T; act(() => { p = ... }); await p!` ) | declare with definite assignment: `let p!: T;` and drop the use-site `!` |
| anything else | write the guard that makes the invariant explicit; if you can't state the invariant, leave the site, record it in the PR |

**GATE:** GATE-API per batch. **Exit:** rule count 0 for apps/api → delete the
`apps/api` override block for `noNonNullAssertion` in `biome.json` → GATE-LINT.

---

## Phase 3 — `noExplicitAny`, runtime code (1,460 sites) — the big one

Work **file-clusters, largest first** (biggest wins, coherent context). Measured top files:

```text
apps/api/src/settings/index.ts                      102
apps/web/src/components/kanban-board/index.tsx       39
apps/api/src/utils/logger.ts                         34
apps/api/src/utils/errors.ts                         29
apps/api/src/routes/team-awareness/core.ts           28
apps/web/.../column-header.tsx                       27
apps/api/src/dashboard/.../get-analytics-enhanced.ts 26
apps/web/.../_layout.index.tsx                       21
apps/web/src/lib/permissions/index.ts                19
apps/web/src/lib/api-client.ts                       19
```

Regenerate the list before starting (`$TEMP/any-sites.txt` recipe):

```bash
npx biome lint --only=suspicious/noExplicitAny --max-diagnostics=none apps/api apps/web 2>&1 \
  | grep -oE "apps[^ ]+\.tsx?:[0-9]+" | grep -vE "test\.|__tests__|tests/" \
  | awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

Pattern census of the whole backlog (use to route each site to a recipe):
`: any` param/var 842 · `as any` 615 · `catch(error: any)` 195 (Phase 1 clears these) ·
`: any[]` 140 · `Record<string, any>` 132 · generic `<any>` 57 · `(c: any)` 6.

### Recipes (apply the first that matches)

**R1 — Hono context `(c: any)`:** `import type { Context } from "hono";` →
`(c: Context)`. If the handler reads `c.get("userEmail")` etc. and tsc complains about
context vars, the repo already augments Hono's ContextVariableMap — search
`grep -rn "ContextVariableMap" apps/api/src` and import nothing extra; just use `Context`.

**R2 — DB row shapes:** a variable holding drizzle rows typed `any`/`any[]`:
`typeof <table>.$inferSelect` (single) or `(typeof <table>.$inferSelect)[]` (array).
Insert payloads: `typeof <table>.$inferInsert`. The table objects come from
`../../database/schema` (or the `schema/*.ts` subfile the file already imports).

**R3 — `Record<string, any>`:** if values are only passed through (logged, spread,
serialized) → `Record<string, unknown>`. If properties are READ (`obj.foo.bar`) → define
a local `interface`/`type` with the fields actually read (search the function body for
every `x.` access to enumerate them). Never guess fields that aren't accessed.

**R4 — `as any` on a function argument:** look at the callee's signature. Usually the
correct fix is on the CALLEE (its param is too narrow or wrongly typed), not the caller.
If the callee is third-party, type the value properly before the call instead.

**R5 — JSON / request bodies:** `const body = await c.req.json()` used with property
access → declare the expected shape:
`let body: { name?: string; ... };` listing only fields the code reads (this exact
pattern was applied in `apps/api/src/team/controllers/update-team.ts` — copy its style).
If the route has a zod validator (`zValidator`), prefer `c.req.valid("json")` which is
already typed — check `grep -n "zValidator" <file>` first.

**R6 — React props/state `any`:** find the actual component/data shape: what does the
parent pass? What does the fetcher return? Web fetchers carry local request/response
types (see `apps/web/src/fetchers/**`) — import those. If the honest type is genuinely
polymorphic, use a generic parameter, not `any`.

**R7 — `any[]` accumulator arrays:** type from what gets pushed:
`const out: Array<{ id: string; ... }> = []` — enumerate from the `push` call sites.

**R8 — third-party callback params (Sentry, etc.):** import the lib's types
(`import type * as Sentry from "@sentry/node"` → `Sentry.Event`). If the lib exports no
usable type and the body reads ≤3 fields, write a minimal local interface (the
`LayoutShiftEntry` pattern in `apps/web/src/hooks/use-performance-monitoring.ts`).

**R9 — truly dynamic values (parsers, sanitizers walking arbitrary objects):**
`unknown` + type guards (`typeof x === "object" && x !== null`,
`Array.isArray(x)`). See `redactSensitive` in `apps/api/src/utils/logger.ts` as the
house style.

**Special case — `apps/api/src/utils/logger.ts` (34) and `errors.ts` (29):** their
public signatures (`data?: any`) are depended on by hundreds of call sites. Change the
public params to `unknown` (accepts everything, so call sites stay valid), then fix the
internal usage with R9. Do these two files in their own commit and run the FULL
GATE-API after.

**GATE:** relevant workspace gate per batch. **Exit for Phase 3:** runtime `any` count 0
(test files excluded).

---

## Phase 4 — `noExplicitAny` in tests (382 sites)

Lower risk, same recipes, plus:

| Pattern | Fix |
|---|---|
| `(global.fetch as any).mockResolvedValueOnce(...)` | `vi.mocked(global.fetch).mockResolvedValueOnce(...)` after `global.fetch = vi.fn()` — if TS complains about Response shape, build the stub with `{ ok: true, json: async () => data } as unknown as Response` is FORBIDDEN (as any-adjacent); instead type the mock: `global.fetch = vi.fn<typeof fetch>()` and return `new Response(JSON.stringify(data))` |
| mock DB chain objects typed `any` | type as the mock's own shape: `ReturnType<typeof createMockDb>` (export that type from `tests/helpers/test-database.ts` once) |
| `let result: any` | `let result: unknown` + assertion-side narrowing (`expect(result).toEqual(...)` accepts unknown) |
| test fixture literals typed `any` | remove the annotation entirely — inference from the literal is the correct type |

**Exit:** total `noExplicitAny` = 0 → delete its `"warn"` line in biome.json → GATE-LINT
must still exit 0 (the rule is recommended=error by default).

---

## Phase 5 — a11y trio (web, 172 sites)

Do these three together per file (they cluster in the same components).

**5a `useKeyWithClickEvents` (61):** a non-button element has `onClick` but no keyboard
handler.

- FIRST choice: if the element is a leaf (no nested interactive children) and behaves
  like a button → convert to `<button type="button">` with the old classes
  (this also clears `useSemanticElements` on the same element). Check the DOM shape a
  test queries before/after (`getByRole`).
- If it must stay a `<div>` (has nested buttons/links inside — nested interactive
  elements are invalid HTML in a button):
  ```tsx
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      <same handler as onClick>();
    }
  }}
  ```
  (Copy the exact idiom from `apps/web/src/components/kanban-board/task-card.tsx`.)

**5b `useSemanticElements` (75):** `role="button"` on a div → `<button type="button">`
if leaf (see above). `role="list"`/`"listitem"` → `<ul>/<li>` (reset styles with
`list-none p-0 m-0` if visuals shift). `role="region"` with label → `<section>`.
`role="banner"` → `<header>` only when it is the page-level header, otherwise drop the
role. If conversion breaks a test that queries by role, the ROLE STILL EXISTS implicitly
(button→button, ul→list) — update the test only if it queried the tag name.

**5c `noLabelWithoutControl` (36):** a `<label>` with no control.

- Label describes an adjacent `<input>`/`<select>`/`<textarea>` → give the control an
  `id` and the label `htmlFor={id}` (ids must be unique — derive from a stable name, not
  an array index).
- Label is actually a section heading with no control at all → change the tag to
  `<p>`/`<span>` with the same classes.
- Label wraps a custom component (shadcn `<Input>`) → those forward ids; `htmlFor` +
  `id` prop still works.

**GATE:** GATE-WEB per batch (a11y refactors are exactly where component tests catch
regressions — 991 tests must stay green). **Exit:** all three rules count 0 → remove
their three `"warn"` lines.

---

## Phase 6 — `noArrayIndexKey` (114, web)

For each site look at what's being mapped:

| Mapped data | Key to use |
|---|---|
| items with `id` | `key={item.id}` |
| items with unique `name`/`label`/`value` (verify uniqueness by reading where the array is built) | `key={item.name}` |
| primitive string arrays that are static constants (`["a","b"].map`) | `key={s}` (the string itself) |
| skeleton/placeholder rows generated by `Array.from({length: n})` | keep index BUT make it explicit and suppressed: `// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder` — this is the ONLY sanctioned suppression in this phase |
| genuinely unkeyed dynamic data (rare) | build a composite: `key={`${item.date}-${item.type}`}` from fields that identify the row |

**Do not** invent keys from `Math.random()` or `Date.now()` (worse than index keys).
**GATE:** GATE-WEB. Reordering/drag-drop lists (kanban, backlog) are the risk area — after
changing keys in those, manually run the kanban tests:
`npx vitest run src/components/kanban-board` from apps/web.
**Exit:** count 0 → remove its warn line.

---

## Phase 7 — `useExhaustiveDependencies` (58, web) — HIGHEST RISK, go slow

Never batch more than ONE component per commit. There is prior art in this repo:
`docs/EXHAUSTIVE_DEPS_GUIDE.md` — read it first; where it conflicts with this table,
follow this table. For each diagnostic, Biome names the missing/extra dep. Decide:

| Situation | Fix |
|---|---|
| Missing dep is a stable setter (`setX` from useState) or a ref | add it to the array — provably safe, zero behavior change |
| Missing dep is a primitive read inside the effect | add it; think: "should this effect re-run when it changes?" — if yes it was a stale-closure BUG (say so in the commit message); if no, the effect body should not read it — restructure |
| Missing dep is an object/array/function recreated each render | do NOT just add it (infinite loop). Wrap the source in `useMemo`/`useCallback` with ITS correct deps, then add the memoized value |
| Missing dep is a function defined in the component and used only by this effect | move the function INSIDE the effect |
| Effect intentionally runs once (mount-only) but reads changing values | keep `[]` and suppress with a reason: `// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only <explain what and why>` — allowed only when re-running would be WRONG, not merely unnecessary |
| Extra dep flagged (dep not used) | remove it |

**GATE per component:** GATE-WEB **plus** manually eyeball the component's behavior
description — if the effect fetches, confirm the test that covers it still passes; if no
test covers it, note that in the PR. If a change makes any test time out (a render
loop!), revert that one change immediately.
**Exit:** count 0 → remove warn line.

---

## Phase 8 — `noStaticOnlyClass` (15 api + 3 web)

These are class-as-namespace services (e.g. `KudosService.giveKudos()`), consistent and
intentional. Convert one file per commit:

1. `class X { static a() {...} private static b() {...} }` becomes:
   ```ts
   function b() { ... }            // private statics → module-local functions
   export const X = {              // same name so all call sites keep working
     async a() { ... },            // statics → object methods
   };
   ```
2. Inside method bodies, replace `X.privateMethod(...)`/`this.privateMethod(...)` with
   the bare local `privateMethod(...)`; replace cross-references `X.otherPublic()` with
   `X.otherPublic()` (unchanged — the const exists).
3. Static PROPERTIES holding state become module-level `let`/`const` above the object.
4. Verify call sites need no change: `grep -rn "<ClassName>\." apps -l` and confirm only
   usage as `X.method(...)` (constructor usage `new X()` would mean it is NOT
   static-only — skip the file and record it).

**GATE:** full workspace gate per file. **Exit:** count 0 → remove warn line.

---

## Phase 9 — Skipped-test triage (34 API suites ≈ 800 tests, + web inline skips)

Rule of decision for each `describe.skip` file (read the file header + what it imports):

| Category | How to recognize | Action |
|---|---|---|
| **A. Aspirational** — tests for features that were never implemented | header comment like "not yet implemented"; imports functions that don't exist in the source module (verify: `grep -n "<imported name>" <source file>` finds nothing) | **DELETE the test file.** Testing vaporware is negative value. Most of `apps/api/src/lib/__tests__/*-system.test.ts` and `*-routes.test.ts` are this category (~20 files) |
| **B. DB-integration hard-skipped** | imports `getDatabase`/`initializeDatabase` and touches real tables (goals, project-crud, task-management, time-tracking, workspace-operations, rbac-permissions, two-factor, auth) | convert to the repo's gated pattern (copy from `src/auth/__tests__/authentication-flow.test.ts`): <br>`const dbAvailable = await initializeDatabase().then(() => true).catch(() => false);`<br>`describe.skipIf(!dbAvailable)("...", () => {...})`<br>Then RUN them with the test DB up and fix real failures (they've been rotting) |
| **C. Broken-but-valuable unit tests** | no DB, tests real exported functions, but skipped due to old failures | un-skip, run the single file, fix assertions per current behavior (same as the 15-file web repair: the failure usually names exactly what changed) |

Process: one file per commit. For category B, the test DB is
`postgresql://postgres:test@localhost:5432/meridian_test` (from `src/tests/setup.ts`);
creating it: `psql -U postgres -c "CREATE DATABASE meridian_test;"` then the suite's own
setup runs migrations — if it doesn't, STOP and record (do not hand-run drizzle push, see
§0.1.4).

Web inline `it.skip` sites (~23): each has a bracketed reason (`[HOVER INTERACTION]`,
`[ASYNC ISSUE]`). The email-verification-banner precedent proved these are fixable:
`vi.useFakeTimers({ shouldAdvanceTime: true })` for timer deadlocks; `await user.hover()`
+ `findByRole` with timeout for hover reveals. Fix or delete — do not leave skipped
without a written reason that survives review.

**Exit:** zero `describe.skip(` in apps/api (`grep -rc "describe.skip(" apps/api/src` = 0);
every remaining skip is a `skipIf` with an environment reason or an `it.skip` with a
tracked justification. Full suites green.

---

## Phase 10 — Drizzle config completeness (config-only drift)

Facts (verified 2026-07-11): all tables from the 7 subfiles EXIST in the live DB, but the
subfiles are not in `drizzle.config.ts` `schema:` — so future `drizzle-kit push` will not
manage them (and could even see them as strays to DROP — that is the danger).

1. For each of `files.ts, goals.ts, rbac-unified.ts, smart-profile.ts, tasks.ts,
   team-awareness.ts, users.ts` in `apps/api/src/database/schema/`:
   - Check for duplicate table definitions vs `schema.ts`:
     `tasks.ts` defines `tasks` and `users.ts` defines `users` — `schema.ts` ALSO defines
     task/user tables (`taskTable`, `userTable`). Two drizzle definitions of the same SQL
     table = drizzle-kit error or double-management. For each duplicate, find which
     definition runtime code imports (`grep -rn "schema/users\"" apps/api/src`) — the one
     with **0 runtime importers** (measured: tasks.ts 0, users.ts 0) should be DELETED,
     and its file removed, after confirming nothing imports it (incl. other schema files:
     `grep -rn "from \"./users\"\|from \"./tasks\"" apps/api/src/database/schema/`).
   - Non-duplicates (files, goals, rbac-unified, smart-profile, team-awareness): add the
     file path to the `schema:` array in `drizzle.config.ts`, exactly like
     `email-verification.ts` is wired.
2. Verify: `cd apps/api && npx drizzle-kit check` → "Everything's fine".
3. Then run `npx drizzle-kit push --dry-run` if supported, else run
   `npx drizzle-kit generate` into a scratch dir and READ the SQL: it must be empty or
   purely additive for these tables. **If it contains any DROP, STOP** — do not apply;
   report the diff to the user. (This is the one phase where a wrong move destroys data.)
4. Do NOT run an actual `push` without the user's explicit go in that session.

**Exit:** drizzle.config lists every schema file that defines a live table; kit check
green; no destructive pending diff.

---

## Phase 11 — TODO triage (90 comments)

Priority order (these are the security-relevant ones — do them first):

1. **3× "TODO: Add permission check"** — find them:
   `grep -rn "TODO: Add permission check" apps/api/src`. For each: identify the route,
   find the sibling routes' guard (`requireWorkspacePermission` / `requirePermission` in
   `middlewares/rbac.ts`) and add the same guard with the permission that matches the
   action (read → view permission, mutate → manage permission). Add a test that a
   member-role user gets 403. If the correct permission is ambiguous, list the route and
   both candidate permissions in the PR for the user to pick.
2. "TODO: Fetch actual role from user roles table" / "Fetch from user permissions" (4) —
   these mean an endpoint returns hardcoded role/permission data. Verify what it returns
   today; if it's fake data feeding the UI, either implement the real query (the tables
   exist per Phase 10) or make the endpoint honestly return 501 — decide by whether the
   web UI calls it (grep the path in apps/web/src/fetchers).
3. Remaining ~83: build an inventory table (file, line, text, category: dead-feature
   reference / real gap / stale). Delete stale ones referring to removed features
   (chat/websocket broadcast TODOs). Convert real gaps into GitHub issues
   (`gh issue create`) and REPLACE the comment with the issue link. A TODO without an
   issue link should not survive this phase.

**Exit:** `grep -rn "TODO\|FIXME" apps/api/src apps/web/src --include="*.ts" --include="*.tsx" | grep -vE "__tests__|\.test\." | wc -l`
≤ 10, every survivor carrying an issue URL.

---

## Phase 12 — Prove it runs: e2e + boot click-through

1. Boot both servers (Postgres service must be Running — needs admin/UAC):
   `npm run dev --workspace=@meridian/api` and `npm run dev --workspace=@meridian/web`.
2. Click-through checklist (from the original cleanup plan): sign-in (+2FA), workspace
   switch, project board, create/edit/duplicate task, comments + attachment upload,
   milestones, labels, backlog, search, calendar, time tracking start/stop, notifications,
   goals, analytics + PDF export, settings, teams, favorites, landing page. Record
   anything broken as a GitHub issue; fix crashes in this phase, defer cosmetics.
3. E2E smoke locally: `npm run test:e2e:smoke --workspace=@meridian/web` (needs both
   servers). Fix failures.
4. In CI: e2e workflows are label-gated. Add the `run-e2e-smoke` label to any open PR
   (or `gh workflow run web-e2e-smoke.yml`) and confirm the workflow actually passes on
   a runner. If it never has, treat its failures as environment setup work (seeded user,
   DATABASE_URL service container) — read the workflow file and satisfy what it expects.

**Exit:** click-through clean, smoke e2e green locally AND in one CI run.

---

## Phase 13 — Ratchet promotion & definition of done

After each phase's rule hits 0, its `"warn"` line is deleted from `biome.json`
(§13 = the running checklist):

- [ ] Phase 2 → remove `overrides[].linter.rules.style.noNonNullAssertion` (api block)
- [ ] Phase 3+4 → remove `suspicious.noExplicitAny`
- [ ] Phase 5 → remove `a11y.useSemanticElements`, `a11y.useKeyWithClickEvents`, `a11y.noLabelWithoutControl`
- [ ] Phase 6 → remove `suspicious.noArrayIndexKey`
- [ ] Phase 7 → remove `correctness.useExhaustiveDependencies`
- [ ] Phase 8 → remove `complexity.noStaticOnlyClass`

When ALL are removed, biome.json's `linter.rules` should be back to
`{ "recommended": true }` plus nothing. Run GATE-LINT: `biome ci` exit 0 with **0 errors
and ~0 warnings**.

**Global definition of done**
- `npx biome ci apps/web apps/api packages/libs` → exit 0, 0 errors, 0 warnings
- Both suites green with **no `describe.skip`** and no unexplained `it.skip`
- `npm audit` → 0 (re-check; new advisories appear over time — Dependabot alerts are ON)
- 0 open CodeQL alerts (scans run on every push to main)
- drizzle config manages every live table; `drizzle-kit check` green
- TODOs ≤ 10, all issue-linked
- e2e smoke green in CI at least once
- ~~SendGrid key~~ → **USER ACTION**: create a SendGrid API key, set `SENDGRID_API_KEY`
  and `FROM_EMAIL` in `apps/api/.env` (never commit), restart API, then run Phase 9's
  email-service tests un-skipped to confirm delivery.

---

## Appendix A — Known traps (every one of these burned a previous session)

1. `apps/web/tsconfig.json` is solution-style — bare `tsc --noEmit` passes an EMPTY
   program. Always `-p tsconfig.app.json`.
2. Biome unsafe autofixes damage JSX component props: they stripped `role=` from
   RBAC components and `autoFocus` a test depended on. Never bulk-`--unsafe` a11y rules;
   fix per-site.
3. The Biome summary reporter's per-rule numbers are wrong. Count with
   `lint --only=<rule> ... | grep -c`.
4. `a11y` in grep character classes needs `0-9`.
5. Vitest full-suite OOM/hang history: one runaway test (infinite render loop) looked
   like a config problem for weeks. If a suite hangs, diff completed-vs-all test files
   from the log; suspect a single test before touching memory settings.
6. jsdom + fake timers deadlock async userEvent — use
   `vi.useFakeTimers({ shouldAdvanceTime: true })`.
7. `Map.forEach((value) => ...)` converted to `for..of map` iterates TUPLES — use
   `.values()`.
8. Headers (undici types in api) has no `.entries()`/iterator — keep `forEach` there.
9. OneDrive corrupts `.git` under heavy operations. If refs break: stop, do not gc;
   re-clone outside OneDrive and swap `.git` (see memory/onedrive-git-corruption).
10. npm workspace installs can nest a package away from a hoisted consumer
    (drizzle-kit couldn't see drizzle-orm). Fix = regenerate the whole lockfile.
11. CI pins Biome 1.9.4; `setup-biome: latest` = 2.x = config schema rejection.
12. `docs/**` is biome-ignored — this file cannot fail lint.

## Appendix B — items only the user can do

1. Provide/approve a SendGrid API key (or choose a different provider — SMTP/SES stubs
   exist unimplemented in `services/email-service.ts`).
2. Approve any `drizzle-kit push` (Phase 10 step 4) after reviewing the generated SQL.
3. Approve every PR merge.
4. Optional: move the repo out of OneDrive (eliminates trap 9 permanently).
