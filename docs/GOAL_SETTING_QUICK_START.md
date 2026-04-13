# 🚀 Goal Setting - Developer Quick Start

**Ready to implement?** This guide gets you coding in 5 minutes.

---

## ✅ What's Already Done

- ✅ **Database schema** created (`apps/api/src/database/schema/goals.ts`)
- ✅ **Complete PRD** with all requirements (`scripts/goal-setting-prd.txt`)
- ✅ **Implementation plan** with 26 tasks (`docs/GOAL_SETTING_IMPLEMENTATION_PLAN.md`)
- ✅ **Codebase analysis** complete (`docs/GOAL_SETTING_CODEBASE_ANALYSIS.md`)

---

## 🎯 Start Here

### Step 1: Apply Database Schema (5 minutes)

```bash
# Navigate to API directory
cd apps/api

# Generate migration from schema
npx drizzle-kit generate:pg

# Apply migration to database
npx drizzle-kit push:pg

# Verify tables created
npx drizzle-kit studio
# Open browser, check for: goals, goal_key_results, goal_progress, goal_reflections, goal_milestones
```

### Step 2: Export Schema (1 minute)

```typescript
// Edit apps/api/src/database/schema.ts
// Add at the end:

export * from './schema/goals';
```

### Step 3: Create API Structure (2 minutes)

```bash
# Create goals feature directory
mkdir -p apps/api/src/goals/controllers

# Create base files
touch apps/api/src/goals/routes.ts
touch apps/api/src/goals/types.ts
touch apps/api/src/goals/controllers/create-goal.ts
touch apps/api/src/goals/controllers/get-goals.ts
touch apps/api/src/goals/controllers/get-goal-detail.ts
touch apps/api/src/goals/controllers/update-goal.ts
touch apps/api/src/goals/controllers/delete-goal.ts
```

### Step 4: Implement First Endpoint (15 minutes)

Use this template:

```typescript
// apps/api/src/goals/controllers/create-goal.ts
import { Context } from "hono";
import { db } from "@/database/client";
import { goals } from "@/database/schema/goals";
import { createId } from "@paralleldrive/cuid2";

export async function createGoal(c: Context) {
  try {
    const userId = c.get('userId');
    const workspaceId = c.get('workspaceId');
    const body = await c.req.json();
    
    // Validation
    if (!body.title || body.title.length > 100) {
      return c.json({ error: "Title required (max 100 chars)" }, 400);
    }
    
    // Create goal
    const [goal] = await db.insert(goals).values({
      id: createId(),
      workspaceId,
      userId,
      title: body.title,
      description: body.description,
      type: body.type || 'personal',
      timeframe: body.timeframe || 'Q1 2025',
      startDate: body.startDate,
      endDate: body.endDate,
      priority: body.priority || 'medium',
      privacy: body.privacy || 'private',
    }).returning();
    
    return c.json({ success: true, data: goal }, 201);
  } catch (error) {
    console.error("Create goal error:", error);
    return c.json({ error: "Failed to create goal" }, 500);
  }
}
```

```typescript
// apps/api/src/goals/routes.ts
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth";
import { createGoal } from "./controllers/create-goal";

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// Routes
app.post('/', createGoal);

export default app;
```

```typescript
// Register in main app (apps/api/src/index.ts)
import goalsRoutes from './goals/routes';

// Add to routes
app.route('/api/goals', goalsRoutes);
```

### Step 5: Test It (2 minutes)

```bash
# Start API server
pnpm --filter @meridian/api dev

# In another terminal, test with curl:
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Complete Q1 OKRs",
    "description": "Set and achieve Q1 objectives",
    "type": "objective",
    "timeframe": "Q1 2025"
  }'
```

---

## 📖 Documentation Reference

### Quick Links
- **PRD**: `scripts/goal-setting-prd.txt` - Full product requirements
- **Implementation Plan**: `docs/GOAL_SETTING_IMPLEMENTATION_PLAN.md` - 26 tasks with examples
- **Codebase Analysis**: `docs/GOAL_SETTING_CODEBASE_ANALYSIS.md` - Patterns and architecture
- **Strategic Summary**: `docs/GOAL_SETTING_STRATEGIC_SUMMARY.md` - Executive overview
- **Session Summary**: `docs/SESSION_SUMMARY_GOAL_SETTING.md` - What was accomplished

### Task Breakdown
All 26 tasks are in: `docs/GOAL_SETTING_IMPLEMENTATION_PLAN.md`

Quick overview:
- **Phase 1** (Days 1-2): Database + Core APIs
- **Phase 2** (Days 3-4): Frontend Core
- **Phase 3** (Day 5): Team Features
- **Phase 4** (Day 6): Milestones
- **Phase 5** (Day 7): Metrics & Reflections
- **Phase 6** (Day 8): Polish & Testing

