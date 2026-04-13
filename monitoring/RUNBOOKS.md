# 🚨 Meridian Incident Response Runbooks

**Last Updated:** October 30, 2025  
**On-Call Rotation:** [Link to PagerDuty/OpsGenie]

---

## 📞 Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| **Lead Engineer** | - | - | @lead |
| **DevOps Lead** | - | - | @devops |
| **Database Admin** | - | - | @dba |
| **Security Lead** | - | - | @security |

---

## 🔴 CRITICAL: API Down

**Alert:** `APIDown`  
**Severity:** Critical  
**Threshold:** API unreachable for 1 minute

### Investigation Steps

1. **Check Grafana Dashboard**
   ```
   https://grafana.meridian.app/d/app-overview
   ```

2. **Check API Logs**
   ```bash
   ssh admin@production.meridian.app
   docker logs meridian-api --tail 100 -f
   ```

3. **Check Container Status**
   ```bash
   docker ps | grep meridian-api
   docker inspect meridian-api | jq '.[0].State'
   ```

4. **Check Resource Usage**
   ```bash
   docker stats meridian-api --no-stream
   ```

### Resolution Steps

**If container crashed:**
```bash
# Restart container
docker restart meridian-api

# Monitor logs
docker logs meridian-api -f
```

**If out of memory:**
```bash
# Increase memory limit (emergency)
docker update --memory 4g meridian-api
docker restart meridian-api

# Schedule: Update docker-compose.yml permanently
```

**If database connection issue:**
```bash
# Check database status
docker exec postgres pg_isready

# Reconnect API to database
docker restart meridian-api
```

**If recent deployment:**
```bash
# Rollback to previous version
cd /opt/meridian
./scripts/staging/rollback.sh previous-stable
```

### Post-Incident

1. Document in post-mortem
2. Update monitoring thresholds if needed
3. Add additional logging
4. Schedule team review within 24 hours

---

## ⚠️ WARNING: High Error Rate

**Alert:** `HighErrorRate`  
**Severity:** Critical  
**Threshold:** >5% error rate for 5 minutes

### Investigation Steps

1. **Identify Failing Endpoints**
   ```
   Grafana → Top Endpoints by Error Rate
   ```

2. **Check Error Patterns**
   ```bash
   # Get recent errors
   curl http://localhost:9090/api/v1/query?query='http_requests_total{status_code=~"5.."}'
   ```

3. **Check Application Logs**
   ```bash
   docker logs meridian-api --since 10m | grep ERROR
   ```

4. **Check Database Status**
   ```bash
   docker exec postgres psql -U meridian -d meridian_production -c \
     "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
   ```

### Resolution Steps

**If specific endpoint failing:**
```bash
# Check endpoint logs
docker logs meridian-api | grep "/api/failing-endpoint"

# Check related database queries
docker exec postgres psql -U meridian -d meridian_production -c \
  "SELECT query, calls, total_time FROM pg_stat_statements 
   WHERE query LIKE '%failing_table%' 
   ORDER BY total_time DESC LIMIT 10;"
```

**If database issue:**
```bash
# Check connections
docker exec postgres psql -U meridian -d meridian_production -c \
  "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# Kill long-running queries
docker exec postgres psql -U meridian -d meridian_production -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle in transaction' 
   AND now() - query_start > interval '5 minutes';"
```

**If external service down:**
- Check S3/CloudinaryStatus
- Check Redis status: `docker exec redis redis-cli ping`
- Enable circuit breakers if available

### Post-Incident

- Create post-mortem
- Add circuit breakers for external services
- Improve error handling
- Add retry logic

---

## ⚠️ WARNING: Slow Response Time

**Alert:** `SlowResponseTime`  
**Severity:** Warning  
**Threshold:** p95 > 2 seconds for 5 minutes

### Investigation Steps

1. **Identify Slow Endpoints**
   ```
   Grafana → Top Endpoints by Response Time
   ```

2. **Check Database Performance**
   ```bash
   docker exec postgres psql -U meridian -d meridian_production -c \
     "SELECT query, mean_time, calls 
      FROM pg_stat_statements 
      WHERE mean_time > 1000 
      ORDER BY mean_time DESC LIMIT 20;"
   ```

3. **Check Cache Hit Rate**
   ```bash
   docker exec redis redis-cli info stats | grep hit_rate
   ```

4. **Check System Resources**
   ```bash
   docker stats --no-stream
   ```

### Resolution Steps

**If database queries slow:**
```bash
# Add missing indexes (example)
docker exec postgres psql -U meridian -d meridian_production -c \
  "CREATE INDEX CONCURRENTLY idx_tasks_project_status 
   ON tasks(project_id, status);"

# Analyze table statistics
docker exec postgres psql -U meridian -d meridian_production -c \
  "ANALYZE tasks;"
```

