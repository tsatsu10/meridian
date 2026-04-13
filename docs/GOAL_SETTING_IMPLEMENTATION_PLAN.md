# 🎯 Goal Setting Implementation Plan - Strategic Breakdown

**Created**: October 30, 2025  
**Feature**: Goal Setting & OKR System  
**Duration**: 6-8 days  
**Team**: Backend (2), Frontend (2), Design (0.5), QA (0.5)

---

## 📋 Project Overview

### Scope
Implement comprehensive goal setting system with:
- Personal OKRs (Objectives & Key Results)
- Team Goals Widget
- Milestone Countdown
- Success Metrics Tracking
- Weekly Reflection Prompts

### Success Criteria
- ✅ All 5 features functional and tested
- ✅ API response times <200ms
- ✅ Widget load times <1s
- ✅ 90%+ test coverage
- ✅ Mobile responsive
- ✅ WCAG AA accessible

---

## 🏗️ Phase 1: Foundation (Days 1-2)

### Task 1.1: Database Schema Design & Migration
**Duration**: 4 hours  
**Owner**: Backend Engineer  
**Priority**: P0 (Critical - blocks all other work)

**Deliverables**:
1. Create migration file: `apps/api/src/database/migrations/XXX_create_goals_schema.sql`
2. Define 5 new tables in `apps/api/src/database/schema/goals.ts`:
   - `goals` - Core goal/objective storage
   - `goal_key_results` - Key results for OKRs
   - `goal_progress` - Historical progress tracking
   - `goal_reflections` - Weekly reflections
   - `goal_milestones` - Personal/team milestones

**Schema Details**:
```typescript
// apps/api/src/database/schema/goals.ts
import { pgTable, text, integer, numeric, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users, workspaces } from "./schema";

export const goals = pgTable("goals", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id").notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'objective', 'personal', 'team'
  timeframe: text("timeframe").notNull(), // 'Q1 2025', '2025', 'custom'
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: text("status").notNull().default("active"), // 'draft', 'active', 'completed', 'abandoned'
  privacy: text("privacy").notNull().default("private"), // 'private', 'team', 'organization'
  parentGoalId: text("parent_goal_id").references(() => goals.id),
  progress: integer("progress").default(0), // 0-100
  priority: text("priority").default("medium"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  workspaceUserIdx: index("idx_goals_workspace_user").on(table.workspaceId, table.userId),
  statusIdx: index("idx_goals_status").on(table.status),
  endDateIdx: index("idx_goals_end_date").on(table.endDate),
}));

// Similar definitions for other tables...
```

**Testing**:
- Run migration on local database
- Verify all tables created
- Test foreign key constraints
- Verify indexes created

---

### Task 1.2: Core Goal API - CRUD Operations
**Duration**: 6 hours  
**Owner**: Backend Engineer  
**Priority**: P0  
**Depends On**: Task 1.1

**Deliverables**:
Create API structure:
```
apps/api/src/goals/
├── routes.ts                      # Route definitions
├── controllers/
│   ├── create-goal.ts            # POST /api/goals
│   ├── get-goals.ts              # GET /api/goals/:workspaceId
│   ├── get-goal-detail.ts        # GET /api/goals/:id
│   ├── update-goal.ts            # PUT /api/goals/:id
│   ├── delete-goal.ts            # DELETE /api/goals/:id
│   └── update-goal-status.ts     # PATCH /api/goals/:id/status
├── services/
│   ├── goal-service.ts           # Business logic
│   └── validation.ts             # Input validation
└── types.ts                       # TypeScript interfaces
```

