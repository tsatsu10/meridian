# Phase 6.2: Performance Optimization Guide

## 🚀 Performance Optimization Strategy

### Overview
This document outlines performance optimizations for the Meridian project management platform, focusing on database queries, bundle size, WebSocket efficiency, and frontend rendering.

---

## 📊 Current Performance Baseline

### API Response Times (to be measured)
- **Target:** < 200ms (p95)
- **Critical:** < 500ms (p99)

### Frontend Metrics
- **First Contentful Paint (FCP):** Target < 1.5s
- **Largest Contentful Paint (LCP):** Target < 2.5s
- **Time to Interactive (TTI):** Target < 3.5s
- **Cumulative Layout Shift (CLS):** Target < 0.1

### WebSocket Performance
- **Connection Time:** Target < 500ms
- **Message Latency:** Target < 200ms
- **Reconnection Time:** Target < 2s

---

## 🗄️ Database Query Optimization

### 1. Add Strategic Indexes

**Project Notes Tables:**
```sql
-- apps/api/src/database/migrations/add_notes_indexes.sql

-- Project notes indexes
CREATE INDEX IF NOT EXISTS idx_project_notes_project_id 
ON project_notes(project_id);

CREATE INDEX IF NOT EXISTS idx_project_notes_created_by 
ON project_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_project_notes_is_pinned 
ON project_notes(is_pinned) 
WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_project_notes_is_archived 
ON project_notes(is_archived);

CREATE INDEX IF NOT EXISTS idx_project_notes_updated_at 
ON project_notes(updated_at DESC);

-- Full-text search on title and content
CREATE INDEX IF NOT EXISTS idx_project_notes_search 
ON project_notes USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Note versions indexes
CREATE INDEX IF NOT EXISTS idx_note_versions_note_id 
ON note_versions(note_id);

CREATE INDEX IF NOT EXISTS idx_note_versions_created_at 
ON note_versions(created_at DESC);

-- Note comments indexes
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id 
ON note_comments(note_id);

CREATE INDEX IF NOT EXISTS idx_note_comments_user_email 
ON note_comments(user_email);

CREATE INDEX IF NOT EXISTS idx_note_comments_created_at 
ON note_comments(created_at);
```

**Settings & Themes Tables:**
```sql
-- Custom themes indexes
CREATE INDEX IF NOT EXISTS idx_custom_themes_workspace_id 
ON custom_themes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_custom_themes_created_by 
ON custom_themes(created_by);

CREATE INDEX IF NOT EXISTS idx_custom_themes_is_public 
ON custom_themes(is_public) 
WHERE is_public = true;

-- Dashboard templates indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_workspace_id 
ON dashboard_templates(workspace_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_is_global 
ON dashboard_templates(is_global) 
WHERE is_global = true;

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_is_public 
ON dashboard_templates(is_public) 
WHERE is_public = true;

-- Dashboard widgets indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_workspace_id 
ON dashboard_widgets(workspace_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_category 
ON dashboard_widgets(category);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_is_public 
ON dashboard_widgets(is_public) 
WHERE is_public = true;

-- User widget instances indexes
CREATE INDEX IF NOT EXISTS idx_user_widget_instances_user_email 
ON user_widget_instances(user_email);

CREATE INDEX IF NOT EXISTS idx_user_widget_instances_workspace_id 
ON user_widget_instances(workspace_id);

CREATE INDEX IF NOT EXISTS idx_user_widget_instances_widget_id 
ON user_widget_instances(widget_id);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_email_section 
ON user_settings(user_email, section);
```

---

### 2. Optimize Frequent Queries

**Current Slow Query:** Get all notes for a project
```typescript
// Before (N+1 query problem)
const notes = await db.select().from(projectNotesTable)
  .where(eq(projectNotesTable.projectId, projectId));

// For each note, get creator info
for (const note of notes) {
  const creator = await db.select().from(users)
    .where(eq(users.id, note.createdBy)).limit(1);
  note.creatorName = creator[0]?.name;
}
```

**Optimized with Join:**
```typescript
// After (single query with join)
const notes = await db
  .select({
    id: projectNotesTable.id,
    title: projectNotesTable.title,
    content: projectNotesTable.content,
    isPinned: projectNotesTable.isPinned,
    isArchived: projectNotesTable.isArchived,
    tags: projectNotesTable.tags,
    createdAt: projectNotesTable.createdAt,
    updatedAt: projectNotesTable.updatedAt,
    creatorName: users.name,
    creatorEmail: users.email,
  })
  .from(projectNotesTable)
  .leftJoin(users, eq(projectNotesTable.createdBy, users.id))
  .where(eq(projectNotesTable.projectId, projectId))
  .orderBy(
    desc(projectNotesTable.isPinned),
    desc(projectNotesTable.updatedAt)
  );
```

---

### 3. Implement Query Result Caching

