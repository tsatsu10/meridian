# PostgreSQL Migration Guide

This guide provides comprehensive instructions for migrating your Meridian application from SQLite to PostgreSQL for production scalability.

## 🎯 Migration Overview

**Why Migrate?**
- **Scalability**: PostgreSQL supports concurrent connections and horizontal scaling
- **Performance**: Better performance under load with connection pooling
- **Production Ready**: Designed for enterprise-grade applications
- **Data Integrity**: ACID compliance and advanced constraint support

**Current State**: SQLite (676KB database) → **Target State**: PostgreSQL with connection pooling

## 📋 Prerequisites

### 1. PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from [PostgreSQL Official Site](https://www.postgresql.org/download/windows/)

### 2. Database Setup

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# In psql console:
CREATE DATABASE meridian;
CREATE USER meridian WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE meridian TO meridian;
GRANT ALL ON SCHEMA public TO meridian;
\q
```

### 3. Environment Configuration

Update your `.env` file:

```env
# Database Configuration - PostgreSQL
DATABASE_TYPE=postgresql
DATABASE_URL="postgresql://meridian:your_secure_password@localhost:5432/meridian"

# Connection Pool Settings
DB_MIN_CONNECTIONS=2
DB_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=10000
DB_QUERY_TIMEOUT=30000
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY=1000

# Set NODE_ENV for production
NODE_ENV=production
```

## 🚀 Migration Process

### Option 1: Fresh Migration (Recommended for Production)

```bash
# 1. Backup existing SQLite data (optional)
# PostgreSQL backups are handled differently - use pg_dump

# 2. Set environment to PostgreSQL
export DATABASE_TYPE=postgresql
export DATABASE_URL="postgresql://meridian:your_secure_password@localhost:5432/meridian"

# 3. Create fresh PostgreSQL database with schema
npm run db:reset:postgres

# 4. Migrate data from SQLite (if needed)
npm run db:migrate:postgres:with-data

# 5. Verify migration
npm run dev
```

### Option 2: Data Preservation Migration

```bash
# 1. Run migration script with data preservation
npm run db:migrate:postgres:with-data

# 2. Verify data integrity
psql -h localhost -U meridian -d meridian -c "SELECT COUNT(*) FROM \"user\";"
psql -h localhost -U meridian -d meridian -c "SELECT COUNT(*) FROM \"project\";"
psql -h localhost -U meridian -d meridian -c "SELECT COUNT(*) FROM \"task\";"
```

### Option 3: Manual Migration

```bash
# 1. Run the migration script manually
cd apps/api
tsx src/database/migrations/postgresql-migration.ts --preserve-data --verbose

# 2. Options available:
# --preserve-data: Migrate existing SQLite data
# --batch-size=1000: Set batch size for data migration
# --sqlite-path=./meridian.db: Specify SQLite database path
# --quiet: Suppress verbose output
```

## 🔧 Configuration Details

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_TYPE` | Database type | `postgresql` | `postgresql` |
| `DATABASE_URL` | Connection string | - | `postgresql://user:pass@host:port/db` |
| `DB_HOST` | PostgreSQL host | `localhost` | `db.example.com` |
| `DB_PORT` | PostgreSQL port | `5432` | `5432` |
| `DB_NAME` | Database name | `meridian` | `meridian_prod` |
| `DB_USER` | Database user | `meridian` | `meridian_user` |
| `DB_PASSWORD` | Database password | - | `secure_password` |
| `DB_SSL` | Enable SSL | `false` | `true` |
| `DB_MIN_CONNECTIONS` | Min pool size | `2` | `5` |
| `DB_MAX_CONNECTIONS` | Max pool size | `20` | `50` |

### Connection Pool Configuration

**Development:**
```env
DB_MIN_CONNECTIONS=2
DB_MAX_CONNECTIONS=10
```

**Production:**
```env
DB_MIN_CONNECTIONS=5
DB_MAX_CONNECTIONS=50
DB_CONNECTION_TIMEOUT=15000
DB_QUERY_TIMEOUT=45000
```

## 📊 Performance Optimization

### PostgreSQL Configuration

Add to `postgresql.conf`:

```conf
# Memory Settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connection Settings
max_connections = 100
listen_addresses = '*'

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'all'
log_min_duration_statement = 1000
```

### Database Indexing

The PostgreSQL schema includes optimized indexes:

```sql
-- Performance indexes are automatically created
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_email_idx ON "user"(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS session_user_id_idx ON session(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS task_project_id_idx ON task(project_id);
```

## 🔍 Verification Steps

### 1. Connection Test