**Controller Example**:
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
      return c.json({ error: "Invalid title" }, 400);
    }
    
    // Create goal
    const [goal] = await db.insert(goals).values({
      id: createId(),
      workspaceId,
      userId,
      title: body.title,
      description: body.description,
      type: body.type || 'personal',
      timeframe: body.timeframe,
      startDate: body.startDate,
      endDate: body.endDate,
      privacy: body.privacy || 'private',
      priority: body.priority || 'medium',
    }).returning();
    
    return c.json({ success: true, data: goal }, 201);
  } catch (error) {
    console.error("Create goal error:", error);
    return c.json({ error: "Failed to create goal" }, 500);
  }
}
```

**API Endpoints**:
- `POST /api/goals` - Create new goal
- `GET /api/goals/:workspaceId` - List goals (with filters: status, type, userId)
- `GET /api/goals/:id` - Get goal details with key results
- `PUT /api/goals/:id` - Update goal
- `PATCH /api/goals/:id/status` - Change status (active/completed/abandoned)
- `DELETE /api/goals/:id` - Soft delete goal

**Testing**:
- Unit tests for each controller
- Integration tests for full flow
- Test authorization (users can only access own goals)
- Test validation (invalid inputs rejected)

---

### Task 1.3: Key Results API
**Duration**: 4 hours  
**Owner**: Backend Engineer  
**Priority**: P0  
**Depends On**: Task 1.2

**Deliverables**:
```
apps/api/src/goals/controllers/
├── add-key-result.ts             # POST /api/goals/:id/key-results
├── update-key-result.ts          # PUT /api/key-results/:id
├── delete-key-result.ts          # DELETE /api/key-results/:id
└── update-kr-progress.ts         # PATCH /api/key-results/:id/progress
```

**Key Features**:
- Add 3-5 key results per goal
- Update target/current values
- Auto-calculate goal progress from KR completion
- Progress history tracking

**Business Logic**:
```typescript
// Calculate goal progress based on key results
async function calculateGoalProgress(goalId: string) {
  const keyResults = await db.select()
    .from(goalKeyResults)
    .where(eq(goalKeyResults.goalId, goalId));
    
  if (keyResults.length === 0) return 0;
  
  const totalProgress = keyResults.reduce((sum, kr) => {
    const progress = (kr.currentValue / kr.targetValue) * 100;
    return sum + Math.min(progress, 100);
  }, 0);
  
  return Math.round(totalProgress / keyResults.length);
}
```

---

### Task 1.4: Progress Tracking API
**Duration**: 3 hours  
**Owner**: Backend Engineer  
**Priority**: P0  
**Depends On**: Task 1.3

**Deliverables**:
- `POST /api/goals/:id/progress` - Log progress update
- `GET /api/goals/:id/progress` - Get progress history
- `GET /api/goals/:id/analytics` - Goal analytics (completion trend, velocity)

**Features**:
- Time-series progress data
- Automatic goal recalculation on KR update
- Progress visualization data (for charts)
- Historical tracking for trend analysis

---

## 🏗️ Phase 2: Frontend Core (Days 3-4)

### Task 2.1: React Query Hooks Setup
**Duration**: 2 hours  
**Owner**: Frontend Engineer  
**Priority**: P0  
**Depends On**: Task 1.2, 1.3, 1.4

**Deliverables**:
```
apps/web/src/hooks/queries/goals/
├── use-goals.ts                  # Fetch goals list
├── use-goal-detail.ts            # Fetch single goal
├── use-team-goals.ts             # Fetch team goals
└── index.ts                      # Exports

