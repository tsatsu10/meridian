# 🔌 How to Connect to PostgreSQL Database

Your database connection string from `.env`:
```
postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## 🎯 **EASIEST METHODS**

### Method 1: Neon Console (Recommended) ⭐

1. Go to https://console.neon.tech
2. Log in to your account
3. Find your project "neondb"
4. Click on **SQL Editor** or **Query** tab
5. Paste queries from `MANUAL_WORKSPACE_FIX.sql`
6. Run them one by one

---

### Method 2: pgAdmin (GUI Tool)

1. Download pgAdmin: https://www.pgadmin.org/download/
2. Install and open it
3. Right-click "Servers" → "Register" → "Server"
4. **General tab**:
   - Name: `Meridian Neon DB`
5. **Connection tab**:
   - Host: `ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech`
   - Port: `5432`
   - Database: `neondb`
   - Username: `neondb_owner`
   - Password: `npg_PoJlUnKCf32a`
6. **SSL tab**:
   - SSL Mode: `Require`
7. Click **Save**
8. Open Query Tool and paste the SQL queries

---

### Method 3: Command Line (psql)

```bash
# Install PostgreSQL client if needed
# Windows: https://www.postgresql.org/download/windows/

# Connect using the full connection string
psql "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Then paste and run the queries from MANUAL_WORKSPACE_FIX.sql
```

---

### Method 4: VS Code Extension

1. Install **PostgreSQL** extension by Chris Kolkman
2. Click the PostgreSQL icon in sidebar
3. Click "+" to add connection:
   - Host: `ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech`
   - Database: `neondb`
   - Username: `neondb_owner`
   - Password: `npg_PoJlUnKCf32a`
   - Port: `5432`
   - SSL: `true`
4. Right-click database → "New Query"
5. Paste and run queries

---

### Method 5: Online SQL Client (TablePlus, DBeaver, etc.)

**TablePlus** (Recommended for Windows):
1. Download: https://tableplus.com/
2. New Connection → PostgreSQL
3. Fill in details:
   - Name: Meridian DB
   - Host: `ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech`
   - Port: `5432`
   - User: `neondb_owner`
   - Password: `npg_PoJlUnKCf32a`
   - Database: `neondb`
   - SSL: Enabled
4. Test & Connect
5. Open SQL tab and run queries

---

## 📝 **STEP-BY-STEP EXECUTION**

Once connected, follow these steps in order:

### 1. Check Current State
```sql
-- Copy and run from MANUAL_WORKSPACE_FIX.sql: Step 1
```
**Expected**: See 7 assignments (some with NULL workspace names)

### 2. Identify Orphaned Records
```sql
-- Copy and run from MANUAL_WORKSPACE_FIX.sql: Step 2
```
**Expected**: See 6 orphaned assignments

### 3. Preview What Will Be Deleted
```sql
-- Copy and run from MANUAL_WORKSPACE_FIX.sql: Step 3
```
**Expected**: See the exact records to be removed

### 4. ⚠️ DELETE (Make the Fix)
```sql
-- Copy and run from MANUAL_WORKSPACE_FIX.sql: Step 4
```
**Expected**: Response: `DELETE 6`

### 5. Verify Success
```sql
-- Copy and run from MANUAL_WORKSPACE_FIX.sql: Step 5
```
**Expected**: See only 1 assignment remaining

### 6. Check for Duplicates
```sql
-- Copy and run from MANUAL_WORKSPACE_FIX.sql: Step 6
```
**Expected**: No rows (0 duplicates)

---

## ✅ **SUCCESS CRITERIA**

After completing all steps, you should see:
- ✅ 1 workspace assignment for elidegbotse@gmail.com
- ✅ 0 orphaned records
- ✅ 0 duplicate assignments
- ✅ The log message now shows: "Found 1 workspace assignments" (instead of 7)

---

## 🛡️ **SAFETY TIPS**

1. **Run Step 3 first**: Always preview what will be deleted
2. **No rush**: Take your time to review each step
3. **Backup available**: Neon has automatic backups if needed
4. **Rollback window**: You can restore from Neon console if something goes wrong

---

## 🎯 **RECOMMENDED METHOD**

For quickest results: **Neon Console (Method 1)**
- Already logged in
- No installation needed
- Web-based SQL editor
- Built-in safety features

---

**Need help?** Each SQL query in `MANUAL_WORKSPACE_FIX.sql` is commented with what to expect!

