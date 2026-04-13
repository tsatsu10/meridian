# 📊 APM (Application Performance Monitoring) Setup Guide

**Purpose**: Monitor application performance in production  
**Recommended Tools**: New Relic, DataDog, or Sentry Performance  
**Estimated Setup Time**: 1-2 hours

---

## 🎯 Overview

Application Performance Monitoring (APM) helps you:
- Track request/response times
- Identify slow database queries
- Monitor error rates
- Detect memory leaks
- Analyze user experience
- Set up alerts for issues

---

## 🛠️ Option 1: New Relic (Recommended)

### **Why New Relic?**
- ✅ Excellent for Node.js/React
- ✅ Great visualizations
- ✅ Free tier available
- ✅ Easy setup

### **Installation**

#### Backend (API)

```bash
cd apps/api
npm install newrelic
```

#### Configuration

Create `apps/api/newrelic.js`:

```javascript
'use strict'

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'Meridian API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  distributed_tracing: {
    enabled: true
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 0.5,
    record_sql: 'obfuscated',
  },
  error_collector: {
    enabled: true,
    capture_events: true,
  },
  browser_monitoring: {
    enable: true
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-*',
    ]
  }
}
```

#### Import in Entry File

```typescript
// apps/api/src/index.ts
// MUST be first import!
if (process.env.NODE_ENV === 'production' && process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}

// Rest of imports...
```

#### Environment Variables

```bash
# apps/api/.env
NEW_RELIC_LICENSE_KEY=your-license-key-here
NEW_RELIC_APP_NAME=Meridian API Production
NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
```

---

## 🛠️ Option 2: DataDog

### **Why DataDog?**
- ✅ Comprehensive monitoring
- ✅ Great for microservices
- ✅ Infrastructure + APM combined
- ✅ Excellent alerting

### **Installation**

```bash
cd apps/api
npm install dd-trace --save
```

### **Configuration**

```typescript
// apps/api/src/index.ts
// MUST be first import!
import tracer from 'dd-trace';

if (process.env.NODE_ENV === 'production') {
  tracer.init({
    service: 'meridian-api',
    env: process.env.NODE_ENV,
    version: '0.4.0',
    logInjection: true,
    runtimeMetrics: true,
  });
}
```

### **Environment Variables**

```bash
DD_API_KEY=your-datadog-api-key
DD_SERVICE=meridian-api
DD_ENV=production
DD_VERSION=0.4.0
DD_TRACE_ENABLED=true
```

---

## 🛠️ Option 3: Sentry Performance

### **Why Sentry Performance?**
- ✅ Already using Sentry for errors
- ✅ Unified error + performance
- ✅ Good for full-stack
- ✅ Easy integration

### **Configuration**

```typescript
// apps/api/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    // HTTP integration
    new Sentry.Integrations.Http({ tracing: true }),
    // Express integration (or Hono equivalent)
    new Sentry.Integrations.OnUncaughtException(),
  ],
});

// Add Sentry middleware to Hono
app.use('*', async (c, next) => {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: `${c.req.method} ${c.req.path}`,
  });

  c.set('sentryTransaction', transaction);
  
  try {
    await next();
  } finally {
    transaction.setHttpStatus(c.res.status);
    transaction.finish();
  }
});
```

---

## 📊 Custom Metrics Integration

### **Add Custom Instrumentation**

```typescript
// apps/api/src/utils/apm.ts
export function trackDatabaseQuery(queryName: string, duration: number) {
  if (process.env.APM_PROVIDER === 'newrelic') {
    const newrelic = require('newrelic');
    newrelic.recordMetric(`Custom/Database/${queryName}`, duration);
  } else if (process.env.APM_PROVIDER === 'datadog') {
    const tracer = require('dd-trace');
    const span = tracer.scope().active();
    if (span) {
      span.setTag('db.query', queryName);
      span.setTag('db.duration', duration);
    }
  }
}

export function trackBusinessMetric(name: string, value: number) {
  if (process.env.APM_PROVIDER === 'newrelic') {
    const newrelic = require('newrelic');
    newrelic.recordMetric(`Custom/Business/${name}`, value);
  }
}
```

### **Usage Example**

```typescript
// In your controllers
import { trackDatabaseQuery } from '@/utils/apm';

export async function getTasks(projectId: string) {
  const start = Date.now();
  
  const tasks = await db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId)
  });
  
  const duration = Date.now() - start;
  trackDatabaseQuery('getTasks', duration);
  
  return tasks;
}
```

---

## 🔔 Alerting Setup

### **New Relic Alerts**

