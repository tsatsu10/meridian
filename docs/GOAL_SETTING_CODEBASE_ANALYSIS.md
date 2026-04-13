# 🎯 Goal Setting Features - Comprehensive Codebase Analysis

**Date**: October 30, 2025  
**Analyst**: AI Development Team  
**Purpose**: Strategic implementation planning for Goal Setting features

---

## 📊 Executive Summary

**Meridian** is an enterprise-grade project management system with:
- **Architecture**: Monorepo (Turbo) with 3 apps: `api` (Hono), `web` (React + Vite), `docs`
- **Database**: PostgreSQL via Drizzle ORM (70+ tables)
- **Current Status**: 88% production ready, 100% test pass rate
- **Tech Stack**: TypeScript, React Query, Zustand, WebSockets, Redis

**Goal Setting Feature Status**: ❌ **NOT IMPLEMENTED** (No tables, APIs, or UI exist)

---

## 🔍 Current State Analysis

### 1. Related Features (What Exists)

#### ✅ Milestones System
**Location**: `apps/web/src/components/dashboard/milestone-dashboard.tsx`

**Current Capabilities**:
- Milestone tracking with progress bars
- Due date tracking
- Task associations
- Health scores
- Risk tracking
- Stakeholder management

**API Endpoints**:
```typescript
GET  /api/milestones/:projectId
POST /api/milestones
PUT  /api/milestones/:id
GET  /api/milestones/:id/stats
```

**Database Tables**:
- No dedicated `milestones` table found in schema.ts
- Uses project-level tracking
- Stored in `projects` table metadata

**Gap**: Milestones are **project-scoped**, not **personal or team-scoped**

---

#### ✅ Team Awareness Features
**Location**: `apps/api/src/database/schema/team-awareness.ts`

**Existing Tables**:
1. `user_activity` - Activity tracking
2. `user_status` - Real-time status
3. `kudos` - Recognition system
4. `mood_log` - Morale tracking (with goals/workload)
5. `user_skills` - Skills matrix
6. `team_availability` - Calendar/availability

**Relevant for Goals**:
- `mood_log` table has `workloadLevel` field
- Could be extended for goal stress tracking
- Already has analytics endpoints

---

#### ✅ Dashboard Widget System
**Location**: `apps/web/src/components/dashboard/widget-system/`

**Architecture**:
```typescript
interface DashboardWidget {
  id: string;
  type: 'chart' | 'activity' | 'stats' | 'custom';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { row: number; col: number };
  settings: Record<string, any>;
}
```

**Storage**: User preferences table (`user_preferences`)
**State Management**: Zustand + React Query
**Persistence**: Database-backed via `use-user-preferences.ts`

**Perfect for Goal Widgets!** ✅

---

#### ✅ Analytics & Metrics System
**Location**: `apps/api/src/analytics/`

**Capabilities**:
- Time-series data tracking
- Workspace-level metrics
- User-level metrics
- Custom KPI tracking
- Export functionality

**Database Tables**:
- `analytics_events` - Event tracking
- `project_metrics` - Project-level metrics
- `task_tracking` - Task performance

**Opportunity**: Extend for goal metrics tracking

---

### 2. Database Schema Patterns

