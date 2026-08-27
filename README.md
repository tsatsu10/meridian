# Meridian

Monorepo for the Meridian project management platform (`apps/api`, `apps/web`, `packages/*`).

## Prerequisites

- Node.js 22+
- PostgreSQL
- Redis (local default `redis://localhost:6379`)

## Install

```bash
npm ci
```

Copy env examples:

- `apps/api/.env.example` → `apps/api/.env`
- `apps/web/.env.example` → `apps/web/.env` (optional; Vite proxies `/api` in dev)

## Dev servers

| App | Command | Default URL |
|-----|---------|-------------|
| API | `npm run dev:api` | `http://localhost:3005` |
| Web | `npm run dev:web` | `http://localhost:5174` |

## Verify

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Database

See [`docs/migrations.md`](docs/migrations.md) for Drizzle vs manual SQL and which command to run. From `apps/api`: `npm run db:setup` (or `db:setup:full`).

## Docs

- API OpenAPI / Swagger: `apps/api/docs/`
- Web: `apps/web/docs/`
- Agent plans: `docs/superpowers/plans/`