**If cache misses:**
```bash
# Warm up cache
curl -X POST http://localhost:3005/api/cache/warm

# Check cache size
docker exec redis redis-cli dbsize
```

**If resource constrained:**
```bash
# Scale horizontally (if load balancer configured)
docker-compose up -d --scale api=3

# Or increase resources
docker update --cpus 2 --memory 4g meridian-api
docker restart meridian-api
```

---

## ⚠️ WARNING: Database Connection Pool High

**Alert:** `DatabaseConnectionPoolHigh`  
**Severity:** Warning  
**Threshold:** >80% of max connections for 5 minutes

### Investigation Steps

1. **Check Active Connections**
   ```bash
   docker exec postgres psql -U meridian -d meridian_production -c \
     "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
   ```

2. **Find Long-Running Queries**
   ```bash
   docker exec postgres psql -U meridian -d meridian_production -c \
     "SELECT pid, now() - query_start AS duration, query 
      FROM pg_stat_activity 
      WHERE state = 'active' 
      ORDER BY duration DESC LIMIT 10;"
   ```

3. **Check for Connection Leaks**
   ```bash
   # Check idle connections
   docker exec postgres psql -U meridian -d meridian_production -c \
     "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';"
   ```

### Resolution Steps

1. **Kill Long-Running Queries**
   ```bash
   docker exec postgres psql -U meridian -d meridian_production -c \
     "SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state = 'idle in transaction' 
      AND now() - query_start > interval '5 minutes';"
   ```

2. **Increase Pool Size (Temporary)**
   ```bash
   # Update environment
   docker exec meridian-api sh -c 'export DATABASE_POOL_MAX=30'
   docker restart meridian-api
   ```

3. **Fix Application Code (Permanent)**
   - Review connection handling in code
   - Ensure proper connection closing
   - Add connection timeouts
   - Use connection pooling best practices

---

## ⚠️ WARNING: High Memory Usage

**Alert:** `HighMemoryUsage`  
**Severity:** Warning  
**Threshold:** >85% memory usage for 10 minutes

### Investigation Steps

1. **Check Memory by Container**
   ```bash
   docker stats --no-stream --format \
     "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
   ```

2. **Check for Memory Leaks**
   ```bash
   # Check API memory over time
   docker exec meridian-api node -e 'console.log(process.memoryUsage())'
   ```

3. **Check Cache Size**
   ```bash
   docker exec redis redis-cli info memory
   ```

### Resolution Steps

**If API memory leak:**
```bash
# Quick fix: Restart API
docker restart meridian-api

# Long-term: Profile and fix code
# - Add memory profiling
# - Check for circular references
# - Review event listeners cleanup
```

**If Redis memory high:**
```bash
# Set max memory policy
docker exec redis redis-cli CONFIG SET maxmemory 2gb
docker exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Clear if necessary
docker exec redis redis-cli FLUSHDB
```

**If container limit too low:**
```bash
# Increase limit
docker update --memory 4g meridian-api
docker restart meridian-api
```

---

## ⚠️ WARNING: WebSocket Connection Spike

**Alert:** `WebSocketConnectionSpike`  
**Severity:** Warning  
**Threshold:** >100 new connections/second

### Investigation Steps

1. **Check Connection Source**
   ```bash
   docker logs meridian-api | grep "WebSocket connection" | tail -100
   ```

2. **Check for Attack Pattern**
   ```bash
   # Analyze IPs
   docker logs meridian-api | grep "New connection" | \
     awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
   ```

3. **Check System Resources**
   ```bash
   docker stats meridian-api --no-stream
   ```

### Resolution Steps

**If legitimate traffic spike:**
```bash
# Scale WebSocket servers
docker-compose up -d --scale api=3

# Or increase resources
docker update --cpus 2 --memory 4g meridian-api
docker restart meridian-api
```

**If attack (DDoS):**
```bash
# Enable rate limiting (if not already)
# Block suspicious IPs at firewall level
ufw deny from <attacker-ip>

# Or use fail2ban
fail2ban-client set meridian-api banip <attacker-ip>
```

---

## 🔴 CRITICAL: Database Down

**Alert:** Custom alert (database not responding)  
**Severity:** Critical

### Investigation Steps

1. **Check PostgreSQL Status**
   ```bash
   docker ps | grep postgres
   docker exec postgres pg_isready
   ```

2. **Check Logs**
   ```bash
   docker logs postgres --tail 100
   ```

3. **Check Disk Space**
   ```bash
   df -h /var/lib/docker/volumes
   ```