---

## 🔍 Key Patterns to Follow

### Database Queries
```typescript
import { db } from "@/database/client";
import { goals, goalKeyResults } from "@/database/schema/goals";
import { eq, and } from "drizzle-orm";

// Get goals with key results
const goalsWithKRs = await db.query.goals.findMany({
  where: and(
    eq(goals.workspaceId, workspaceId),
    eq(goals.userId, userId),
    eq(goals.status, 'active')
  ),
  with: {
    keyResults: true,
    progressEntries: {
      orderBy: (progress, { desc }) => [desc(progress.recordedAt)],
      limit: 10
    }
  }
});
```

### Error Handling
```typescript
try {
  // ... operation
} catch (error) {
  console.error("Operation failed:", error);
  return c.json({ 
    error: "User-friendly message",
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  }, 500);
}
```

### Validation
```typescript
// Use Zod for validation
import { z } from "zod";

const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['objective', 'personal', 'team', 'strategic']),
  timeframe: z.string(),
  // ... more fields
});

const body = createGoalSchema.parse(await c.req.json());
```

---

## 🧪 Testing Template

```typescript
// apps/api/src/goals/__tests__/create-goal.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from '@/test-utils';
import { db } from '@/database/client';
import { goals } from '@/database/schema/goals';

describe('POST /api/goals', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(goals).where(eq(goals.userId, 'test-user-id'));
  });

  it('creates a goal successfully', async () => {
    const response = await testClient.post('/api/goals', {
      json: {
        title: 'Test Goal',
        type: 'personal',
        timeframe: 'Q1 2025'
      }
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Test Goal');
  });

  it('validates title length', async () => {
    const response = await testClient.post('/api/goals', {
      json: {
        title: 'a'.repeat(101), // Too long
        type: 'personal'
      }
    });

    expect(response.status).toBe(400);
  });
});
```

---

## 🎨 Frontend Quick Start

Once APIs are done, start frontend:

```bash
# Create React Query hook
touch apps/web/src/hooks/queries/goals/use-goals.ts

# Create component
touch apps/web/src/components/goals/okr-widget.tsx

# Add to dashboard
# Edit: apps/web/src/routes/dashboard/index.tsx
```

**Hook Template**:
```typescript
// apps/web/src/hooks/queries/goals/use-goals.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGoals(workspaceId: string) {
  return useQuery({
    queryKey: ['goals', workspaceId],
    queryFn: async () => {
      const response = await api.get(`/api/goals/${workspaceId}`);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}
```

---

## 🚨 Common Gotchas

1. **Import Path**: Use `@/database/schema/goals` not `@/database/schema`
2. **Auth Middleware**: All routes need `authMiddleware` applied
3. **Workspace Scoping**: Always filter by `workspaceId` for multi-tenancy
4. **Indexes**: Schema already has indexes, but verify they're created in DB
5. **Relations**: Use Drizzle's `.query` API for easy joins

---

## ✅ Definition of Done

**Feature is complete when**:
- [ ] All 26 tasks from implementation plan are done
- [ ] API tests pass (>90% coverage)
- [ ] Frontend tests pass (>80% coverage)
- [ ] E2E tests pass
- [ ] Performance benchmarks met (<200ms API, <1s widgets)
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA sign-off

---

## 🆘 Need Help?

**Reference Documents**:
1. `docs/GOAL_SETTING_IMPLEMENTATION_PLAN.md` - Detailed task breakdown
2. `scripts/goal-setting-prd.txt` - Full requirements
3. `docs/GOAL_SETTING_CODEBASE_ANALYSIS.md` - Architecture patterns

**Stuck on Implementation?**
- Check existing patterns in `apps/api/src/` folders
- Review similar features (team-awareness, milestones)
- Follow database query patterns from other controllers

**Questions?**
- Refer to PRD for "why" questions
- Refer to Implementation Plan for "how" questions
- Refer to Codebase Analysis for "where" questions

---

## 🎯 Success Metrics Reminder

**Track These**:
- API response time (<200ms P95)
- Widget load time (<1s)
- Test coverage (>85%)
- User adoption (70% Week 1)
- Goal completion rate (60%)

---

**LET'S BUILD! 🚀**

Start with: `npx drizzle-kit generate:pg` in `apps/api/`

Then follow Phase 1 tasks from the implementation plan.

---

**Created**: October 30, 2025  
**Last Updated**: October 30, 2025  
**Estimated Time to First API**: 30 minutes  
**Estimated Time to First Widget**: 4 hours