```bash
# Test PostgreSQL connection
psql -h localhost -U meridian -d meridian -c "SELECT version();"
```

### 2. Application Test

```bash
# Start the application
npm run dev

# Check logs for successful connection:
# ✅ Database connection established successfully
# 🐘 PostgreSQL connection test successful
```

### 3. Data Verification

```bash
# Check key tables
psql -h localhost -U meridian -d meridian <<EOF
SELECT 'users' as table_name, COUNT(*) as count FROM "user"
UNION ALL
SELECT 'workspaces', COUNT(*) FROM workspace
UNION ALL
SELECT 'projects', COUNT(*) FROM project
UNION ALL
SELECT 'tasks', COUNT(*) FROM task;
EOF
```

### 4. Performance Test

```bash
# Run performance test
node -e "
const { testDatabaseConnection } = require('./src/database/connection.ts');
console.time('connection_test');
testDatabaseConnection().then(result => {
  console.timeEnd('connection_test');
  console.log('Connection test:', result ? 'PASS' : 'FAIL');
});
"
```

## 🐛 Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if database exists
psql -h localhost -U postgres -c "SELECT datname FROM pg_database WHERE datname='meridian';"
```

**2. Authentication Failed**
```bash
# Reset user password
sudo -u postgres psql -c "ALTER USER meridian PASSWORD 'new_password';"

# Check pg_hba.conf for authentication method
sudo nano /etc/postgresql/13/main/pg_hba.conf
```

**3. Permission Denied**
```bash
# Grant all privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE meridian TO meridian;"
sudo -u postgres psql meridian -c "GRANT ALL ON SCHEMA public TO meridian;"
```

**4. SSL Issues**
```env
# Disable SSL for local development
DB_SSL=false

# Or configure SSL properly
DB_SSL=true
```

### Migration Issues

**Data Type Mismatches:**
The migration script handles SQLite to PostgreSQL type conversions automatically.

**Large Data Sets:**
```bash
# Use smaller batch sizes for large datasets
npm run db:migrate:postgres:with-data -- --batch-size=500
```

**Memory Issues:**
```bash
# Monitor memory usage during migration
htop
# Adjust batch size if needed
```

## 📈 Performance Monitoring

### Database Statistics

```sql
-- Monitor connection pool
SELECT state, COUNT(*) 
FROM pg_stat_activity 
WHERE datname = 'meridian' 
GROUP BY state;

-- Check query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Application Monitoring

The application provides built-in database statistics:

```javascript
// Get database stats
const stats = getDatabaseStats();
console.log(stats);
// Output: { type: 'postgresql', isConnected: true, connectionCount: 1, ... }
```

## 🔄 Rollback Plan

If you need to rollback to SQLite:

```bash
# 1. Stop the application
# 2. Update environment
export DATABASE_TYPE=postgresql
export DATABASE_URL="postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 3. Restart application
npm run dev
```

## 🚀 Production Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install PostgreSQL client
RUN apk add --no-cache postgresql-client

# Set environment
ENV DATABASE_TYPE=postgresql
ENV NODE_ENV=production

# Your app setup...
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - DATABASE_TYPE=postgresql
      - DATABASE_URL=postgresql://meridian:password@postgres:5432/meridian
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=meridian
      - POSTGRES_USER=meridian
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Environment-Specific Configs

**Production:**
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://meridian:${DB_PASSWORD}@${DB_HOST}:5432/meridian_prod
DB_MIN_CONNECTIONS=10
DB_MAX_CONNECTIONS=100
DB_SSL=true
NODE_ENV=production
```

**Staging:**
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://meridian:${DB_PASSWORD}@${DB_HOST}:5432/meridian_staging
DB_MIN_CONNECTIONS=5
DB_MAX_CONNECTIONS=25
DB_SSL=true
NODE_ENV=staging
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)

## ✅ Migration Checklist

- [ ] PostgreSQL installed and running
- [ ] Database and user created
- [ ] Environment variables configured
- [ ] Dependencies updated
- [ ] Migration script tested
- [ ] Data migration completed
- [ ] Application connection verified
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Rollback plan tested

## 🎯 Expected Results

After successful migration:

- **Concurrent Users**: Support for 100+ concurrent connections
- **Query Performance**: 2-5x improvement for complex queries
- **Data Integrity**: ACID compliance and referential integrity
- **Scalability**: Horizontal scaling capability
- **Monitoring**: Built-in PostgreSQL statistics and logging
- **Production Ready**: Enterprise-grade database foundation

---

**Migration Support**: If you encounter issues, check the troubleshooting section or review the application logs for detailed error messages.