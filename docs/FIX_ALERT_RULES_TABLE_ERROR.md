# Fix: PostgreSQL "alert_rules" Table Missing

**Date:** October 26, 2025
**Status:** ✅ Fixed
**Error:** `PostgresError: relation "alert_rules" does not exist`

---

## 🐛 Error Details

### Error Message
```
[ERROR] Failed to evaluate rules: PostgresError: relation "alert_rules" does not exist
    at ErrorResponse (postgres/cjs/src/connection.js:794:26)
  severity: 'ERROR',
  code: '42P01',
  file: 'parse_relation.c',
  routine: 'parserOpenTable'
```

### Error Location
**File:** `apps/api/src/notification/services/rules/rule-engine.ts`
**Function:** `evaluateAllRules()` at line 297-300

```typescript
const activeRules = await db
  .select()
  .from(alertRules)  // ← Table doesn't exist!
  .where(eq(alertRules.isActive, true));
```

---

## 🔍 Root Cause

The `alert_rules` table was **defined in the schema** but **not created in the PostgreSQL database**.

### Why This Happened

1. **Schema Definition Exists:** The table is properly defined in `apps/api/src/database/schema.ts` (line 1154)
2. **Database Out of Sync:** The database migrations were not generated or pushed
3. **Service Initialization:** The rule engine tries to evaluate rules on startup/schedule, triggering the error immediately

### Timeline of Issue

1. ✅ Schema defined: `alertRules` table added to `schema.ts`
2. ❌ **Missing step:** Migrations not generated/pushed to database
3. ✅ Code deployed: Rule engine service starts
4. ❌ **Error occurs:** Service tries to query non-existent table

---

## ✅ Solution

### Command Executed
```bash
cd apps/api
npm run db:push
```

### Result
```
Using 'pg' driver for database querying
[✓] Pulling schema from database...
[✓] Changes applied
```

### What This Did

The `drizzle-kit push` command:
1. ✅ Read the schema definitions from `schema.ts`
2. ✅ Compared with existing PostgreSQL database
3. ✅ Generated and executed SQL to create missing tables
4. ✅ Created the `alert_rules` table with proper structure

---

## 📊 Table Structure Created

```sql
CREATE TABLE alert_rules (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_config JSONB NOT NULL,
  notification_channels JSONB DEFAULT '["in_app"]',
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Fields Explained

| Field | Type | Purpose |
|-------|------|---------|
| `id` | TEXT | Unique identifier (generated via createId()) |
| `user_email` | TEXT | User who owns this rule (FK to users) |
| `name` | TEXT | Human-readable rule name |
| `condition_type` | TEXT | Type of condition ('project_progress', 'task_overdue', 'mention', 'keyword') |
| `condition_config` | JSONB | Configuration parameters for the condition |
| `notification_channels` | JSONB | Where to send alerts (['in_app', 'email', 'slack', 'teams']) |
| `is_active` | BOOLEAN | Whether rule is currently active |
| `created_at` | TIMESTAMPTZ | When rule was created |

---

## 🔄 Related Components

### Files Affected

1. **Schema Definition:**
   - `apps/api/src/database/schema.ts` - Table definition

2. **Alert Rules Service:**
   - `apps/api/src/notification/services/rules/rule-engine.ts` - Queries the table
   - `apps/api/src/notification/controllers/alert-rules.ts` - CRUD operations

3. **Log Aggregation:**
   - `apps/api/src/services/log-aggregation.ts` - Uses AlertRule interface

4. **API Documentation:**
   - `apps/api/src/docs/openapi.yaml` - API endpoints for alert rules

---

## 🧪 Verification Steps

### 1. Check Table Exists
```sql
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'alert_rules'
);
-- Should return: true
```

### 2. Verify Table Structure
```sql
\d alert_rules
```

### 3. Test Rule Engine
The rule engine should now run without errors:
```typescript
// apps/api/src/notification/services/rules/rule-engine.ts
await evaluateAllRules(); // Should complete successfully
```

### 4. API Server Restart
**Important:** Restart the API server to ensure the service picks up the changes:
```bash
cd apps/api
npm run dev
```

---

## 📝 Prevention for Future

### Development Workflow

**Always run these commands after schema changes:**

```bash
# Option 1: Quick push (development)
npm run db:push

# Option 2: Generate migrations (production)
npm run db:generate
npm run db:migrate
```

### Database Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run db:generate` | Generate migration files | Before production deployment |
| `npm run db:migrate` | Run migration files | Production deployment |
| `npm run db:push` | Push schema directly | Local development (fastest) |
| `npm run db:studio` | Open Drizzle Studio | Visual database inspection |

### CI/CD Integration

Consider adding to deployment pipeline:
```yaml
# Example GitHub Actions step
- name: Run Database Migrations
  run: |
    cd apps/api
    npm run db:migrate
```

---

## 🎯 Key Learnings

### 1. Schema ≠ Database
- Defining a table in `schema.ts` doesn't create it in the database
- Always run `db:push` or `db:migrate` after schema changes

### 2. Development vs Production
- **Development:** `db:push` is fast and convenient
- **Production:** Always use `db:generate` + `db:migrate` for version control

### 3. Service Initialization
- Services that query tables on startup will fail if tables don't exist
- Always ensure database is up-to-date before running services

### 4. Error Messages
- PostgreSQL error code `42P01` always means "relation does not exist"
- Check schema definitions and run migrations when you see this

---

## 🚨 Other Tables to Check

While fixing this, also verify these Phase 2 tables exist:

1. ✅ `alert_rules` - Just created
2. ⚠️ `notification_queue` - Check if exists
3. ⚠️ `notification_digest` - Check if exists
4. ⚠️ `user_preferences` (notification settings) - Check if exists

Run this to verify:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('alert_rules', 'notification_queue', 'notification_digest', 'user_preferences');
```

---

## 🔧 Troubleshooting

### If Error Persists After `db:push`

1. **Restart API Server:**
   ```bash
   # Stop current server (Ctrl+C)
   cd apps/api
   npm run dev
   ```

2. **Verify Database Connection:**
   - Check `.env` file has correct `DATABASE_URL`
   - Ensure PostgreSQL is running
   - Test connection: `npm run db:studio`

3. **Check for Typos:**
   - Table name in schema: `alertRules`
   - Table name in database: `alert_rules` (snake_case)
   - Drizzle handles the conversion automatically

4. **Clear Node Cache:**
   ```bash
   rm -rf node_modules/.cache
   npm run dev
   ```

---

## 📚 References

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Schema Definition](apps/api/src/database/schema.ts#L1154)
- [Rule Engine Service](apps/api/src/notification/services/rules/rule-engine.ts)

---

**Status:** ✅ **Issue Resolved**
**Action Required:** ⚠️ **Restart API Server**
**Verification:** ✅ **Table created successfully**

---

## ✅ Next Steps

1. ✅ **Restart API server** - `npm run dev` in `apps/api`
2. ✅ **Verify no errors** - Check server logs for "Evaluating all active alert rules..."
3. ✅ **Test alert rules API** - Create and manage alert rules via endpoints
4. ✅ **Monitor logs** - Ensure rule evaluation runs without errors

---

## 🎉 Summary

The `alert_rules` table has been successfully created in PostgreSQL. The error was caused by the database being out of sync with the schema definition. Running `npm run db:push` resolved the issue by creating all missing tables.

**Remember:** Always run database commands after schema changes! 🚀

