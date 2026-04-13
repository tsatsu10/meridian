# 📡 Uptime Monitoring Setup Guide

**Purpose**: Monitor application availability 24/7  
**Recommended Tools**: UptimeRobot (free), Pingdom, StatusCake  
**Setup Time**: 15-30 minutes

---

## 🎯 Why Uptime Monitoring?

- ✅ Know immediately when your app goes down
- ✅ Track availability percentage (SLA)
- ✅ Identify regional outages
- ✅ Monitor SSL certificate expiry
- ✅ Get alerts via email/SMS/Slack
- ✅ Public status page for users

---

## 🛠️ Option 1: UptimeRobot (Recommended - FREE!)

### **Why UptimeRobot?**
- ✅ Free tier: 50 monitors
- ✅ 5-minute check intervals
- ✅ Email + SMS alerts
- ✅ Public status pages
- ✅ No credit card required

### **Setup Steps**

1. **Sign up**: https://uptimerobot.com
2. **Create Monitors**:

#### API Health Check
```
Name:     Meridian API Health
Type:     HTTP(S)
URL:      https://api.meridian.app/api/health
Interval: 5 minutes
Alert:    Email + Slack
```

#### Frontend Check
```
Name:     Meridian Web App
Type:     HTTP(S)
URL:      https://meridian.app
Interval: 5 minutes
Keywords: Dashboard (check page loads)
Alert:    Email + Slack
```

#### WebSocket Check
```
Name:     Meridian WebSocket
Type:     Port
URL:      meridian.app
Port:     443
Interval: 5 minutes
Alert:    Email
```

#### Database Check (via API)
```
Name:     Meridian Database
Type:     HTTP(S)
URL:      https://api.meridian.app/api/metrics/health
Interval: 5 minutes
Expected: "status":"healthy"
Alert:    Email + SMS
```

3. **Create Status Page**:
   - Go to "Status Pages"
   - Create public page
   - Select all monitors
   - Publish at status.meridian.app

4. **Configure Alerts**:
   - Email: your-email@example.com
   - SMS: +1-XXX-XXX-XXXX (paid)
   - Slack: Connect via webhook
   - Webhook: Custom endpoint

---

## 🛠️ Option 2: Pingdom

### **Why Pingdom?**
- ✅ Advanced monitoring
- ✅ Real user monitoring
- ✅ Transaction monitoring
- ✅ Multiple locations
- ✅ Professional reports

### **Setup** (Trial Available)

1. Sign up: https://www.pingdom.com
2. Add checks:
   - Uptime Check (meridian.app)
   - Transaction Check (login flow)
   - Real User Monitoring (RUM script)

3. Configure alerts to PagerDuty or Slack

**Cost**: $10-72/month

---

## 🛠️ Option 3: Better Uptime

### **Why Better Uptime?**
- ✅ Beautiful status pages
- ✅ Incident management
- ✅ On-call scheduling
- ✅ Phone call alerts
- ✅ Great UX

### **Setup**

1. Sign up: https://betteruptime.com
2. Create monitors (similar to UptimeRobot)
3. Set up on-call rotation
4. Configure escalation policies

**Cost**: Free tier + paid plans

---

## 📊 Recommended Monitor Configuration

### **Critical Monitors** (Must Have)

| Monitor | URL | Interval | Alert On |
|---------|-----|----------|----------|
| API Health | `/api/metrics/health` | 1-5 min | Any failure |
| Web App | `https://meridian.app` | 5 min | 3 failures |
| WebSocket | Port check | 5 min | 2 failures |
| Database | Via health endpoint | 5 min | Any failure |

### **Secondary Monitors** (Nice to Have)

| Monitor | URL | Interval | Alert On |
|---------|-----|----------|----------|
| Auth Endpoint | `/api/auth/me` | 5 min | 5 failures |
| SSL Certificate | Domain | 1 day | 30 days before expiry |
| DNS | meridian.app | 1 hour | Resolution failure |

---

## 🔔 Alert Configuration

### **Alert Hierarchy**

```
Severity 1 (Critical):
  - API down
  - Database down
  - Authentication broken
  → Alert: SMS + Phone + Slack + Email
  → Response: Immediate

Severity 2 (High):
  - Slow response times (>2s)
  - Error rate >5%
  - WebSocket down
  → Alert: Slack + Email
  → Response: Within 30 minutes

Severity 3 (Medium):
  - Regional issues
  - SSL expiring soon
  → Alert: Email
  → Response: Within 24 hours
```

### **Example UptimeRobot Alert**

```
Subject: [Meridian] API is DOWN

Monitor: Meridian API Health
Status: Down
Reason: HTTP 500 error
Started: 2025-10-30 23:45:12 UTC
Duration: 3 minutes

URL: https://api.meridian.app/api/health

View Details: https://uptimerobot.com/monitor/...
```

