# 🏥 System Health Check Guide

## Overview

Meridian provides comprehensive health check endpoints for monitoring and orchestration systems like Kubernetes, Docker, AWS ECS, and monitoring platforms like Datadog, New Relic, or Prometheus.

---

## Available Endpoints

### 1. `/api/system-health` - Comprehensive Health Check

**Purpose**: Overall system health with all dependency checks  
**Use For**: Monitoring dashboards, alerting systems  
**HTTP Method**: GET  
**Authentication**: None (public endpoint)

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 15,
      "message": "Database healthy"
    },
    "redis": {
      "status": "warn",
      "responseTime": 45,
      "message": "Redis responding slowly",
      "details": {
        "threshold": 50
      }
    },
    "websocket": {
      "status": "pass",
      "message": "WebSocket server operational"
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage normal",
      "details": {
        "heapUsedPercent": 45,
        "heapUsed": "234.56 MB",
        "heapTotal": "512.00 MB"
      }
    }
  },
  "metadata": {
    "environment": "production",
    "nodeVersion": "v20.19.1",
    "pid": 12345
  }
}
```

**Status Codes**:
- `200` - Healthy or degraded (all checks pass or warnings only)
- `503` - Unhealthy (one or more checks failed)

---

### 2. `/api/system-health/live` - Liveness Probe

**Purpose**: Is the process alive and responsive?  
**Use For**: Kubernetes liveness probes, container restart signals  
**HTTP Method**: GET  
**Authentication**: None

**Response**:
```json
{
  "status": "alive",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "uptime": 3600,
  "pid": 12345
}
```

**Always returns `200`** unless the process is completely frozen.

**Kubernetes Configuration**:
```yaml
livenessProbe:
  httpGet:
    path: /api/system-health/live
    port: 3005
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

### 3. `/api/system-health/ready` - Readiness Probe

**Purpose**: Is the app ready to serve traffic?  
**Use For**: Kubernetes readiness probes, load balancer health checks  
**HTTP Method**: GET  
**Authentication**: None

**Response (Ready)**:
```json
{
  "status": "ready",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 12
    },
    "redis": {
      "status": "pass",
      "responseTime": 8
    }
  }
}
```

**Response (Not Ready)**:
```json
{
  "status": "not_ready",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "fail",
      "responseTime": 5001,
      "message": "Database connection failed"
    }
  }
}
```

**Status Codes**:
- `200` - Ready to serve traffic
- `503` - Not ready (remove from load balancer)

