# WebSocket & API Fix Plan - Design Thinking Approach

## 🎯 Problem Analysis (EMPATHIZE)

### Error Categories Identified:
1. **WebSocket Connection Failures** - Multiple failed connections to `ws://localhost:3005/socket.io/`
2. **404 Task Endpoint Errors** - GET `/api/tasks/:projectId` not found
3. **500 Analytics Error** - Internal server error on dashboard analytics
4. **React Component Warning** - Missing unique "key" prop in list
5. **Memory Warnings** - High memory usage alerts

---

## 📋 Core Problems (DEFINE)

### Problem 1: WebSocket Server Not Running
**Location:** `apps/api/src/index.ts:47-48`
```typescript
// @epic-2.2-realtime & @epic-3.1-messaging: Import Unified WebSocket server for robust real-time features
// import UnifiedWebSocketServer from "./realtime/unified-websocket-server";
// import { createServer } from "http";
```

**Impact:** 
- All real-time features broken
- Multiple WebSocket connection errors flooding console
- Project updates not syncing
- Chat/messaging not working

**Root Cause:** WebSocket server initialization is commented out

---

### Problem 2: Task Endpoint Route Mismatch
**Frontend Call:** `apps/web/src/hooks/queries/health/use-project-health.ts:57`
```typescript
const response = await fetch(`${API_URL}/api/tasks/${projectId}`);
```

**API Route:** `apps/api/src/index.ts:185` + `apps/api/src/task/index.ts:135`
```typescript
const taskRoute = app.route("/api/task", task); // Mounts at /api/task
// Inside task router:
.get("/tasks/:projectId", ...) // Creates /api/task/tasks/:projectId
```

**Impact:**
- All task fetches return 404
- Project health calculations fail
- Dashboard shows no tasks
- Project cards display incomplete data

**Root Cause:** Route path inconsistency between frontend and backend

---

### Problem 3: Analytics Endpoint Error
**Frontend Call:** 
```
GET /api/dashboard/analytics/:workspaceId?...
```

**Impact:**
- 500 Internal Server Error
- Dashboard analytics not loading
- Performance metrics unavailable

**Root Cause:** Need to investigate dashboard analytics controller

---

### Problem 4: React Key Prop Warning
**Location:** `apps/web/src/components/dashboard/enhanced-project-card.tsx:224`
```typescript
{health.factors.map((factor: any) => (
  <div key={factor.id} className="flex justify-between">
    <span>{factor.name}</span>
    <span className="font-medium">{Math.round(factor.score)}/100</span>
  </div>
))}
```

**Impact:**
- React warning in console
- Potential rendering issues
- Bad practice

**Root Cause:** Likely missing or incorrect `key` prop on parent element

---

## 🎨 Solution Design (IDEATE)

### Solution 1: Enable WebSocket Server
1. Uncomment WebSocket imports
2. Initialize WebSocket server alongside HTTP server
3. Integrate with existing Socket.IO client connections
4. Test real-time features

### Solution 2: Fix Task Endpoint Routes
**Option A:** Add alias route in API (Recommended)
```typescript
// Add in apps/api/src/index.ts
app.route("/api/tasks", task); // Alias without /task prefix
```

**Option B:** Update all frontend calls
```typescript
// Update in use-project-health.ts
const response = await fetch(`${API_URL}/api/task/tasks/${projectId}`);
```

**Decision:** Option A - Less risky, backward compatible

### Solution 3: Fix Analytics Endpoint
1. Check dashboard analytics controller
2. Add error handling
3. Validate database queries
4. Test with actual data

### Solution 4: Fix React Key Warning
1. Locate exact line with missing key
2. Ensure unique key prop on mapped elements
3. Test rendering

---

## 🛠️ Implementation Plan (PROTOTYPE)

### Priority 1: Task Endpoint (Immediate Impact)
1. Add `/api/tasks` alias route
2. Test with frontend
3. Verify 404s are resolved

### Priority 2: Analytics Fix (Dashboard Critical)
1. Investigate analytics controller
2. Add proper error handling
3. Test response

### Priority 3: WebSocket Server (Real-time Features)
1. Uncomment imports
2. Initialize server
3. Test connections
4. Verify real-time updates

### Priority 4: React Component Fix (Code Quality)
1. Fix key prop warning
2. Test rendering
3. Verify console is clean

---

## ✅ Success Criteria

- [ ] No WebSocket connection errors
- [ ] Task endpoints return 200
- [ ] Analytics loads without errors
- [ ] No React warnings in console
- [ ] Real-time updates working
- [ ] Dashboard fully functional