---

## 🌍 Multi-Region Monitoring

### **Why Multi-Region?**

Check availability from multiple locations to:
- Detect regional outages
- Identify CDN issues
- Monitor global latency
- Verify DNS propagation

### **Recommended Locations**

- 🇺🇸 US East (Primary)
- 🇺🇸 US West
- 🇪🇺 Europe (London/Frankfurt)
- 🇦🇺 Asia Pacific (Singapore/Tokyo)

Most paid services include this. UptimeRobot free tier uses random locations.

---

## 📊 Status Page Example

### **Create Public Status Page**

**URL**: status.meridian.app

**Components to Show**:
- 🟢 API Server
- 🟢 Web Application
- 🟢 WebSocket Server
- 🟢 Database
- 🟢 File Storage

**Metrics to Display**:
- Current status (Operational / Degraded / Down)
- Uptime percentage (Last 30/90 days)
- Response time graph
- Incident history

**Example**:
```
Meridian Status - All Systems Operational ✅

API Server              🟢 Operational    99.98% uptime
Web Application         🟢 Operational    99.95% uptime
WebSocket Server        🟢 Operational    99.92% uptime
Database                🟢 Operational    99.99% uptime

Last 7 Days: 100% uptime
Last 30 Days: 99.94% uptime
Last 90 Days: 99.92% uptime
```

---

## 🔧 Advanced Configuration

### **Custom Health Check Endpoint**

Ensure your `/api/metrics/health` returns comprehensive status:

```typescript
// apps/api/src/modules/system-health/index.ts
export async function getHealth() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: await checkMemory(),
  };

  const allHealthy = Object.values(checks).every(c => c.healthy);

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
}
```

### **Webhook Alerts**

```typescript
// Receive UptimeRobot webhooks
app.post('/api/webhooks/uptime', async (c) => {
  const { monitorFriendlyName, monitorURL, alertType } = await c.req.json();

  if (alertType === 'down') {
    // Send urgent Slack message
    await sendSlackAlert({
      channel: '#alerts',
      text: `🚨 CRITICAL: ${monitorFriendlyName} is DOWN!`,
      priority: 'high',
    });

    // Create incident
    await createIncident({
      title: `${monitorFriendlyName} Down`,
      severity: 'critical',
    });
  }

  return c.json({ received: true });
});
```

---

## 📈 SLA Targets

### **Recommended Targets**

| Service Level | Uptime | Downtime/Month | Target For |
|---------------|--------|----------------|------------|
| **Gold** | 99.99% | 4.3 minutes | Enterprise |
| **Silver** | 99.9% | 43 minutes | Business |
| **Bronze** | 99% | 7.2 hours | Startups |

For Meridian, aim for: **99.9%** (Silver) uptime

---

## 🎯 Quick Start (UptimeRobot - 15 min)

```bash
# 1. Sign up
Open: https://uptimerobot.com/signUp

# 2. Add first monitor
Dashboard → Add New Monitor
Type: HTTP(S)
URL: https://api.meridian.app/api/health
Name: Meridian API Health
Interval: 5 minutes

# 3. Add alert contacts
My Settings → Alert Contacts
Add: your-email@example.com

# 4. Create status page
Status Pages → Add Status Page
Add monitors → Publish

# 5. Test
Dashboard → Monitor → Pause/Unpause
Check that you receive alerts

# Done! ✅
```

---

## 🔄 Integration with Existing Monitoring

### **Combine with Current Stack**

**You Already Have**:
- ✅ Prometheus metrics (`/api/metrics`)
- ✅ Health checks (`/api/metrics/health`)
- ✅ Sentry errors
- ✅ Web Vitals

**Add Uptime Monitoring**:
- ✅ External availability checking
- ✅ Alert on total outage
- ✅ Public status page
- ✅ SMS/call escalation

**Result**: Complete monitoring stack! 🎯

---

## ✅ Verification Checklist

After setup:

- [ ] Monitors created for all services
- [ ] Alerts configured (email minimum)
- [ ] Status page published
- [ ] Test alerts (trigger intentionally)
- [ ] Document runbook for outages
- [ ] Train team on status page
- [ ] Add status badge to README
- [ ] Set SLA targets
- [ ] Review weekly uptime reports

---

## 🏆 Success Metrics

```
Week 1:   Monitors active, alerts working
Month 1:  99%+ uptime tracked
Month 3:  99.9%+ uptime achieved
Year 1:   Historical data for planning
```

---

**Status**: Guide complete  
**Recommended**: UptimeRobot (free) + Pingdom (paid) combo  
**Next**: Sign up and configure


