# 🚀 Redis Caching Implementation Guide

**Purpose**: Improve API performance with Redis caching  
**Expected Impact**: 50-80% reduction in database queries  
**Setup Time**: 30 minutes

---

## 🎯 Overview

Redis caching reduces database load by storing frequently accessed data in memory.

**Benefits**:
- ⚡ Faster API responses (10-100x improvement)
- 📉 Reduced database load (50-80% fewer queries)
- 💰 Lower infrastructure costs
- 📈 Better scalability

---

## 🛠️ Setup Instructions

### **1. Install Redis**

**Option A: Docker (Recommended)**
```bash
docker run -d --name meridian-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

**Option B: Local Install**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (WSL required)
# Use Docker or WSL Ubuntu
```

### **2. Install Redis Client**

```bash
cd apps/api
npm install ioredis
```

### **3. Configure Environment**

```bash
# apps/api/.env
REDIS_URL=redis://localhost:6379

# Optional Redis configuration
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=meridian:
```

### **4. Import Caching Layer**

The caching utilities are already created in:
- `apps/api/src/lib/redis-cache.ts` - Main caching class
- `apps/api/src/lib/cached-queries.ts` - Common cached queries

---

## 📖 Usage Examples

### **Basic Usage**

```typescript
import { redisCache, CacheKeys, CacheTTL } from '@/lib/redis-cache';

// Get from cache or database
const project = await redisCache.getOrSet(
  CacheKeys.project(projectId),
  async () => {
    // This only runs on cache miss
    return await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
  },
  CacheTTL.MEDIUM // 5 minutes
);
```

### **Using Cached Queries**

```typescript
import { getCachedProject, getCachedTasks } from '@/lib/cached-queries';

// Automatically cached
const project = await getCachedProject(projectId);
const tasks = await getCachedTasks(projectId);
```

### **Cache Invalidation**

```typescript
import { CacheInvalidator } from '@/lib/redis-cache';

// After updating a project
await db.update(projects).set({ name: 'New Name' }).where(eq(projects.id, projectId));
await CacheInvalidator.project(projectId, workspaceId);

// After creating a task
const newTask = await db.insert(tasks).values({ ... });
await CacheInvalidator.task(newTask.id, projectId);
```

---

## 🎯 What to Cache

### **High-Value Targets** (Cache These!)

| Data Type | Hit Rate | TTL | Impact |
|-----------|----------|-----|--------|
| User data | 90%+ | 30m | High |
| Workspace data | 85%+ | 5m | High |
| Project lists | 80%+ | 2m | High |
| Analytics | 75%+ | 5m | Medium |
| Settings | 95%+ | 1h | Medium |

### **Don't Cache These**

| Data Type | Reason |
|-----------|--------|
| Real-time chat | Changes constantly |
| Active sessions | Security risk |
| Task status (in active sprints) | Changes frequently |
| Notifications | Must be real-time |

---

## ⚡ Performance Impact

### **Before Caching**

```
GET /api/projects/:id
├─ Database query: 150ms
├─ Processing: 10ms
└─ Total: 160ms

Load: 1000 requests/min
Database queries: 1000/min
```

### **After Caching**

```
GET /api/projects/:id
├─ Redis lookup: 5ms (cache hit)
└─ Total: 5ms

or

├─ Redis lookup: 2ms (cache miss)
├─ Database query: 150ms
├─ Cache write: 3ms
└─ Total: 155ms (first time only)

Load: 1000 requests/min
Database queries: 50/min (95% cache hit rate)
API response: 32x faster
```

---

## 🔄 Cache Invalidation Patterns

### **Pattern 1: Immediate Invalidation**

```typescript
// Update and invalidate immediately
export async function updateProject(id: string, data: any) {
  const db = getDatabase();
  
  const updated = await db.update(projectTable)
    .set(data)
    .where(eq(projectTable.id, id))
    .returning();

  // Invalidate immediately
  await CacheInvalidator.project(id, data.workspaceId);

  return updated[0];
}
```

### **Pattern 2: Time-Based Expiry**

```typescript
// Let cache expire naturally
const analytics = await redisCache.getOrSet(
  CacheKeys.projectAnalytics(projectId),
  async () => calculateAnalytics(projectId),
  CacheTTL.MEDIUM // Auto-expires after 5 minutes
);
```

### **Pattern 3: Event-Based Invalidation**

