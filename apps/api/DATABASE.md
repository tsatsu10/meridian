# 🗄️ Meridian Database Management

This document explains how to manage the Meridian PostgreSQL database (Neon) during development and production.

## 📋 Available Commands

### Database Scripts (from apps/api)

```bash
# Generate new migration files
npm run db:generate

# Run pending migrations
npm run db:migrate

# Push schema changes directly (development only)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed

# Seed project templates
npm run db:seed:templates

# Create demo workspace
npm run db:create-workspace

# Reset database completely (migrate + seed)
npm run db:reset
```

## 🔄 Recommended Workflow

### 1. Before Making Schema Changes

**PostgreSQL (Neon) provides automatic backups:**
- **Point-in-time recovery** (PITR) for the last 7 days (Pro plan)
- **Automatic daily backups** via Neon dashboard
- **Branch snapshots** for testing schema changes

**Manual backup (optional):**
```bash
# Export current database (requires DATABASE_URL)
cd apps/api
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 2. Making Schema Changes

```bash
# Edit schema in src/database/schema.ts
# Generate migration
npm run db:generate

# Review the generated migration in drizzle/ folder
# Apply migration
npm run db:migrate
```

**Best Practice:** Test schema changes on a Neon branch first:
1. Create a branch in Neon dashboard
2. Update `DATABASE_URL` to branch URL
3. Test migrations on branch
4. Merge branch to main when verified

### 3. If Something Goes Wrong

**Option 1: Restore from Neon Backup**
1. Go to Neon dashboard
2. Select "Backups" or "Restore"
3. Choose timestamp to restore
4. Restore to new branch or main database

**Option 2: Restore from Manual Backup**
```bash
# Restore from SQL dump
psql $DATABASE_URL < backup-20241021.sql
```

### 4. Fresh Start with Sample Data

```bash
# Reset everything and seed with sample data
npm run db:reset

# This runs:
# 1. npm run db:migrate  (apply all migrations)
# 2. npm run db:seed     (seed RBAC and sample data)
```

## 🔧 Database Features

### Neon PostgreSQL Advantages

- ✅ **Automatic Backups**: Daily backups with 7-day retention
- ✅ **Point-in-Time Recovery**: Restore to any second in the last 7 days
- ✅ **Database Branching**: Test schema changes safely
- ✅ **Instant Scaling**: Auto-scale compute on demand
- ✅ **Connection Pooling**: Built-in pooling (20 connections)
- ✅ **High Availability**: Multi-region redundancy

### Migration Safety
- Server validates database connection on startup
- Migrations are atomic (rollback on failure)
- Schema changes are versioned and tracked
- Drizzle Kit generates type-safe migrations

## 📁 File Locations

```
apps/api/
├── .env                       # DATABASE_URL for Neon PostgreSQL
├── drizzle/                   # Migration files
│   ├── 0001_initial.sql
│   └── 0002_add_features.sql
└── src/database/
    ├── schema.ts              # PostgreSQL schema (pgTable)
    ├── connection.ts          # Database connection setup
    ├── seed-rbac.ts          # RBAC seed data
    └── seeds/                 # Additional seed data
        └── project-templates.ts
```

## 🎯 Sample Data

The seed script (`npm run db:seed`) creates:

- **5 Users**: Admin, Workspace Manager, Project Manager, Team Lead, Member
- **1 Workspace**: "Meridian Development"  
- **Multiple Projects**: With templates and tasks
- **RBAC Setup**: Roles, permissions, and assignments

**Default Login Credentials:**
- Email: `admin@meridian.app`
- Password: `password123`

## 🔐 Backup Strategies

### Development

**Option 1: Neon Branching (Recommended)**
```bash
# Create a branch in Neon dashboard
# Test changes on branch
# Merge when ready
```

**Option 2: Manual SQL Dump**
```bash
# Export entire database
pg_dump $DATABASE_URL > backup.sql

# Export specific tables
pg_dump $DATABASE_URL -t users -t workspaces > partial-backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Production

1. **Automated Neon Backups**: Enabled by default
2. **Point-in-Time Recovery**: Available for 7 days
3. **Scheduled Exports**: Use GitHub Actions or cron jobs
4. **Multi-Region Replication**: Configure in Neon dashboard

## 🚨 Emergency Recovery

### Lost Data in Development

```bash
cd apps/api

# Option 1: Reset with fresh sample data
npm run db:reset

# Option 2: Restore from Neon dashboard
# Go to Neon → Backups → Select timestamp → Restore

# Option 3: Restore from manual backup
psql $DATABASE_URL < backup-20241021.sql
```

### Production Database Issues

1. **Check Neon Status**: Visit Neon status page
2. **Review Logs**: Check Neon dashboard logs
3. **Point-in-Time Restore**: Use Neon dashboard
4. **Contact Support**: Neon provides 24/7 support for Pro plans

## 💡 Best Practices

1. **Use Neon Branches** for testing schema changes
2. **Test migrations** on branches before applying to main
3. **Monitor database** via Neon dashboard
4. **Set up alerts** for connection/performance issues
5. **Review migration SQL** before applying
6. **Keep DATABASE_URL secure** (use environment variables)
7. **Use connection pooling** (already configured)

## 🔍 Troubleshooting

### Migration Fails

```bash
# Check migration files in drizzle/
# Review error message for SQL syntax issues

# Rollback: Restore from Neon backup
# Fix migration, then retry:
npm run db:migrate
```

### Connection Issues

```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Drizzle Studio
npm run db:studio
```

### Data Missing After Update

```bash
# Option 1: Neon Point-in-Time Recovery
# Go to Neon dashboard → Restore to timestamp

# Option 2: Manual backup restore
psql $DATABASE_URL < backup.sql
```

### Fresh Development Setup

```bash
# 1. Ensure DATABASE_URL is set in .env
# 2. Push schema to database
npm run db:push

# 3. Seed with sample data
npm run db:seed

# Or do both with reset:
npm run db:reset
```

## 🌐 Additional Resources

- **Neon Dashboard**: https://console.neon.tech
- **Drizzle ORM Docs**: https://orm.drizzle.team/docs/overview
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Backup Best Practices**: See Neon documentation

---

**Note:** This project uses **PostgreSQL via Neon** for both development and production. File-based SQLite backups are not supported. All backup operations should use Neon's built-in features or `pg_dump`/`psql` utilities.
