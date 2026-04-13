# 📡 Centralized Log Aggregation Implementation Guide

**Task**: Add centralized log aggregation (CloudWatch, Datadog, Elastic, etc.)  
**Priority**: 🔵 LOW  
**Estimated Time**: 2-4 hours  
**Risk Level**: LOW (improves observability)  
**Status**: 📋 **READY TO IMPLEMENT**

---

## 📊 **Current State**

### **Logging Infrastructure**
- ✅ Pino logger implemented
- ✅ Structured logging ready (see `STRUCTURED_LOGGING_GUIDE.md`)
- ⚠️ Logs only stored locally
- ⚠️ No centralized aggregation
- ⚠️ No long-term retention
- ⚠️ No advanced search/filtering

---

## 🎯 **Goals**

### **Primary Objectives**
✅ Centralize logs from all services  
✅ Enable long-term retention  
✅ Provide powerful search and filtering  
✅ Enable real-time monitoring and alerting  
✅ Support log analysis and reporting  
✅ Maintain GDPR compliance  

### **Success Criteria**
- [ ] Logs shipped to central service
- [ ] Search and filter logs by any field
- [ ] Set up alerts for critical errors
- [ ] Create dashboards for key metrics
- [ ] Retain logs for 30+ days
- [ ] Query performance < 1 second
- [ ] Zero log data loss

---

## 🏗️ **Architecture Options**

### **Option 1: AWS CloudWatch Logs** ⭐ **RECOMMENDED for AWS**

**Pros**:
- ✅ Native AWS integration
- ✅ Easy setup with existing AWS infrastructure
- ✅ Automatic scaling
- ✅ Cost-effective for AWS deployments
- ✅ Integrated with other AWS services

**Cons**:
- ❌ AWS-only (vendor lock-in)
- ❌ Less powerful query language than alternatives
- ❌ Can get expensive with high volume

**Cost**: ~$0.50/GB ingested, $0.03/GB stored per month

---

### **Option 2: Datadog Logs** ⭐ **RECOMMENDED for SaaS**

**Pros**:
- ✅ Excellent UI and search
- ✅ Powerful analytics
- ✅ Great alerting
- ✅ APM integration
- ✅ Multi-cloud support

**Cons**:
- ❌ Can be expensive
- ❌ SaaS only (no self-hosted)

**Cost**: ~$0.10/GB ingested, ~$1.70/million log events

---

### **Option 3: Elasticsearch + Kibana** ⭐ **RECOMMENDED for Self-Hosted**

**Pros**:
- ✅ Extremely powerful search
- ✅ Beautiful visualizations
- ✅ Self-hosted (full control)
- ✅ Open source option available
- ✅ Huge ecosystem

**Cons**:
- ❌ Complex to set up and maintain
- ❌ Requires infrastructure management
- ❌ Can be resource-intensive

**Cost**: Infrastructure costs (~$100-500/month for small deployments)

---

### **Option 4: Loki + Grafana** 

**Pros**:
- ✅ Cost-effective
- ✅ Integrates with Grafana ecosystem
- ✅ Simpler than Elasticsearch
- ✅ Good for Kubernetes environments

**Cons**:
- ❌ Less mature than alternatives
- ❌ More limited query capabilities
- ❌ Smaller ecosystem

**Cost**: Infrastructure costs (~$50-200/month)

---

## ⚙️ **Implementation**

### **Option 1: AWS CloudWatch Logs Implementation**

#### **1.1 Install Dependencies**

```bash
cd apps/api
npm install pino-cloudwatch
```

#### **1.2 Configure CloudWatch Transport**

**File**: `apps/api/src/utils/logger.ts` (add to existing)

```typescript
import pinoCloudwatch from 'pino-cloudwatch';

const isProduction = process.env.NODE_ENV === 'production';
const useCloudWatch = isProduction && process.env.CLOUDWATCH_ENABLED === 'true';

// CloudWatch configuration
if (useCloudWatch) {
  const cloudwatchStream = pinoCloudwatch({
    logGroupName: process.env.CLOUDWATCH_LOG_GROUP || '/meridian/api',
    logStreamName: process.env.CLOUDWATCH_LOG_STREAM || 
                   `${process.env.HOSTNAME || 'api'}-${Date.now()}`,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    interval: 1000, // Send logs every 1 second
  });

  // Pipe logs to CloudWatch
  logger.addDestination(cloudwatchStream);
}
```

#### **1.3 Environment Variables**

