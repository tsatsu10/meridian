### Database Scalability in Meridian — A Simple Guide

This explains how we scale data access as usage grows.

#### Current setup
- Drizzle ORM with SQLite/Neon/Postgres paths.
- Migrations and schema management in `apps/api/drizzle`.

#### How we scale
- Read/Write separation (use read replicas for heavy analytics where supported).
- Efficient queries: selective fields, proper filters, pagination.
- Caching where it helps (in‑memory or CDN for static content).
- Background jobs for heavy work (e.g., scheduled reports).

#### Practical tips
- Always paginate lists (tasks, projects, activities).
- Avoid N+1 queries; join or batch where needed.
- Add indices for frequent filters (workspaceId, projectId, status).

#### Monitoring
- Track slow queries and error rates.
- Use logs and dashboards to spot hotspots early.

See: `DATABASE_SCALABILITY_GUIDE.md` and `DATABASE_SCALABILITY_COMPREHENSIVE_VERIFICATION.md` for deep dives.