**Kubernetes Configuration**:
```yaml
readinessProbe:
  httpGet:
    path: /api/system-health/ready
    port: 3005
  initialDelaySeconds: 15
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

### 4. `/api/system-health/startup` - Startup Probe

**Purpose**: Has the app completed initialization?  
**Use For**: Kubernetes startup probes (slow-starting apps)  
**HTTP Method**: GET  
**Authentication**: None

**Response (Started)**:
```json
{
  "status": "started",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "uptime": 45
}
```

**Response (Starting)**:
```json
{
  "status": "starting",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "message": "Database still initializing"
}
```

**Status Codes**:
- `200` - Startup complete
- `503` - Still starting

**Kubernetes Configuration**:
```yaml
startupProbe:
  httpGet:
    path: /api/system-health/startup
    port: 3005
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30    # Allow up to 150s for startup
```

---

### 5. `/api/system-health/metrics` - System Metrics

**Purpose**: Detailed performance and resource metrics  
**Use For**: Monitoring dashboards, capacity planning  
**HTTP Method**: GET  
**Authentication**: None (but consider adding in production)

**Response**:
```json
{
  "timestamp": "2025-10-30T12:00:00.000Z",
  "uptime": 3600,
  "process": {
    "pid": 12345,
    "version": "v20.19.1",
    "platform": "linux",
    "arch": "x64"
  },
  "memory": {
    "rss": "512.34 MB",
    "heapTotal": "256.00 MB",
    "heapUsed": "123.45 MB",
    "external": "12.34 MB",
    "arrayBuffers": "1.23 MB"
  },
  "cpu": {
    "usage": {
      "user": 1234567,
      "system": 234567
    }
  },
  "environment": {
    "nodeEnv": "production",
    "timezone": "UTC"
  }
}
```

---

## Health Check Details

### Database Check

**What it checks**:
- Database connectivity
- Query performance
- Response time

**Thresholds**:
- `pass` - Query < 100ms
- `warn` - Query 100-500ms
- `fail` - Query > 500ms or connection failed

**Example**:
```json
{
  "status": "pass",
  "responseTime": 15,
  "message": "Database healthy"
}
```

---

### Redis Check

**What it checks**:
- Redis connectivity
- Ping latency

**Thresholds**:
- `pass` - Ping < 50ms
- `warn` - Ping 50-200ms or Redis unavailable (optional service)
- `fail` - N/A (Redis is optional)

**Example**:
```json
{
  "status": "warn",
  "responseTime": 75,
  "message": "Redis responding slowly",
  "details": {
    "threshold": 50
  }
}
```

---

### Memory Check

**What it checks**:
- Heap memory usage percentage
- Memory pressure

**Thresholds**:
- `pass` - Heap usage < 80%
- `warn` - Heap usage 80-90%
- `fail` - Heap usage > 90%

**Example**:
```json
{
  "status": "pass",
  "message": "Memory usage normal",
  "details": {
    "heapUsedPercent": 45,
    "heapUsed": "234.56 MB",
    "heapTotal": "512.00 MB",
    "rss": "678.90 MB"
  }
}
```

---

### WebSocket Check

**What it checks**:
- WebSocket server initialization status

**Example**:
```json
{
  "status": "pass",
  "message": "WebSocket server operational",
  "details": {
    "note": "Basic availability check"
  }
}
```

---

## Kubernetes Deployment

### Complete Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meridian-api
  labels:
    app: meridian
    component: api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: meridian-api
  template:
    metadata:
      labels:
        app: meridian-api
    spec:
      containers:
      - name: api
        image: meridian/api:1.0.0
        ports:
        - containerPort: 3005
          name: http
        
        # Health probes
        livenessProbe:
          httpGet:
            path: /api/system-health/live
            port: 3005
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/system-health/ready
            port: 3005
          initialDelaySeconds: 15
          periodSeconds: 5
          failureThreshold: 2
        
        startupProbe:
          httpGet:
            path: /api/system-health/startup
            port: 3005
          periodSeconds: 5
          failureThreshold: 30
        
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: meridian-secrets
              key: database-url
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Docker Compose

See `docker-compose.health.yaml` for complete example.

**Basic health check**:
```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/api/system-health/ready"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 40s
```

---

## Monitoring Integration

### Datadog

```yaml
# datadog.yaml
init_config:

instances:
  - url: http://api.meridian.com/api/system-health
    name: meridian_api
    timeout: 5
    tags:
      - service:meridian
      - component:api
    
    http_response_status_code: 200
    check_certificate_expiration: true
    days_warning: 14
    days_critical: 7
```

### New Relic Synthetics

```javascript
// New Relic synthetic monitor
var assert = require('assert');

$http.get('https://api.meridian.com/api/system-health', function(err, response, body) {
  assert.equal(response.statusCode, 200, 'Expected 200 OK');
  
  var health = JSON.parse(body);
  assert.equal(health.status, 'healthy', 'System should be healthy');
  
  assert.equal(health.checks.database.status, 'pass', 'Database should be healthy');
  assert(health.checks.database.responseTime < 100, 'Database should respond quickly');
});
```

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'meridian-api'
    metrics_path: '/api/system-health/metrics'
    scrape_interval: 30s
    static_configs:
      - targets: ['api.meridian.com:3005']
        labels:
          service: 'meridian'
          component: 'api'
```

---

