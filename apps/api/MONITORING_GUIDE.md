# 📊 Monitoring & Performance Dashboard Guide

**Last Updated:** October 24, 2025  
**Status:** Production Ready

---

## 🎯 Overview

This guide provides SQL queries and instructions for monitoring the Meridian API performance, security, and health.

---

## 📁 Log Files

Logs are stored in the `logs/` directory with daily rotation:

```
logs/
├── performance/
│   └── performance-2025-10-24.log
├── slow-queries/
│   └── slow-queries-2025-10-24.log
└── errors/
    └── error-2025-10-24.log
```

**Retention:**
- Performance logs: 14 days
- Slow query logs: 14 days
- Error logs: 30 days

---

## 📊 Key Performance Metrics

### 1. **API Response Times**

**Query audit_log for endpoint performance:**
```sql
-- Average response time by endpoint (last 24 hours)
SELECT 
  action,
  COUNT(*) as request_count,
  AVG(CAST(metadata->>'duration' AS INTEGER)) as avg_duration_ms,
  MAX(CAST(metadata->>'duration' AS INTEGER)) as max_duration_ms,
  MIN(CAST(metadata->>'duration' AS INTEGER)) as min_duration_ms
FROM audit_log
WHERE 
  timestamp >= NOW() - INTERVAL '24 hours'
  AND metadata->>'duration' IS NOT NULL
GROUP BY action
ORDER BY avg_duration_ms DESC
LIMIT 20;
```

**Expected Results:**
- **Good:** < 200ms average
- **Acceptable:** 200-500ms
- **Slow:** 500-1000ms
- **Critical:** > 1000ms

---

### 2. **Error Rate Analysis**

**Failed operations in last hour:**
```sql
SELECT 
  action,
  severity,
  COUNT(*) as error_count,
  COUNT(*) * 100.0 / (
    SELECT COUNT(*) 
    FROM audit_log 
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
  ) as error_percentage
FROM audit_log
WHERE 
  outcome = 'failure'
  AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY action, severity
ORDER BY error_count DESC;
```

**Healthy Error Rate:** < 1%  
**Warning:** 1-5%  
**Critical:** > 5%

---

### 3. **Cache Hit Rate**

**Redis cache effectiveness:**
```sql
-- Cache operations from audit logs (if logged)
SELECT 
  details->>'cacheHit' as cache_hit,
  COUNT(*) as count
FROM audit_log
WHERE 
  action LIKE '%overview%'
  AND timestamp >= NOW() - INTERVAL '1 hour'
  AND details->>'cacheHit' IS NOT NULL
GROUP BY details->>'cacheHit';
```

**Target Cache Hit Rate:** > 90%

---

### 4. **Security Events**

**Authentication failures:**
```sql
SELECT 
  timestamp,
  actor_email,
  ip_address,
  details->>'reason' as failure_reason
FROM audit_log
WHERE 
  action = 'user_login'
  AND outcome = 'failure'
  AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 50;
```

**Unauthorized access attempts:**
```sql
SELECT 
  timestamp,
  actor_email,
  user_role as attempted_role,
  resource_type,
  resource_id,
  details->>'reason' as denial_reason
FROM audit_log
WHERE 
  severity = 'high'
  AND outcome = 'failure'
  AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

---

### 5. **Critical Operations**

**All critical-severity events:**
```sql
SELECT 
  timestamp,
  action,
  actor_email,
  outcome,
  details
FROM audit_log
WHERE 
  severity = 'critical'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

**Project deletions (last 7 days):**
```sql
SELECT 
  timestamp,
  actor_email,
  user_role,
  resource_id,
  details->>'projectName' as project_name,
  details->>'deletedTasks' as tasks_deleted,
  CAST(metadata->>'duration' AS INTEGER) as duration_ms
FROM audit_log
WHERE 
  action = 'project_delete'
  AND outcome = 'success'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

---

### 6. **User Activity**

**Most active users (last 7 days):**
```sql
SELECT 
  actor_email,
  user_role,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN outcome = 'failure' THEN 1 END) as failed_actions,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_actions
FROM audit_log
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY actor_email, user_role
ORDER BY total_actions DESC
LIMIT 20;
```

**Users with high failure rates:**
```sql
SELECT 
  actor_email,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN outcome = 'failure' THEN 1 END) as failures,
  (COUNT(CASE WHEN outcome = 'failure' THEN 1 END) * 100.0 / COUNT(*)) as failure_rate
FROM audit_log
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY actor_email
HAVING COUNT(*) > 10
  AND (COUNT(CASE WHEN outcome = 'failure' THEN 1 END) * 100.0 / COUNT(*)) > 10
ORDER BY failure_rate DESC;
```

---

### 7. **Rate Limiting Effectiveness**

**Rate limit violations:**
```sql
-- You'll need to add rate limit events to audit log
SELECT 
  timestamp,
  actor_email,
  ip_address,
  action,
  details->>'endpoint' as endpoint
FROM audit_log
WHERE 
  action = 'rate_limit_exceeded'
  AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

---

### 8. **Data Export Activity**

**Export operations:**
```sql
SELECT 
  timestamp,
  actor_email,
  user_role,
  resource_id,
  details->>'format' as export_format,
  details->>'exportedItems' as items_exported,
  CAST(metadata->>'duration' AS INTEGER) as duration_ms
FROM audit_log
WHERE 
  action = 'project_export'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

---

## 🚨 Alerting Rules

### Critical Alerts (Immediate Action Required)

**1. High Error Rate:**
```sql
-- Alert if error rate > 5% in last hour
SELECT 
  COUNT(CASE WHEN outcome = 'failure' THEN 1 END) * 100.0 / COUNT(*) as error_rate