```bash
# .env (production)
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/meridian/api
CLOUDWATCH_LOG_STREAM=api-1
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

#### **1.4 Create CloudWatch Log Group**

```bash
# AWS CLI
aws logs create-log-group --log-group-name /meridian/api --region us-east-1

# Set retention
aws logs put-retention-policy \
  --log-group-name /meridian/api \
  --retention-in-days 30 \
  --region us-east-1
```

#### **1.5 IAM Permissions**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/meridian/*"
    }
  ]
}
```

#### **1.6 Query Logs**

```bash
# AWS CLI
aws logs filter-log-events \
  --log-group-name /meridian/api \
  --filter-pattern '{ $.level = "error" }' \
  --start-time 1698710400000

# Or use CloudWatch Insights
# Query: fields @timestamp, traceId, msg | filter level = "error" | sort @timestamp desc
```

---

### **Option 2: Datadog Logs Implementation**

#### **2.1 Install Dependencies**

```bash
cd apps/api
npm install pino-datadog
```

#### **2.2 Configure Datadog Transport**

**File**: `apps/api/src/utils/logger.ts` (add to existing)

```typescript
import pinoDatadog from 'pino-datadog';

const useDatadog = isProduction && process.env.DATADOG_ENABLED === 'true';

if (useDatadog) {
  const datadogStream = pinoDatadog({
    apiKey: process.env.DATADOG_API_KEY!,
    service: 'meridian-api',
    env: process.env.NODE_ENV,
    hostname: process.env.HOSTNAME,
    ddsource: 'nodejs',
    ddtags: `env:${process.env.NODE_ENV},version:${process.env.npm_package_version}`,
  });

  logger.addDestination(datadogStream);
}
```

#### **2.3 Environment Variables**

```bash
# .env (production)
DATADOG_ENABLED=true
DATADOG_API_KEY=your_datadog_api_key
DATADOG_SITE=datadoghq.com  # or datadoghq.eu for EU
```

#### **2.4 Create Log Pipelines**

In Datadog UI:
1. Go to **Logs → Configuration → Pipelines**
2. Create pipeline for `service:meridian-api`
3. Add processors:
   - **Grok Parser**: Extract fields from `msg`
   - **Status Remapper**: Map `level` to log status
   - **Trace ID Remapper**: Map `traceId` for APM correlation

#### **2.5 Create Monitors**

```javascript
// Datadog Monitor (via API or UI)
{
  "name": "High Error Rate - Meridian API",
  "type": "log alert",
  "query": "logs(\"service:meridian-api level:error\").index(\"*\").rollup(\"count\").by(\"*\").last(\"5m\") > 10",
  "message": "Error rate is high @pagerduty",
  "options": {
    "thresholds": {
      "critical": 10
    },
    "notify_audit": false,
    "notify_no_data": false
  }
}
```

---

### **Option 3: Elasticsearch + Kibana Implementation**

#### **3.1 Setup Elasticsearch & Kibana**

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

#### **3.2 Install Dependencies**

```bash
cd apps/api
npm install pino-elasticsearch
```

#### **3.3 Configure Elasticsearch Transport**

**File**: `apps/api/src/utils/logger.ts` (add to existing)

```typescript
import pinoElasticsearch from 'pino-elasticsearch';

const useElasticsearch = process.env.ELASTICSEARCH_ENABLED === 'true';

if (useElasticsearch) {
  const elasticsearchStream = pinoElasticsearch({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: 'meridian-logs',
    consistency: 'one',
    'es-version': 8,
    'flush-bytes': 1000,
  });

  logger.addDestination(elasticsearchStream);
}
```

#### **3.4 Environment Variables**

```bash
# .env
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_URL=http://localhost:9200
```

#### **3.5 Create Index Template**

```bash
curl -X PUT "localhost:9200/_index_template/meridian-logs" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["meridian-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    },
    "mappings": {
      "properties": {
        "time": { "type": "date" },
        "level": { "type": "keyword" },
        "traceId": { "type": "keyword" },
        "requestId": { "type": "keyword" },
        "userId": { "type": "keyword" },
        "workspaceId": { "type": "keyword" },
        "msg": { "type": "text" },
        "error": {
          "properties": {
            "message": { "type": "text" },
            "stack": { "type": "text" }
          }
        }
      }
    }
  }
}
'
```

#### **3.6 Create Kibana Dashboard**

1. Open Kibana: http://localhost:5601
2. Go to **Stack Management → Index Patterns**
3. Create pattern: `meridian-logs-*`
4. Go to **Discover** to search logs
5. Create visualizations and dashboards

---

### **Option 4: Loki + Grafana Implementation**