## AWS ECS/ELB

### Application Load Balancer (ALB)

```json
{
  "TargetGroups": [{
    "HealthCheckEnabled": true,
    "HealthCheckPath": "/api/system-health/ready",
    "HealthCheckProtocol": "HTTP",
    "HealthCheckPort": "3005",
    "HealthCheckIntervalSeconds": 30,
    "HealthCheckTimeoutSeconds": 5,
    "HealthyThresholdCount": 2,
    "UnhealthyThresholdCount": 3,
    "Matcher": {
      "HttpCode": "200"
    }
  }]
}
```

### ECS Task Definition

```json
{
  "containerDefinitions": [{
    "name": "meridian-api",
    "image": "meridian/api:latest",
    "portMappings": [{
      "containerPort": 3005,
      "protocol": "tcp"
    }],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:3005/api/system-health/ready || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }]
}
```

---

## Testing Health Endpoints

### Local Testing

```bash
# Test comprehensive health
curl http://localhost:3005/api/system-health

# Test liveness
curl http://localhost:3005/api/system-health/live

# Test readiness
curl http://localhost:3005/api/system-health/ready

# Test startup
curl http://localhost:3005/api/system-health/startup

# Get metrics
curl http://localhost:3005/api/system-health/metrics
```

### Production Testing

```bash
# Check if service is healthy
curl https://api.meridian.com/api/system-health

# Check if service is ready for traffic
curl https://api.meridian.com/api/system-health/ready

# Get detailed metrics
curl https://api.meridian.com/api/system-health/metrics
```

### Automated Testing with curl

```bash
#!/bin/bash
# health-check.sh

API_URL="http://localhost:3005"

# Check health
HEALTH=$(curl -s "$API_URL/api/system-health")
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "❌ System unhealthy: $STATUS"
  echo $HEALTH | jq .
  exit 1
fi

echo "✅ System healthy"
exit 0
```

---

## Monitoring Best Practices

### 1. Use Different Probes for Different Purposes

| Probe | Purpose | Frequency | Failure Action |
|-------|---------|-----------|----------------|
| **Liveness** | Is process alive? | Every 10s | Restart container |
| **Readiness** | Ready for traffic? | Every 5s | Remove from LB |
| **Startup** | Initialized? | Every 5s | Wait/restart |

### 2. Set Appropriate Thresholds

```yaml
# Production-recommended values
livenessProbe:
  initialDelaySeconds: 60      # Give time to start
  periodSeconds: 10            # Check often
  timeoutSeconds: 5            # Allow some latency
  failureThreshold: 3          # Don't restart too eagerly

readinessProbe:
  initialDelaySeconds: 30      # Faster than liveness
  periodSeconds: 5             # Check frequently
  timeoutSeconds: 3            # Faster timeout
  failureThreshold: 2          # Remove quickly if unhealthy

startupProbe:
  initialDelaySeconds: 0       # Start immediately
  periodSeconds: 5             # Check often
  failureThreshold: 30         # Allow 150s for startup
```

### 3. Monitor Health Check Metrics

Set up alerts for:
- Health check failures
- Degraded status
- Slow response times
- Memory pressure
- Database latency

---

## Troubleshooting

### Health Check Fails

**Database fails**:
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check database logs
kubectl logs -f deployment/postgres

# Check network connectivity
nc -zv postgres-service 5432
```

**Redis fails/warns**:
```bash
# Check Redis connectivity
redis-cli ping

# Check Redis logs
kubectl logs -f deployment/redis

# Redis is optional - app will work without it
```

**Memory warning**:
```bash
# Check memory usage
kubectl top pod meridian-api-xxx

# Increase memory limits
kubectl set resources deployment/meridian-api \
  --limits=memory=1Gi \
  --requests=memory=512Mi
```

### Liveness Probe Keeps Failing

Possible causes:
1. **Process is frozen** - Check for deadlocks
2. **Timeout too short** - Increase `timeoutSeconds`
3. **Heavy CPU load** - Check process CPU usage
4. **Container issues** - Check container logs

```bash
# Check container status
docker ps -a | grep meridian-api