### Resolution Steps

**If container stopped:**
```bash
# Restart PostgreSQL
docker start postgres

# Check startup logs
docker logs postgres -f
```

**If out of disk space:**
```bash
# Clean Docker volumes (CAREFUL!)
docker volume prune

# Or expand disk
# - Cloud provider: Resize volume
# - Physical: Add disk
```

**If corruption:**
```bash
# Attempt recovery
docker exec postgres pg_resetwal /var/lib/postgresql/data

# If fails, restore from backup
./scripts/restore-backup.sh latest
```

**If data directory missing:**
```bash
# Restore from latest backup
./scripts/restore-backup.sh latest

# Or initialize new (LAST RESORT)
docker exec postgres initdb /var/lib/postgresql/data
```

---

## 🔥 EMERGENCY: Data Loss Suspected

**Severity:** CRITICAL  
**Response:** Immediate

### Immediate Actions

1. **STOP ALL WRITES**
   ```bash
   # Put API in read-only mode
   docker exec meridian-api curl -X POST http://localhost:3005/api/admin/read-only-mode
   ```

2. **Snapshot Current State**
   ```bash
   # Backup database immediately
   docker exec postgres pg_dump -U meridian meridian_production > \
     emergency-backup-$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Notify Leadership**
   - CEO/CTO
   - Customer Success
   - Legal (if PII involved)

4. **Assess Scope**
   ```bash
   # Compare with last backup
   diff latest-backup.sql emergency-backup.sql
   ```

### Recovery Steps

1. **Identify affected data**
2. **Restore from backup if available**
3. **Communicate to affected users**
4. **Document incident**
5. **Review security logs**

---

## 🛠️ Common Maintenance Tasks

### Restart All Services

```bash
cd /opt/meridian
docker-compose restart
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail 100 api
```

### Database Backup

```bash
# Manual backup
docker exec postgres pg_dump -U meridian meridian_production | \
  gzip > backup-$(date +%Y%m%d).sql.gz

# Restore
gunzip < backup-20251030.sql.gz | \
  docker exec -i postgres psql -U meridian meridian_production
```

### Clear Redis Cache

```bash
# Flush all
docker exec redis redis-cli FLUSHALL

# Flush specific database
docker exec redis redis-cli -n 0 FLUSHDB
```

### Update Environment Variables

```bash
# Edit .env file
nano .env.production

# Reload (restart required)
docker-compose up -d
```

---

## 📊 Monitoring URLs

| Service | URL |
|---------|-----|
| **Grafana** | https://grafana.meridian.app |
| **Prometheus** | http://prometheus.meridian.app:9090 |
| **Alertmanager** | http://alertmanager.meridian.app:9093 |
| **cAdvisor** | http://cadvisor.meridian.app:8080 |

---

## 🔍 Debugging Commands

### Check API Health

```bash
curl http://localhost:3005/api/health
```

### Check Database Connectivity

```bash
docker exec postgres psql -U meridian -d meridian_production -c "SELECT 1;"
```

### Check Redis Connectivity

```bash
docker exec redis redis-cli ping
```

### Check WebSocket Connections

```bash
docker logs meridian-api | grep -c "WebSocket connection"
```

### Test Authentication

```bash
curl -X POST http://localhost:3005/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@meridian.app","password":"password"}'
```

---

## 📝 Incident Response Checklist

- [ ] Alert received and acknowledged
- [ ] On-call engineer paged
- [ ] Incident severity assessed
- [ ] Investigation started
- [ ] Status page updated
- [ ] Leadership notified (if critical)
- [ ] Resolution steps initiated
- [ ] Service restored
- [ ] Root cause identified
- [ ] Post-mortem scheduled
- [ ] Preventive measures planned
- [ ] Documentation updated

---

## 📞 Escalation Path

**Level 1:** On-call engineer (auto-paged)  
**Level 2:** Lead engineer (if unresolved in 15 min)  
**Level 3:** CTO (if critical, unresolved in 30 min)  
**Level 4:** CEO (if business-impacting)

---

## 🎯 SLA Targets

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| **Critical** | 5 minutes | 1 hour |
| **High** | 15 minutes | 4 hours |
| **Medium** | 1 hour | 1 business day |
| **Low** | 1 business day | 1 week |

---

## 📚 Additional Resources

- [Architecture Documentation](../docs/ARCHITECTURE.md)
- [API Documentation](../docs/API.md)
- [Database Schema](../docs/DATABASE_SCHEMA.md)
- [Security Guide](../security/SECURITY_GUIDE.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

---

**Remember:** Stay calm, follow the runbook, document everything.