1. Go to New Relic Alerts
2. Create alert policy: "Meridian Production"
3. Add conditions:
   - Error rate > 5%
   - Response time > 2 seconds
   - Memory usage > 90%
   - CPU usage > 80%

### **DataDog Monitors**

```yaml
# monitors.yaml
- name: "High Error Rate"
  type: "metric alert"
  query: "avg(last_5m):sum:trace.http.request.errors{service:meridian-api} > 10"
  message: "Error rate is high @slack-alerts"

- name: "Slow API Responses"
  type: "metric alert"
  query: "avg(last_5m):avg:trace.http.request.duration{service:meridian-api} > 2000"
  message: "API responses are slow @slack-alerts"
```

---

## 📈 Dashboards

### **Key Metrics to Monitor**

1. **Request Metrics**
   - Requests per minute
   - Error rate (4xx, 5xx)
   - Response time (p50, p95, p99)

2. **Database Metrics**
   - Query duration
   - Connection pool usage
   - Slow queries (>1s)

3. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk usage

4. **Business Metrics**
   - Active users
   - Tasks created/completed
   - Projects active
   - User signups

### **Sample Dashboard (New Relic)**

```
┌─────────────────────────────────────────┐
│  Request Rate: 1,234 RPM                │
│  Error Rate: 0.5%                       │
│  Avg Response Time: 145ms               │
├─────────────────────────────────────────┤
│  Top 5 Slowest Endpoints:               │
│  1. GET /api/analytics  (845ms)         │
│  2. POST /api/tasks     (234ms)         │
│  3. GET /api/projects   (189ms)         │
├─────────────────────────────────────────┤
│  Database Queries:                      │
│  Avg: 45ms | p95: 156ms | p99: 312ms   │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing APM

### **Verify APM is Working**

```bash
# 1. Start your app with APM
NODE_ENV=production npm start

# 2. Generate some traffic
curl http://localhost:3005/api/health

# 3. Check APM dashboard
# Should see transactions within 1-2 minutes
```

### **Load Testing**

```bash
# Install k6 for load testing
npm install -g k6

# Create test script
cat > load-test.js << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:3005/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js

# Check APM for metrics
```

---

## 💰 Cost Considerations

### **New Relic**
- Free tier: 100GB data/month
- Paid: $99-$349/month
- Best for: Small to medium apps

### **DataDog**
- Free tier: 5 hosts
- Paid: $15-$23/host/month
- Best for: Microservices, containers

### **Sentry Performance**
- Free tier: 10K events/month
- Paid: $26-$80/month
- Best for: Error-focused monitoring

---

## 🎯 Recommended Setup

### **For Meridian (Start Simple)**

**Phase 1** (Now):
- ✅ Use existing Prometheus metrics
- ✅ Use existing Sentry errors
- ✅ Use Web Vitals tracking
- ⚪ Add free APM tier

**Phase 2** (After 1000 users):
- Upgrade to paid APM
- Add custom dashboards
- Set up advanced alerts
- Implement distributed tracing

**Phase 3** (After 10000 users):
- Multi-region monitoring
- Custom metrics pipeline
- Advanced analytics
- Real user monitoring (RUM)

---

## ✅ **Checklist**

### **Before Enabling APM**

- [ ] Choose APM provider
- [ ] Sign up for account
- [ ] Get API key/license
- [ ] Add to environment variables
- [ ] Configure integration
- [ ] Test locally
- [ ] Deploy to staging
- [ ] Verify metrics appear
- [ ] Set up alerts
- [ ] Create dashboards

### **After Enabling APM**

- [ ] Monitor for 24 hours
- [ ] Identify slow endpoints
- [ ] Optimize queries
- [ ] Set performance budgets
- [ ] Create runbooks
- [ ] Train team on dashboards

---

## 📚 Resources

- [New Relic Node.js Docs](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/)
- [DataDog APM Guide](https://docs.datadoghq.com/tracing/)
- [Sentry Performance](https://docs.sentry.io/product/performance/)
- [Prometheus + Grafana](https://prometheus.io/docs/visualization/grafana/)

---

## 🎯 Quick Start (New Relic)

```bash
# 1. Install
cd apps/api && npm install newrelic

# 2. Configure
cp node_modules/newrelic/newrelic.js .
# Edit newrelic.js with your license key

# 3. Import first
# Add to apps/api/src/index.ts (line 1)
require('newrelic');

# 4. Deploy
npm run build && npm start

# 5. View metrics
# Go to https://one.newrelic.com
```

**That's it!** Metrics will start flowing immediately.

---

**Status**: Guide complete  
**Next**: Choose provider and implement  
**Time**: 1-2 hours total