**Add Redis Caching Layer:**
```typescript
// apps/api/src/utils/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch and cache
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Usage in API:**
```typescript
// Cache project notes list
app.get("/projects/:projectId/notes", async (c) => {
  const projectId = c.req.param("projectId");
  const cacheKey = `notes:project:${projectId}`;

  const notes = await getCached(cacheKey, async () => {
    return await db.select().from(projectNotesTable)
      .where(eq(projectNotesTable.projectId, projectId));
  }, 60); // Cache for 1 minute

  return c.json({ data: notes });
});

// Invalidate cache on update
app.patch("/notes/:noteId", async (c) => {
  const note = await updateNote(/* ... */);
  
  // Invalidate project notes cache
  await invalidateCache(`notes:project:${note.projectId}`);
  
  return c.json({ data: note });
});
```

---

## 🌐 WebSocket Connection Optimization

### 1. Connection Pooling & Management

**Implement Connection Limits:**
```typescript
// apps/api/src/realtime/unified-websocket-server.ts

export class UnifiedWebSocketServer {
  private maxConnectionsPerUser = 5; // Limit connections per user
  private connectionCounts: Map<string, number> = new Map();

  private async handleConnection(socket: any) {
    const userEmail = socket.handshake.query.userEmail as string;

    // Check connection limit
    const currentCount = this.connectionCounts.get(userEmail) || 0;
    if (currentCount >= this.maxConnectionsPerUser) {
      socket.emit('error', { 
        error: 'Maximum connections reached. Please close other tabs.' 
      });
      socket.disconnect();
      return;
    }

    // Track connection
    this.connectionCounts.set(userEmail, currentCount + 1);

    // ... rest of connection logic
  }

  private handleDisconnection(socketId: string) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const count = this.connectionCounts.get(connection.userEmail) || 0;
      this.connectionCounts.set(connection.userEmail, Math.max(0, count - 1));
    }
    // ... rest of disconnection logic
  }
}
```

---

### 2. Message Batching

**Batch Multiple Updates:**
```typescript
// apps/api/src/realtime/controllers/note-collaboration.ts

export class NoteCollaborationHandler {
  private messageQueue: Map<string, any[]> = new Map();
  private flushInterval = 100; // Flush every 100ms

  constructor() {
    // Start flush interval
    setInterval(() => this.flushMessages(), this.flushInterval);
  }

  updateCursor(socket: Socket, data: CursorUpdate) {
    const noteId = data.noteId;
    
    // Add to queue instead of immediate broadcast
    if (!this.messageQueue.has(noteId)) {
      this.messageQueue.set(noteId, []);
    }
    
    this.messageQueue.get(noteId)!.push({
      type: 'cursor',
      data
    });
  }

  private flushMessages() {
    for (const [noteId, messages] of this.messageQueue.entries()) {
      if (messages.length > 0) {
        // Batch broadcast all messages
        this.io.to(`note:${noteId}`).emit('note:batch_update', {
          updates: messages,
          timestamp: new Date().toISOString()
        });
        
        // Clear queue
        this.messageQueue.set(noteId, []);
      }
    }
  }
}
```

---

## 📦 Frontend Bundle Optimization

### 1. Code Splitting by Route

**Implement Lazy Loading:**
```typescript
// apps/web/src/routes/dashboard/workspace/$workspaceId/project/$projectId/notes.tsx

import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';

// Lazy load heavy components
const NotesList = lazy(() => import('@/components/project-notes/notes-list').then(m => ({ default: m.NotesList })));
const NoteEditor = lazy(() => import('@/components/project-notes/note-editor').then(m => ({ default: m.NoteEditor })));
const VersionHistory = lazy(() => import('@/components/project-notes/version-history').then(m => ({ default: m.VersionHistory })));
const NoteComments = lazy(() => import('@/components/project-notes/note-comments').then(m => ({ default: m.NoteComments })));

function ProjectNotesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Component rendering */}
    </Suspense>
  );
}
```

---

### 2. Optimize Dependencies

**Analyze Bundle:**
```bash
cd apps/web
npm run build
npx vite-bundle-visualizer
```

**Replace Heavy Dependencies:**
```typescript
// Before: Using entire date-fns library
import { formatDistanceToNow, format } from 'date-fns';

// After: Import only what you need
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import format from 'date-fns/format';
```

**Tree-shake Unused Code:**
```json
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['@tanstack/react-router'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'chart': ['recharts'], // Separate heavy charting library
        }
      }
    }
  }
});
```

---

### 3. Image Optimization

**Add Image Optimization Script:**
```bash
# Install sharp for image processing
npm install --save-dev sharp

# Create optimization script
```

```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'public/images';
const outputDir = 'public/images/optimized';

fs.readdirSync(inputDir).forEach(file => {
  if (file.match(/\.(jpg|jpeg|png)$/i)) {
    sharp(path.join(inputDir, file))
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp')));
  }
});
```

---

## ⚡ Frontend Rendering Optimization

### 1. React Performance

**Memoize Expensive Components:**
```typescript
// apps/web/src/components/project-notes/notes-list.tsx