#### Observed Patterns:
```typescript
// Standard table structure
export const [tableName] = pgTable("[table_name]", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  workspaceId: text("workspace_id").notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // ... fields
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

#### Key Observations:
- ✅ Uses `createId()` from `@paralleldrive/cuid2`
- ✅ Workspace-scoped for multi-tenancy
- ✅ Soft deletes via cascade rules
- ✅ `metadata` field for flexibility
- ✅ Timezone-aware timestamps
- ✅ Indexes for performance

---

### 3. API Architecture Patterns

#### Controller Pattern:
**Location**: `apps/api/src/[feature]/controllers/`

```typescript
// Standard controller structure
export async function createGoal(c: Context) {
  try {
    const body = await c.req.json();
    const userId = c.get('userId');
    const workspaceId = c.get('workspaceId');
    
    // Validation
    // Business logic
    // Database operations
    
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
```

#### Router Pattern:
```typescript
app.post('/api/goals', authMiddleware, createGoal);
app.get('/api/goals/:workspaceId', authMiddleware, getGoals);
app.put('/api/goals/:id', authMiddleware, updateGoal);
app.delete('/api/goals/:id', authMiddleware, deleteGoal);
```

---

### 4. Frontend Architecture Patterns

#### Component Structure:
```
apps/web/src/components/
├── dashboard/           # Dashboard widgets
│   ├── sections/       # Dashboard sections
│   └── widgets/        # Reusable widgets
├── [feature]/          # Feature-specific components
└── ui/                 # Shadcn UI components
```

#### State Management:
1. **React Query** - Server state
   - Location: `apps/web/src/hooks/queries/`
   - Pattern: `use-[feature]-data.ts`
   
2. **Zustand** - Client state
   - Location: `apps/web/src/store/`
   - Pattern: `[feature]-store.ts`

3. **User Preferences** - Persisted state
   - Hook: `use-user-preferences.ts`
   - Table: `user_preferences`

#### Widget Development Pattern:
```typescript
// apps/web/src/components/dashboard/[feature]-widget.tsx
export function GoalWidget({ workspaceId, userId }: WidgetProps) {
  const { data, isLoading } = useGoals(workspaceId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal OKRs</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Widget content */}
      </CardContent>
    </Card>
  );
}
```

---

## 🎯 Goal Setting Requirements

### Features to Implement:
1. **Personal OKRs** - Set and track individual objectives
2. **Team Goals Widget** - Shared team objectives progress
3. **Milestone Countdown** - Days until major deadline
4. **Success Metrics** - Personal KPI tracking
5. **Reflection Prompts** - Weekly "What went well?"

---

## 🏗️ Architectural Decisions

### 1. Database Schema Strategy

**Recommendation**: Create 5 new tables

```typescript
// 1. goals (for OKRs and general goals)
// 2. goal_key_results (for OKR key results)
// 3. goal_progress (for tracking progress over time)
// 4. goal_reflections (for weekly reflections)
// 5. goal_milestones (personal/team milestones, different from project milestones)
```

**Rationale**:
- Separate from project milestones (different scoping)
- Support both individual and team goals
- Historical tracking via progress table
- Flexible metadata for custom metrics

---

### 2. Integration Points

#### A. Dashboard Integration
**Target**: `apps/web/src/routes/dashboard/index.tsx`
**Method**: Add goal widgets to existing dashboard
**Storage**: User preferences (already implemented)

#### B. Analytics Integration
**Target**: `apps/api/src/analytics/`
**Method**: Extend analytics events for goal tracking
**Benefit**: Leverage existing reporting infrastructure

#### C. Notification Integration
**Target**: `apps/api/src/notifications/`
**Method**: Goal reminders and achievement notifications
**Benefit**: Use existing notification system

#### D. Team Awareness Integration
**Target**: `apps/web/src/components/team-awareness/`
**Method**: Show team goal progress
**Benefit**: Integrate with existing team features

---

### 3. API Design

**Endpoints Needed**:
```
Goals CRUD:
  POST   /api/goals                    - Create goal
  GET    /api/goals/:workspaceId       - List goals
  GET    /api/goals/:id                - Get goal details
  PUT    /api/goals/:id                - Update goal
  DELETE /api/goals/:id                - Delete goal

Key Results:
  POST   /api/goals/:id/key-results    - Add key result
  PUT    /api/key-results/:id          - Update key result
  DELETE /api/key-results/:id          - Delete key result

Progress Tracking:
  POST   /api/goals/:id/progress       - Log progress
  GET    /api/goals/:id/progress       - Get progress history
  GET    /api/goals/:id/analytics      - Get goal analytics

Reflections:
  POST   /api/reflections              - Create reflection
  GET    /api/reflections/:userId      - Get user reflections
  GET    /api/reflections/prompts      - Get weekly prompts

Team Goals:
  GET    /api/goals/team/:teamId       - Team goals
  GET    /api/goals/workspace/:id      - Workspace goals

Milestones:
  POST   /api/goal-milestones          - Create milestone
  GET    /api/goal-milestones/:userId  - User milestones
  GET    /api/goal-milestones/countdown - Upcoming milestones
```

---

### 4. Frontend Components

**New Components Needed**:
```
apps/web/src/components/goals/
├── okr-widget.tsx                 # Personal OKRs widget
├── team-goals-widget.tsx          # Team goals progress
├── milestone-countdown.tsx        # Countdown widget
├── success-metrics-card.tsx       # KPI tracking
├── reflection-prompt.tsx          # Weekly reflection
├── goal-detail-modal.tsx          # Goal details
├── create-goal-modal.tsx          # Create/edit goal
└── goal-progress-chart.tsx        # Progress visualization
```

**Dashboard Widgets**:
```typescript
// Add to dashboard/widget-system/widget-library.tsx
const goalWidgets = [
  {
    id: 'personal-okrs',
    component: OKRWidget,
    defaultSize: 'large',
    category: 'Goals'
  },
  {
    id: 'team-goals',
    component: TeamGoalsWidget,
    defaultSize: 'medium',
    category: 'Goals'
  },
  {
    id: 'milestone-countdown',
    component: MilestoneCountdown,
    defaultSize: 'small',
    category: 'Goals'
  },
  {
    id: 'success-metrics',
    component: SuccessMetricsCard,
    defaultSize: 'medium',
    category: 'Goals'
  },
  {
    id: 'weekly-reflection',
    component: ReflectionPrompt,
    defaultSize: 'large',
    category: 'Goals'
  }
];
```

---

## 📐 Implementation Strategy

### Phase 1: Foundation (Database + Core APIs)
**Duration**: 1 day  
**Deliverables**:
- Database schema migration
- Core CRUD APIs for goals
- Basic validation and error handling

### Phase 2: Key Results & Progress Tracking
**Duration**: 1 day  
**Deliverables**:
- Key results API
- Progress logging API
- Analytics integration

### Phase 3: Frontend Core Components
**Duration**: 1-2 days  
**Deliverables**:
- Goal creation/editing modals
- Basic goal list view
- React Query hooks

### Phase 4: Dashboard Widgets
**Duration**: 1-2 days  
**Deliverables**:
- Personal OKR widget
- Team goals widget
- Milestone countdown widget

### Phase 5: Advanced Features
**Duration**: 1 day  
**Deliverables**:
- Success metrics tracking
- Weekly reflection prompts
- Notifications integration

### Phase 6: Polish & Testing
**Duration**: 1 day  
**Deliverables**:
- Unit tests
- Integration tests
- UI polish and animations

**Total Estimated Duration**: 6-8 days

---

## 🎨 Design Considerations

### 1. OKR Widget Design
- **Inspired by**: Linear, Asana Goals, Lattice
- **Layout**: Card-based with progress bars
- **Interactions**: Expandable sections, inline editing
- **Data Viz**: Circular progress indicators

### 2. Team Goals Widget
- **Inspired by**: Notion databases, Monday.com goals
- **Layout**: List view with avatars
- **Interactions**: Click to expand, filter by person
- **Data Viz**: Stacked progress bars

### 3. Milestone Countdown
- **Inspired by**: GitHub milestones, Trello power-ups
- **Layout**: Compact card with large numbers
- **Interactions**: Click to view milestone details
- **Visual**: Animated countdown

### 4. Success Metrics
- **Inspired by**: Google Analytics, Metabase
- **Layout**: Grid of metric cards
- **Interactions**: Click to see trend
- **Data Viz**: Sparklines, trend indicators

### 5. Reflection Prompts
- **Inspired by**: Notion daily notes, Reflectly
- **Layout**: Full-width card with text area
- **Interactions**: Save draft, view past reflections
- **UX**: Soft, calming design

---

## 🚀 Next Steps

1. **Create PRD** - Detailed product requirements document
2. **Initialize Taskmaster** - Set up task management for this feature
3. **Database Schema** - Create migration files
4. **API Development** - Build backend endpoints
5. **Frontend Components** - Build UI widgets
6. **Integration** - Connect to existing systems
7. **Testing** - Comprehensive test coverage
8. **Documentation** - User and developer docs

---

## 📊 Success Metrics

**Definition of Done**:
- ✅ All 5 features implemented and functional
- ✅ Database schema migrated and tested
- ✅ API endpoints with 90%+ test coverage
- ✅ Frontend widgets responsive and accessible
- ✅ Integration with existing dashboard
- ✅ User documentation complete
- ✅ Performance benchmarks met (<200ms API response)

**KPIs to Track**:
- Goal completion rate
- OKR adoption rate (% of users with active OKRs)
- Reflection submission rate
- Widget engagement metrics
- API response times
- User satisfaction scores

---

## 🎯 Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Scope Creep** | High | High | Strict PRD adherence, phased rollout |
| **Integration Issues** | Medium | Medium | Early integration testing, use existing patterns |
| **Performance Issues** | Low | High | Database indexing, query optimization, caching |
| **User Adoption** | Medium | High | Excellent UX, clear onboarding, defaults |
| **Data Migration** | Low | Medium | Careful schema design, rollback plan |

---

## 💡 Innovation Opportunities

1. **AI-Powered Goal Suggestions**: Use AI to suggest goals based on role and past performance
2. **Gamification**: Achievements, streaks, and rewards for goal completion
3. **Social Features**: Celebrate team wins, public kudos for achievements
4. **Integrations**: Connect to Jira, GitHub, Notion for auto-tracking
5. **Mobile App**: Dedicated mobile experience for on-the-go updates

---

**Status**: Ready for Implementation  
**Next Action**: Generate PRD and initialize Taskmaster project