#### **4.1 Setup Loki & Grafana**

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - "3000:3000"
    environment:
      - GF_PATHS_PROVISIONING=/etc/grafana/provisioning
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  loki-data:
  grafana-data:
```

#### **4.2 Install Dependencies**

```bash
cd apps/api
npm install pino-loki
```

#### **4.3 Configure Loki Transport**

**File**: `apps/api/src/utils/logger.ts` (add to existing)

```typescript
import pinoLoki from 'pino-loki';

const useLoki = process.env.LOKI_ENABLED === 'true';

if (useLoki) {
  const lokiStream = pinoLoki({
    host: process.env.LOKI_URL || 'http://localhost:3100',
    labels: {
      application: 'meridian-api',
      environment: process.env.NODE_ENV || 'development',
    },
    interval: 5,
  });

  logger.addDestination(lokiStream);
}
```

---

## 📊 **Log Retention Policies**

### **Recommended Retention**
```
ERROR logs:     90 days
WARN logs:      30 days
INFO logs:      14 days
DEBUG logs:     7 days
TRACE logs:     1 day
```

### **Implementation Examples**

**CloudWatch**:
```bash
aws logs put-retention-policy \
  --log-group-name /meridian/api/errors \
  --retention-in-days 90
```

**Elasticsearch**:
```json
{
  "index.lifecycle.policy": {
    "phases": {
      "hot": {
        "actions": {}
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

## 🔍 **Common Queries**

### **CloudWatch Insights**

```sql
-- Find all errors for a specific user
fields @timestamp, traceId, msg, error
| filter userId = "user_123" and level = "error"
| sort @timestamp desc
| limit 100

-- Top 10 slowest requests
fields @timestamp, path, performance.duration
| filter type = "response"
| sort performance.duration desc
| limit 10

-- Error rate by hour
stats count() as errorCount by bin(1h) as hour
| filter level = "error"
```

### **Datadog**

```
service:meridian-api status:error @userId:user_123

service:meridian-api @type:response @performance.duration:>1000

service:meridian-api status:error | timeseries count() by 1h
```

### **Elasticsearch (Kibana)**

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "error" } },
        { "match": { "userId": "user_123" } }
      ],
      "filter": [
        { "range": { "time": { "gte": "now-24h" } } }
      ]
    }
  }
}
```

---

## 🎯 **Monitoring & Alerts**

### **Recommended Alerts**

1. **High Error Rate**
   - Condition: > 10 errors/minute
   - Severity: Critical
   - Notify: PagerDuty

2. **Slow Requests**
   - Condition: p95 response time > 1000ms
   - Severity: Warning
   - Notify: Slack

3. **Failed Authentications**
   - Condition: > 5 failed auth/minute from same IP
   - Severity: Warning
   - Notify: Security team

4. **Database Errors**
   - Condition: Any database connection error
   - Severity: Critical
   - Notify: PagerDuty + Slack

---

## 💰 **Cost Estimates**

### **CloudWatch** (10GB/month)
```
Ingestion: 10GB × $0.50 = $5.00
Storage:   10GB × $0.03 = $0.30
──────────────────────────────
Total:     $5.30/month
```

### **Datadog** (10GB/month, 100M events)
```
Ingestion: 10GB × $0.10 = $1.00
Events:    100M × $1.70 = $170.00
──────────────────────────────
Total:     $171.00/month
```

### **Elasticsearch** (self-hosted)
```
EC2 Instance (t3.medium): $30/month
EBS Storage (100GB):      $10/month
Data Transfer:             $5/month
──────────────────────────────
Total:     $45/month
```

---

## 📋 **Implementation Checklist**

- [ ] Choose log aggregation service
- [ ] Install required dependencies
- [ ] Configure transport in logger
- [ ] Set environment variables
- [ ] Create log groups/indices
- [ ] Test log shipping
- [ ] Configure retention policies
- [ ] Create dashboards
- [ ] Set up alerts
- [ ] Document query patterns
- [ ] Train team on log search

---

## 📚 **Resources**

- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
- [Datadog Logs](https://docs.datadoghq.com/logs/)
- [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Grafana Loki](https://grafana.com/docs/loki/latest/)
- [Pino Transports](https://getpino.io/#/docs/transports)

---

**Implementation Status**: 📋 **READY TO IMPLEMENT**  
**Estimated Time**: 2-4 hours  
**Cost**: $5-200/month depending on option  
**Priority**: LOW (not blocking deployment)

**Recommendation**: Start with **CloudWatch** if on AWS, **Datadog** if budget allows, or **Elasticsearch** for self-hosted control.