FROM audit_log
WHERE timestamp >= NOW() - INTERVAL '1 hour'
HAVING (COUNT(CASE WHEN outcome = 'failure' THEN 1 END) * 100.0 / COUNT(*)) > 5;
```

**2. Slow Endpoints:**
```sql
-- Alert if any endpoint > 2 seconds average
SELECT action, AVG(CAST(metadata->>'duration' AS INTEGER)) as avg_ms
FROM audit_log
WHERE 
  timestamp >= NOW() - INTERVAL '1 hour'
  AND metadata->>'duration' IS NOT NULL
GROUP BY action
HAVING AVG(CAST(metadata->>'duration' AS INTEGER)) > 2000;
```

**3. Security Violations:**
```sql
-- Alert on critical security events
SELECT COUNT(*) 
FROM audit_log
WHERE 
  severity = 'critical'
  AND timestamp >= NOW() - INTERVAL '15 minutes'
HAVING COUNT(*) > 0;
```

---

## 📈 Performance Dashboards

### Dashboard 1: Real-Time Overview

**Metrics to Display:**
- Requests per minute (RPM)
- Average response time
- Error rate (%)
- Cache hit rate (%)
- Active users

**Refresh:** Every 30 seconds

### Dashboard 2: Endpoint Performance

**Top 10 Slowest Endpoints:**
```sql
SELECT 
  action,
  COUNT(*) as calls,
  AVG(CAST(metadata->>'duration' AS INTEGER)) as avg_ms,
  MAX(CAST(metadata->>'duration' AS INTEGER)) as max_ms
FROM audit_log
WHERE 
  timestamp >= NOW() - INTERVAL '24 hours'
  AND metadata->>'duration' IS NOT NULL
GROUP BY action
ORDER BY avg_ms DESC
LIMIT 10;
```

**Refresh:** Every 5 minutes

### Dashboard 3: Security Overview

**Metrics to Display:**
- Failed login attempts
- Unauthorized access attempts
- Critical operations (deletes, exports)
- Rate limit violations
- Suspicious activity patterns

**Refresh:** Every 1 minute

---

## 🔍 Troubleshooting Queries

### Investigate Slow Request

**Find all details for slow requests:**
```sql
SELECT 
  timestamp,
  action,
  actor_email,
  resource_id,
  CAST(metadata->>'duration' AS INTEGER) as duration_ms,
  details,
  metadata
FROM audit_log
WHERE 
  CAST(metadata->>'duration' AS INTEGER) > 1000
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY duration_ms DESC;
```

### Investigate Failed Operation

**Get full context for failures:**
```sql
SELECT 
  timestamp,
  action,
  actor_email,
  user_role,
  resource_type,
  resource_id,
  severity,
  details,
  ip_address,
  user_agent
FROM audit_log
WHERE 
  outcome = 'failure'
  AND resource_id = 'PROJECT_ID_HERE'
ORDER BY timestamp DESC;
```

---

## 📊 Reports

### Daily Performance Report

```sql
-- Run daily at midnight
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN outcome = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN outcome = 'failure' THEN 1 END) as failed,
  AVG(CAST(metadata->>'duration' AS INTEGER)) as avg_duration_ms,
  MAX(CAST(metadata->>'duration' AS INTEGER)) as max_duration_ms
FROM audit_log
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day'
  AND timestamp < CURRENT_DATE
GROUP BY DATE(timestamp);
```

### Weekly Security Report

```sql
-- Run weekly on Monday
SELECT 
  action,
  severity,
  COUNT(*) as incident_count,
  COUNT(DISTINCT actor_email) as unique_users
FROM audit_log
WHERE 
  (severity IN ('high', 'critical') OR outcome = 'failure')
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY action, severity
ORDER BY severity DESC, incident_count DESC;
```

---

## 🛠️ Maintenance

### Cleanup Old Logs

```sql
-- Delete audit logs older than 90 days
DELETE FROM audit_log
WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Vacuum Database

```sql
-- After cleanup, reclaim space
VACUUM ANALYZE audit_log;
```

---

## 📱 Integration with Monitoring Tools

### Prometheus Metrics Endpoint

Add this to your API:

```typescript
app.get('/metrics', async (c) => {
  const metrics = performanceMetrics.getAllStats();
  // Format as Prometheus metrics
  return c.text(formatPrometheusMetrics(metrics));
});
```

### Grafana Dashboard

Import the provided Grafana dashboard JSON to visualize:
- Request rates
- Response times
- Error rates
- Cache hit rates
- Security events

---

## 🎯 Key Performance Indicators (KPIs)

| KPI | Target | Warning | Critical |
|-----|--------|---------|----------|
| **Avg Response Time** | < 200ms | 200-500ms | > 500ms |
| **Error Rate** | < 1% | 1-5% | > 5% |
| **Cache Hit Rate** | > 90% | 70-90% | < 70% |
| **Uptime** | 99.9% | 99-99.9% | < 99% |
| **Failed Logins** | < 10/hour | 10-50/hour | > 50/hour |

---

## 📞 Escalation

### Critical Issues
- Error rate > 10%
- Average response time > 2s
- Critical security event detected
- **Action:** Page on-call engineer immediately

### Warning Issues
- Error rate 5-10%
- Average response time 1-2s
- High rate limit violations
- **Action:** Investigate within 1 hour

---

**Last Updated:** October 24, 2025  
**Maintained By:** DevOps Team  
**Contact:** monitoring@meridian.app

