# End-to-end tests (Playwright)

## Step 1 — Prerequisites

1. **PostgreSQL** running and `DATABASE_URL` set in `apps/api/.env`.
2. **JWT_SECRET** (32+ chars) in `apps/api/.env`.
3. From repo root, install **API** deps: `cd apps/api && npm install`.
4. Apply schema: `cd apps/api && npx drizzle-kit push` (or your usual migration flow).
5. Install **web** deps (workspace/monorepo tooling may differ): `cd apps/web && npm install`.

## Step 2 — Smoke test (sign-up → workspace)

Runs Chromium only; can start **API + Vite** for you:

```bash
cd apps/web
npm run test:e2e:smoke:with-api
```

Windows PowerShell does **not** support `VAR=value command`; use the script above or:

```powershell
$env:PLAYWRIGHT_START_API = "1"
npm run test:e2e:smoke
```

## Step 3 — Optional sign-in smoke

Requires a user that already exists in the DB:

```powershell
$env:E2E_SMOKE_EMAIL = "you@example.com"
$env:E2E_SMOKE_PASSWORD = "your-password"
npm run test:e2e:smoke:signin:with-api
```

If env vars are unset, the test is **skipped** (not failed).

## Step 4 — GitHub Actions

Workflow: `.github/workflows/web-e2e-smoke.yml`

- **Manual:** Actions → *Web E2E smoke* → Run workflow.
- **PR:** Add label **`run-e2e-smoke`** (and touch paths under `apps/web`, `apps/api`, or `packages/libs`).

## Step 5 — Security audit (API)

Web may have no `package-lock.json`; `npm audit` there can require generating a lockfile first.

```bash
cd apps/api
npm audit
# Review output; apply fixes carefully (avoid blind npm audit fix --force in production).
```

## Step 6 — HTML report

After a run:

```bash
cd apps/web
npx playwright show-report
```