import { memo, useMemo } from 'react';

export const NotesList = memo(function NotesList({ projectId, onSelectNote, onCreateNote }: NotesListProps) {
  // Memoize filtered notes computation
  const filteredNotes = useMemo(() => {
    if (searchQuery) {
      return notes.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return notes;
  }, [notes, searchQuery]);

  // ... rest of component
});
```

**Virtualize Long Lists:**
```typescript
// Install react-window
npm install react-window

// Use FixedSizeList for performance
import { FixedSizeList } from 'react-window';

function NotesList({ notes }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <NoteCard note={notes[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={notes.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

### 2. Debounce Expensive Operations

**Optimize Auto-save:**
```typescript
// apps/web/src/components/project-notes/note-editor.tsx

import { useDebouncedCallback } from 'use-debounce';

export function NoteEditor({ note }: NoteEditorProps) {
  const debouncedSave = useDebouncedCallback(
    async (content: string) => {
      await saveNote({ ...note, content });
    },
    2000 // 2 second debounce
  );

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    debouncedSave(e.target.value);
  };

  // ... rest of component
}
```

---

## 🎯 API Response Caching

### 1. HTTP Cache Headers

**Add Caching Middleware:**
```typescript
// apps/api/src/middleware/cache.ts

export function cacheControl(seconds: number) {
  return async (c: any, next: any) => {
    await next();
    
    c.header('Cache-Control', `public, max-age=${seconds}`);
    c.header('Expires', new Date(Date.now() + seconds * 1000).toUTCString());
  };
}

// Usage
app.get('/themes/marketplace', cacheControl(300), async (c) => {
  // Cache for 5 minutes
  const themes = await getMarketplaceThemes();
  return c.json({ data: themes });
});
```

---

### 2. ETag Support

**Implement ETags for Conditional Requests:**
```typescript
import crypto from 'crypto';

app.get('/notes/:noteId', async (c) => {
  const note = await getNote(noteId);
  
  // Generate ETag from content hash
  const etag = crypto
    .createHash('md5')
    .update(JSON.stringify(note))
    .digest('hex');
  
  // Check If-None-Match header
  if (c.req.header('If-None-Match') === etag) {
    return c.status(304); // Not Modified
  }
  
  c.header('ETag', etag);
  return c.json({ data: note });
});
```

---

## 📊 Performance Monitoring

### 1. Add Performance Metrics

**API Response Time Tracking:**
```typescript
// apps/api/src/middleware/metrics.ts

export async function metricsMiddleware(c: any, next: any) {
  const start = Date.now();
  
  await next();
  
  const duration = Date.now() - start;
  const path = c.req.path;
  const method = c.req.method;
  
  console.log(`[METRICS] ${method} ${path} - ${duration}ms`);
  
  // Send to monitoring service (DataDog, New Relic, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to DataDog
    // dogstatsd.histogram('api.response_time', duration, [`path:${path}`, `method:${method}`]);
  }
}
```

---

### 2. Frontend Performance Monitoring

**Add Web Vitals Tracking:**
```typescript
// apps/web/src/utils/web-vitals.ts

import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const body = JSON.stringify(metric);
  
  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`.
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// Call in main.tsx
initWebVitals();
```

---

## 🎯 Performance Targets & Success Metrics

### API Performance
- ✅ Average response time: < 150ms
- ✅ p95 response time: < 200ms
- ✅ p99 response time: < 500ms
- ✅ Throughput: > 1000 req/s

### Frontend Performance
- ✅ First Contentful Paint: < 1.5s
- ✅ Largest Contentful Paint: < 2.5s
- ✅ Time to Interactive: < 3.5s
- ✅ Cumulative Layout Shift: < 0.1
- ✅ Bundle size (gzipped): < 2MB

### WebSocket Performance
- ✅ Connection time: < 500ms
- ✅ Message latency: < 200ms
- ✅ Concurrent connections: > 1000
- ✅ Connection success rate: > 99%

### Database Performance
- ✅ Query time (simple): < 10ms
- ✅ Query time (complex): < 50ms
- ✅ Index usage: > 95% of queries
- ✅ Connection pool efficiency: > 80%

---

## 🚀 Implementation Priority

### High Priority (Week 1)
1. ✅ Add database indexes
2. ✅ Optimize N+1 queries
3. ✅ Implement code splitting
4. ✅ Add performance monitoring

### Medium Priority (Week 2)
1. Implement Redis caching
2. WebSocket message batching
3. Image optimization
4. Bundle size reduction

### Low Priority (Future)
1. CDN configuration
2. Advanced caching strategies
3. Service worker implementation
4. HTTP/2 push optimization

---

*This optimization guide provides actionable steps to improve performance across the entire stack. Implement incrementally and measure results after each change.*