# Check container logs
docker logs meridian-api

# Check resource usage
docker stats meridian-api
```

### Readiness Probe Keeps Failing

Possible causes:
1. **Database connection issues** - Check DB connectivity
2. **Redis connection issues** - Check Redis status
3. **Initialization not complete** - Increase `initialDelaySeconds`
4. **Network issues** - Check service networking

```bash
# Test readiness manually
curl http://localhost:3005/api/system-health/ready

# Check database
curl http://localhost:3005/api/system-health | jq '.checks.database'

# Check all dependencies
curl http://localhost:3005/api/system-health | jq '.checks'
```

---

## Load Balancer Integration

### AWS Application Load Balancer (ALB)

```bash
# Create target group with health check
aws elbv2 create-target-group \
  --name meridian-api-tg \
  --protocol HTTP \
  --port 3005 \
  --vpc-id vpc-xxx \
  --health-check-enabled \
  --health-check-path /api/system-health/ready \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

### NGINX

```nginx
upstream meridian_api {
  server api1:3005 max_fails=3 fail_timeout=30s;
  server api2:3005 max_fails=3 fail_timeout=30s;
  server api3:3005 max_fails=3 fail_timeout=30s;
}

server {
  location /api/ {
    proxy_pass http://meridian_api;
    
    # Health check
    health_check uri=/api/system-health/ready 
                 interval=10s 
                 fails=2 
                 passes=1;
  }
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
- name: Wait for deployment to be healthy
  run: |
    for i in {1..30}; do
      STATUS=$(curl -s https://api.meridian.com/api/system-health | jq -r '.status')
      if [ "$STATUS" = "healthy" ]; then
        echo "✅ Deployment healthy"
        exit 0
      fi
      echo "⏳ Waiting for deployment... ($i/30)"
      sleep 10
    done
    echo "❌ Deployment health check timeout"
    exit 1
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  script:
    - kubectl apply -f k8s/
    - |
      for i in {1..30}; do
        if curl -f https://api.meridian.com/api/system-health/ready; then
          echo "✅ Service ready"
          exit 0
        fi
        sleep 5
      done
      exit 1
```

---

## Alerting Rules

### Prometheus Alerting

```yaml
# alerts.yml
groups:
  - name: meridian_api
    rules:
      - alert: APIUnhealthy
        expr: meridian_api_health_status != 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Meridian API is unhealthy"
          description: "API health check failing for > 2 minutes"
      
      - alert: APIDegraded
        expr: meridian_api_health_degraded == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Meridian API is degraded"
          description: "API running but some checks failing"
      
      - alert: HighMemoryUsage
        expr: meridian_api_memory_heap_percent > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on API"
          description: "Heap usage > 85% for 10 minutes"
```

---

## Related Files

- `src/modules/system-health/index.ts` - Health check implementation
- `k8s-health-probes.yaml` - Kubernetes configuration
- `docker-compose.health.yaml` - Docker Compose configuration

---

## FAQ

**Q: Why is Redis a "warn" instead of "fail" when unavailable?**  
A: Redis is an optional performance optimization. The app functions without it (caching disabled).

**Q: How often should I run health checks?**  
A: 
- Liveness: Every 10-30s
- Readiness: Every 5-10s
- Comprehensive: Every 30-60s

**Q: Should health endpoints require authentication?**  
A: No for liveness/readiness (Kubernetes needs them). Yes for comprehensive health and metrics in production.

**Q: What's the difference between /health and /system-health?**  
A: `/health` is for project health metrics (business logic). `/system-health` is for infrastructure monitoring.

---

## Support

For issues with health checks:
1. Check endpoint responses directly with curl
2. Review logs for specific check failures
3. Verify network connectivity to dependencies
4. Consult DevOps team for orchestration issues