```typescript
// Invalidate when events occur
publishEvent('task.completed', { taskId, projectId });

subscribeToEvent('task.completed', async ({ projectId }) => {
  await CacheInvalidator.task(taskId, projectId);
  await CacheInvalidator.analytics(); // Recalculate analytics
});
```

---

## 📊 Monitoring Cache Performance

### **Get Cache Statistics**

```typescript
import { redisCache, CacheMetrics } from '@/lib/redis-cache';

// GET /api/cache/stats
app.get('/api/cache/stats', async (c) => {
  const redisStats = await redisCache.getStats();
  const cacheMetrics = CacheMetrics.getStats();

  return c.json({
    redis: redisStats,
    performance: {
      hits: cacheMetrics.hits,
      misses: cacheMetrics.misses,
      hitRate: `${cacheMetrics.hitRate.toFixed(2)}%`,
    },
  });
});
```

### **Expected Metrics**

```
Good Performance:
- Hit Rate: 70-90%
- Avg Response: <50ms for cached
- Database Load: -50% reduction

Needs Tuning:
- Hit Rate: <50%
- Avg Response: >100ms
- No reduction in DB load
```

---

## 🔧 Production Configuration

### **Redis Cluster (High Availability)**

```javascript
// For production with failover
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'redis-1.example.com', port: 6379 },
  { host: 'redis-2.example.com', port: 6379 },
  { host: 'redis-3.example.com', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
  clusterRetryStrategy: (times) => Math.min(100 * times, 2000),
});
```

### **Memory Management**

```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru  # Evict least recently used
```

---

## 🧪 Testing

### **Test Cache Functionality**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { redisCache, CacheKeys } from '@/lib/redis-cache';

describe('Redis Cache', () => {
  beforeAll(async () => {
    // Connect to test Redis
    process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use DB 1 for tests
  });

  it('should cache and retrieve data', async () => {
    const key = 'test:key';
    const value = { id: '1', name: 'Test' };

    await redisCache.set(key, value, 60);
    const cached = await redisCache.get(key);

    expect(cached).toEqual(value);
  });

  it('should return null for missing keys', async () => {
    const cached = await redisCache.get('nonexistent:key');
    expect(cached).toBeNull();
  });

  it('should handle getOrSet pattern', async () => {
    let fetchCalled = false;

    const result1 = await redisCache.getOrSet(
      'test:getOrSet',
      async () => {
        fetchCalled = true;
        return { data: 'fresh' };
      },
      60
    );

    expect(fetchCalled).toBe(true);
    expect(result1).toEqual({ data: 'fresh' });

    fetchCalled = false;

    const result2 = await redisCache.getOrSet(
      'test:getOrSet',
      async () => {
        fetchCalled = true;
        return { data: 'fresh' };
      },
      60
    );

    expect(fetchCalled).toBe(false); // Should use cache
    expect(result2).toEqual({ data: 'fresh' });
  });
});
```

---

## ⚠️ Best Practices

### **DO**

✅ Cache read-heavy data (user profiles, project lists)  
✅ Set appropriate TTLs (short for changing data)  
✅ Invalidate on writes  
✅ Monitor hit rates  
✅ Handle Redis failures gracefully  

### **DON'T**

❌ Cache sensitive data (passwords, tokens)  
❌ Set extremely long TTLs  
❌ Forget to invalidate on updates  
❌ Cache everything blindly  
❌ Rely on cache for critical data  

---

## 🎯 Implementation Checklist

- [ ] Install Redis server
- [ ] Install ioredis package
- [ ] Configure REDIS_URL
- [ ] Import caching utilities
- [ ] Replace hot path queries with cached versions
- [ ] Add cache invalidation to mutations
- [ ] Test cache functionality
- [ ] Monitor hit rates
- [ ] Optimize TTLs based on metrics
- [ ] Set up Redis monitoring
- [ ] Configure production cluster (if needed)

---

## 📈 Expected Results

### **After Implementing Redis**

```
API Response Time:     -60% (160ms → 64ms)
Database Load:         -70% (1000 → 300 queries/min)
Server CPU:            -30% (less DB overhead)
User Experience:       +80% (faster load times)
Cost Savings:          $500-2000/month
```

---

## 📚 Resources

- [Redis Documentation](https://redis.io/docs/)
- [ioredis Guide](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Caching Strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Strategies.html)

---

**Status**: Implementation ready  
**Files**: Created (redis-cache.ts, cached-queries.ts)  
**Next**: Install Redis and enable