apps/web/src/hooks/mutations/goals/
├── use-create-goal.ts            # Create goal mutation
├── use-update-goal.ts            # Update goal mutation
├── use-delete-goal.ts            # Delete goal mutation
├── use-update-progress.ts        # Update progress mutation
└── index.ts                      # Exports
```

**Hook Example**:
```typescript
// apps/web/src/hooks/queries/goals/use-goals.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGoals(workspaceId: string, filters?: GoalFilters) {
  return useQuery({
    queryKey: ['goals', workspaceId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      
      const response = await api.get(`/api/goals/${workspaceId}?${params}`);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}
```

---

### Task 2.2: Goal Creation Modal Component
**Duration**: 6 hours  
**Owner**: Frontend Engineer  
**Priority**: P0  
**Depends On**: Task 2.1

**Deliverables**:
```
apps/web/src/components/goals/
├── create-goal-modal.tsx         # Main modal component
├── goal-form.tsx                 # Reusable form
├── key-result-form.tsx           # Key result fields
└── goal-type-selector.tsx        # Type selection UI
```

**Features**:
- Multi-step wizard (Objective → Key Results → Review)
- Real-time validation
- Keyboard shortcuts (Ctrl+Enter to submit)
- Draft saving
- Timeframe presets (This Quarter, This Year, Custom)
- Privacy controls

**UI Structure**:
```tsx
// apps/web/src/components/goals/create-goal-modal.tsx
export function CreateGoalModal({ open, onClose }: Props) {
  const [step, setStep] = useState(1); // 1: Objective, 2: Key Results, 3: Review
  const [formData, setFormData] = useState<GoalFormData>();
  const createMutation = useCreateGoal();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <StepIndicator current={step} total={3} />
        </DialogHeader>
        
        {step === 1 && <ObjectiveStep data={formData} onChange={setFormData} onNext={() => setStep(2)} />}
        {step === 2 && <KeyResultsStep data={formData} onChange={setFormData} onNext={() => setStep(3)} />}
        {step === 3 && <ReviewStep data={formData} onSubmit={handleSubmit} onBack={() => setStep(2)} />}
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 2.3: Personal OKR Widget
**Duration**: 8 hours  
**Owner**: Frontend Engineer  
**Priority**: P0  
**Depends On**: Task 2.1, 2.2

**Deliverables**:
```
apps/web/src/components/goals/
├── okr-widget.tsx                # Main widget
├── goal-card.tsx                 # Individual goal display
├── key-result-item.tsx           # KR display with progress
├── goal-progress-chart.tsx       # Circular progress chart
└── empty-state.tsx               # No goals state
```

**Widget Features**:
- Display user's active OKRs
- Circular progress indicators
- Status badges (On Track, At Risk, Behind)
- Click to expand key results
- Quick update buttons
- Filter by timeframe
- "Create First Goal" empty state

**Integration**:
```tsx
// Add to apps/web/src/routes/dashboard/index.tsx
import { OKRWidget } from '@/components/goals/okr-widget';

// In dashboard component:
<OKRWidget 
  workspaceId={workspace.id} 
  userId={user.id}
  className="col-span-full lg:col-span-6"
/>
```

---

### Task 2.4: Goal Detail Modal
**Duration**: 4 hours  
**Owner**: Frontend Engineer  
**Priority**: P1  
**Depends On**: Task 2.3

**Deliverables**:
- Full goal details view
- Progress history chart (line chart)
- Quick edit inline
- Share link functionality
- Delete confirmation

---

## 🏗️ Phase 3: Team Features (Day 5)

### Task 3.1: Team Goals API
**Duration**: 3 hours  
**Owner**: Backend Engineer  
**Priority**: P1  
**Depends On**: Task 1.2

**Deliverables**:
- `GET /api/goals/team/:teamId` - Team goals list
- `GET /api/goals/team/:teamId/progress` - Aggregated progress
- `GET /api/goals/team/:teamId/members` - Members with goals

**Features**:
- Team-level goal aggregation
- Member progress roll-up
- Team goal filters
- Redis caching (5 min TTL)

---

### Task 3.2: Team Goals Widget
**Duration**: 6 hours  
**Owner**: Frontend Engineer  
**Priority**: P1  
**Depends On**: Task 3.1, Task 2.3

**Deliverables**:
```
apps/web/src/components/goals/
├── team-goals-widget.tsx         # Main widget
├── team-member-goal-card.tsx     # Member goal display
└── team-progress-bar.tsx         # Aggregated progress
```

**Features**:
- List team members with active goals
- Avatar + name + role
- Progress indicators per person
- Expand to see individual key results
- Real-time updates via WebSocket
- Filter by member, status

---

### Task 3.3: WebSocket Integration for Real-Time Updates
**Duration**: 3 hours  
**Owner**: Backend Engineer  
**Priority**: P1  
**Depends On**: Task 3.1

**Deliverables**:
- WebSocket event: `goal:updated`
- WebSocket event: `goal:completed`
- Subscribe to team goal updates
- Frontend listener implementation

---

## 🏗️ Phase 4: Milestones (Day 6)

### Task 4.1: Milestone API
**Duration**: 4 hours  
**Owner**: Backend Engineer  
**Priority**: P1  
**Depends On**: Task 1.1

**Deliverables**:
- `POST /api/goal-milestones` - Create milestone
- `GET /api/goal-milestones/:userId` - User milestones
- `GET /api/goal-milestones/countdown` - Upcoming milestones (sorted by due date)
- `PUT /api/goal-milestones/:id` - Update milestone
- `DELETE /api/goal-milestones/:id` - Delete milestone

**Features**:
- Milestone countdown calculation
- Link to goals and tasks
- Notification triggers (7d, 3d, 1d before)
- Success criteria checklist

---

### Task 4.2: Milestone Countdown Widget
**Duration**: 5 hours  
**Owner**: Frontend Engineer  
**Priority**: P1  
**Depends On**: Task 4.1

**Deliverables**:
```
apps/web/src/components/goals/
├── milestone-countdown.tsx       # Main widget
├── milestone-card.tsx            # Individual milestone
└── countdown-timer.tsx           # Animated countdown
```

**Features**:
- Display top 3 upcoming milestones
- Large countdown number (days remaining)
- Color-coded urgency (green/yellow/orange/red)
- Progress bar (linked tasks completion)
- Quick actions (Mark complete, Edit, Reschedule)
- Auto-refresh every hour

---

### Task 4.3: Milestone Notifications
**Duration**: 2 hours  
**Owner**: Backend Engineer  
**Priority**: P2  
**Depends On**: Task 4.1

**Deliverables**:
- Cron job: Daily check for upcoming milestones
- Send notifications at 7d, 3d, 1d before
- Notification on milestone completion
- Integration with existing notification system

---

## 🏗️ Phase 5: Metrics & Reflections (Day 7)

### Task 5.1: Success Metrics API
**Duration**: 4 hours  
**Owner**: Backend Engineer  
**Priority**: P2  
**Depends On**: Task 1.4

**Deliverables**:
- `GET /api/metrics/user/:userId` - User metrics
- `POST /api/metrics/calculate` - Trigger calculation
- `GET /api/metrics/trends` - Metric trends

**Auto-Tracked Metrics**:
- Tasks completed per week
- Average task completion time
- Focus time hours
- Comments/collaboration count

**Custom Metrics**:
- User-defined metrics
- Manual value entry
- Target tracking

---

### Task 5.2: Success Metrics Widget
**Duration**: 4 hours  
**Owner**: Frontend Engineer  
**Priority**: P2  
**Depends On**: Task 5.1

**Deliverables**:
```
apps/web/src/components/goals/
├── success-metrics-card.tsx      # Main widget
├── metric-card.tsx               # Individual metric
└── metric-sparkline.tsx          # Mini trend chart
```

**Features**:
- Grid of metric cards (4x2 layout)
- Current value + target
- Trend indicator (up/down arrow)
- Sparkline chart (last 30 days)
- Color coding (green/yellow/red vs target)

---

### Task 5.3: Weekly Reflection API
**Duration**: 2 hours  
**Owner**: Backend Engineer  
**Priority**: P2  
**Depends On**: Task 1.1

**Deliverables**:
- `POST /api/reflections` - Create reflection
- `GET /api/reflections/:userId` - Get user reflections
- `GET /api/reflections/prompts` - Get weekly prompts
- `PUT /api/reflections/:id` - Update draft

---

### Task 5.4: Reflection Prompt Widget
**Duration**: 4 hours  
**Owner**: Frontend Engineer  
**Priority**: P2  
**Depends On**: Task 5.3

**Deliverables**:
```
apps/web/src/components/goals/
├── reflection-prompt.tsx         # Main widget
├── reflection-form.tsx           # 5 prompt questions
└── reflection-history.tsx        # Past reflections view
```

**Features**:
- 5 reflection prompts
- Text areas (500 char limit)
- Save draft functionality
- Submit and share
- View past reflections
- Weekly reminder notification

---

### Task 5.5: Reflection Reminder Scheduler
**Duration**: 2 hours  
**Owner**: Backend Engineer  
**Priority**: P2  
**Depends On**: Task 5.3

**Deliverables**:
- Cron job: Friday 4 PM reminder
- Email notification
- Browser notification (if online)
- Snooze functionality

---

## 🏗️ Phase 6: Polish & Testing (Day 8)

### Task 6.1: Animations & Micro-interactions
**Duration**: 3 hours  
**Owner**: Frontend Engineer  
**Priority**: P2

**Deliverables**:
- Goal completion celebration modal
- Progress bar animations
- Hover effects on widgets
- Loading skeletons
- Empty state illustrations

---

### Task 6.2: Mobile Responsiveness
**Duration**: 3 hours  
**Owner**: Frontend Engineer  
**Priority**: P1

**Deliverables**:
- Mobile-optimized widgets (<768px)
- Bottom sheet modals for mobile
- Touch-friendly tap targets (44px min)
- Swipe gestures for navigation
- Mobile testing on iOS/Android

---

### Task 6.3: Accessibility Audit
**Duration**: 2 hours  
**Owner**: Frontend Engineer  
**Priority**: P1

**Deliverables**:
- ARIA labels on all interactive elements
- Keyboard navigation (Tab, Enter, Esc)
- Focus indicators
- Screen reader testing
- Color contrast verification (WCAG AA)

---

### Task 6.4: Unit Tests
**Duration**: 4 hours  
**Owner**: Backend + Frontend Engineers  
**Priority**: P1

**Deliverables**:
- Backend: 90%+ coverage for controllers
- Frontend: 80%+ coverage for components
- Test goal CRUD operations
- Test progress calculations
- Test edge cases (no goals, 100% completion, etc.)

---

### Task 6.5: Integration Tests
**Duration**: 3 hours  
**Owner**: QA Engineer  
**Priority**: P1

**Deliverables**:
- E2E test: Create goal flow
- E2E test: Update progress flow
- E2E test: Team goals interaction
- E2E test: Reflection submission
- API integration tests

---

### Task 6.6: Performance Optimization
**Duration**: 2 hours  
**Owner**: Full Team  
**Priority**: P1

**Deliverables**:
- Database query optimization
- Add database indexes
- Implement Redis caching for team goals
- Lazy load widgets
- Bundle size optimization (<50KB per widget)

---

### Task 6.7: Documentation
**Duration**: 2 hours  
**Owner**: Product Manager + Engineers  
**Priority**: P2

**Deliverables**:
- User guide: "Getting Started with Goals"
- API documentation (Swagger/OpenAPI)
- Developer docs: Component usage
- Video tutorial (optional)

---

## 📊 Task Summary

### By Phase:
- **Phase 1 (Foundation)**: 4 tasks, 17 hours total
- **Phase 2 (Frontend Core)**: 4 tasks, 20 hours total
- **Phase 3 (Team Features)**: 3 tasks, 12 hours total
- **Phase 4 (Milestones)**: 3 tasks, 11 hours total
- **Phase 5 (Metrics & Reflections)**: 5 tasks, 16 hours total
- **Phase 6 (Polish & Testing)**: 7 tasks, 19 hours total

**Total**: 26 tasks, 95 hours (~12 days for 2 engineers)

### By Priority:
- **P0 (Critical)**: 12 tasks (foundation + core features)
- **P1 (High)**: 9 tasks (team features + polish)
- **P2 (Medium)**: 5 tasks (advanced features)

---

## 🎯 Milestones

### Milestone 1: MVP Ready (End of Day 2)
- ✅ Database schema deployed
- ✅ Core Goal API functional
- ✅ Basic CRUD operations working
- **Demo**: Create a goal via API

### Milestone 2: Frontend Core (End of Day 4)
- ✅ Personal OKR widget functional
- ✅ Goal creation modal working
- ✅ Progress tracking implemented
- **Demo**: Create and track personal OKR in UI

### Milestone 3: Team Features (End of Day 5)
- ✅ Team goals widget functional
- ✅ Real-time updates working
- **Demo**: Team collaboration on shared goals

### Milestone 4: Complete Feature Set (End of Day 7)
- ✅ All 5 features implemented
- ✅ Milestones, metrics, reflections working
- **Demo**: Full user journey

### Milestone 5: Production Ready (End of Day 8)
- ✅ All tests passing
- ✅ Performance benchmarks met
- ✅ Documentation complete
- **Launch Ready**: Deploy to staging

---

## 🚀 Deployment Plan

### Staging Deployment (End of Week 1)
- Deploy to staging environment
- QA team testing
- Internal dogfooding
- Collect feedback

### Beta Release (Week 2)
- Enable for 10% of users
- Monitor metrics and errors
- Iterate based on feedback

### Full Release (Week 3)
- Enable for all users
- Announcement blog post
- In-app tutorial
- Marketing campaign

---

## 📈 Success Metrics

### Technical Metrics
- ✅ API P95 latency <200ms
- ✅ Widget load time <1s
- ✅ Error rate <0.1%
- ✅ Test coverage >85%

### Product Metrics
- ✅ 70% of users create at least 1 goal (Week 1)
- ✅ 50% daily active users view goals
- ✅ 60% goal completion rate
- ✅ 40% weekly reflection rate

### Business Metrics
- ✅ +15% user retention
- ✅ +30% task completion rate
- ✅ +10 NPS points
- ✅ $50K ARR impact

---

## 🎉 Definition of Done

**Feature is DONE when**:
1. ✅ All code merged to main branch
2. ✅ All tests passing (unit + integration + E2E)
3. ✅ Code reviewed and approved
4. ✅ Documentation complete
5. ✅ Deployed to staging
6. ✅ QA sign-off
7. ✅ Product manager approval
8. ✅ Performance benchmarks met
9. ✅ Accessibility audit passed
10. ✅ Ready for production deployment

---

**Status**: Ready for Implementation  
**Next Action**: Begin Task 1.1 (Database Schema)  
**Team**: Assigned and briefed  
**Timeline**: 8 days to completion

