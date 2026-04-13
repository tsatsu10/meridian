# 🌱 Meridian Database Seeding System

Complete modular seeding system for populating the Meridian database with realistic test data.

## 🎯 Quick Start

### Run All Seeds
```bash
cd apps/api
pnpm run seed:all
```

This will populate your database with a large realistic dataset including:
- ✅ 8 users (one per role type)
- ✅ 1 workspace with full organization
- ✅ 10 projects with 200 tasks
- ✅ Goals and OKRs
- ✅ Chat channels and messages
- ✅ Time tracking and activity history
- ✅ Analytics and health data
- ✅ Automation rules and integrations
- ✅ Widget marketplace sample listings (trimmed to current app widgets)

## 📋 Available Commands

### Run All Phases
```bash
pnpm run seed:all              # Run all phases (see master-seed.ts for order)
pnpm run seed:all --phase=5    # Start from phase id 5 (Goals & OKRs)
pnpm run seed:all --only=widget-marketplace  # Run only marketplace seed
pnpm run seed:all --skip=8,9    # Skip phase ids (comma-separated)
```

`--only=` matches a slugified phase name (e.g. `goals-okrs`, `widget-marketplace`) or a numeric phase id.

### Run Individual Phases
```bash
pnpm run seed:phase1  # Users & Authentication
pnpm run seed:phase2  # Workspaces & Teams
pnpm run seed:phase3  # Projects & Tasks
pnpm run seed:phase5  # Goals & OKRs
pnpm run seed:phase6  # Communication
pnpm run seed:phase7  # Time & Activity
pnpm run seed:phase8  # Analytics
pnpm run seed:phase9  # Advanced Features
pnpm run seed:phase10 # Widget Marketplace (or: seed:marketplace)
```

## 📊 Seed Phases

### Phase 1: Users & Authentication 👥
**File**: `01-users.ts`

Creates:
- 8 test users (one per role)
- User profiles with bio, job title, etc.
- User skills (5-12 per user)
- Work experience history
- Education records
- Active sessions

**Test Users**:
| Email | Password | Role |
|-------|----------|------|
| `admin@meridian.app` | `password123` | Admin |
| `workspace.manager@meridian.app` | `password123` | Workspace Manager |
| `department.head@meridian.app` | `password123` | Department Head |
| `team.lead@meridian.app` | `password123` | Team Lead |
| `project.manager@meridian.app` | `password123` | Project Manager |
| `member@meridian.app` | `password123` | Member |
| `viewer@meridian.app` | `password123` | Project Viewer |
| `guest@meridian.app` | `password123` | Guest |

### Phase 2: Workspaces & Teams 🏢
**File**: `02-workspaces.ts`

Creates:
- Meridian Demo Workspace
- All 8 users as workspace members
- 3 departments (Engineering, Product, Design)
- 5 teams with members
- Role assignments

### Phase 3: Projects & Tasks 📂
**File**: `03-projects-tasks.ts`

Creates:
- 10 diverse projects
- 200 tasks across projects
- Task dependencies (blocking relationships)
- 25 milestones
- Kanban status columns
- Project labels/tags

**Project Distribution**:
- 40% Active
- 20% In Progress
- 10% Completed
- 15% Planning
- 15% On Hold

### Phase 4 (removed)

The former gamification seed (`04-gamification.ts`) was removed from the repo. `seed:all --only=gamification` exits early with a warning.

### Phase 5: Goals & OKRs 🎯
**File**: `05-goals.ts`

Creates:
- 25 goals (personal, team, strategic)
- 75 key results (3 per goal)
- Progress snapshots (12 weeks per KR)
- Goal reflections

### Phase 6: Communication 💬
**File**: `06-communication.ts`

Creates:
- 8 channels (general, team-specific)
- Channel memberships
- 150 messages with reactions
- 10 DM conversations
- User presence status
- User status messages
- 30 kudos/recognition entries

### Phase 7: Time & Activity ⏱️
**File**: `07-time-activity.ts`

Creates:
- 300 time entries (last 30 days)
- 500 activity feed entries (last 90 days)
- Active user sessions
- Mood check-ins (last 30 days)
- Mood analytics

### Phase 8: Analytics 📊
**File**: `08-analytics.ts`

Creates:
- Project health scores + 30 days history
- Health recommendations
- Risk alerts
- 400 notifications (50 per user)

### Phase 9: Advanced Features 🤖
**File**: `09-advanced.ts`

Creates:
- 5 automation rules
- 3 workflow templates
- 3 integration connections
- User preferences
- Notification preferences

### Phase 10: Widget Marketplace 🏪
**File**: `10-widget-marketplace.ts`

Creates a small set of marketplace widgets and one collection aligned with the current web widget registry and live API routes.

## 🔧 Utilities

### seed-utils.ts

Provides helper functions:
- Random data generators
- Name generators
- Date helpers
- Batch insert utilities

## 📁 File Structure

```
apps/api/src/database/seeds/
├── master-seed.ts          # Orchestrator (run all phases)
├── seed-utils.ts           # Helper utilities
├── 01-users.ts             # Phase 1: Users & auth
├── 02-workspaces.ts        # Phase 2: Workspaces & teams
├── 03-projects-tasks.ts    # Phase 3: Projects & tasks
├── 05-goals.ts             # Phase 5: Goals & OKRs
├── 06-communication.ts     # Phase 6: Chat & collaboration
├── 07-time-activity.ts     # Phase 7: Time tracking
├── 08-analytics.ts         # Phase 8: Analytics data
├── 09-advanced.ts          # Phase 9: Advanced features
├── 10-widget-marketplace.ts # Phase 10: Widget marketplace sample data
└── README.md               # This file
```

## ⚠️ Important Notes

### Prerequisites
1. Database must be initialized
2. Run `pnpm db:push` to ensure schema is up to date
3. Recommended: Clear existing seed data first (optional)

### Safe to Rerun
All seed scripts check for existing data before inserting:
- ✅ Idempotent - safe to run multiple times
- ✅ Skips existing records
- ✅ Logs what was created vs. skipped

### Execution Order Matters
Phases must run in order due to foreign key dependencies:
1. Users → 2. Workspaces → 3. Projects → etc.

However, the master script handles this automatically!

### Performance
- Full seed takes ~30-60 seconds
- Uses batch inserts where possible
- Progress logging shows status

## 🎯 Common Use Cases

### Start Fresh
```bash
# Clear database (if needed)
pnpm db:push --force

# Seed everything
pnpm run seed:all
```

### Add More Data to Existing Setup
```bash
# Run individual phases to add more
pnpm run seed:phase3  # Add more projects
pnpm run seed:phase6  # Add more chat messages
```

### Skip Heavy Operations
```bash
# Skip analytics (phase 8) and time & activity (phase 7) for faster seed
pnpm run seed:all --skip=8,7
```

## 🐛 Troubleshooting

### "No workspace found" Error
```bash
# Run phases in order
pnpm run seed:phase1  # Users first
pnpm run seed:phase2  # Then workspaces
pnpm run seed:phase3  # Then projects
```

### "Foreign key constraint" Error
- Ensure you ran previous phases
- Check database schema is up to date: `pnpm db:push`

### Duplicate Key Errors
- Normal - script skips existing records
- See "⏭️ already exists" in logs

### Slow Performance
- First run is slower (creates all indexes)
- Subsequent runs skip existing data (faster)

## 📈 Expected Results

After running `seed:all`, your dashboard should show:

✅ **Stats Cards**
- Total Tasks: ~200
- Active Projects: ~6-7
- Risk Score: Realistic scores
- Notifications: ~50 per user

✅ **Activity Feed**
- 500 recent activities
- Team awareness data
- Kudos and recognition

✅ **Team Widgets**
- Workspace Members: 8 users shown
- Team Status: Online/away/busy
- Mood Tracker: 30 days of data

## 🎉 Success Criteria

After seeding, you should be able to:

- ✅ Sign in with any test user
- ✅ See populated dashboard (all widgets have data)
- ✅ View projects with tasks
- ✅ Use chat and DMs
- ✅ View analytics and trends
- ✅ Test role-based permissions

## 📚 Related Files

- `COMPREHENSIVE_SEED_PLAN.md` - Full planning document
- `apps/api/src/database/schema/` - Database schema definitions
- `apps/api/src/database/schema-features.ts` - Extended features schema

## 🔄 Maintenance

### Update Seed Data
Modify the data arrays in each phase file, then rerun:
```bash
pnpm run seed:phase8  # Rerun a specific phase (example: analytics)
```

### Add New Phases
1. Create `10-new-feature.ts` following existing patterns
2. Import in `master-seed.ts`
3. Add to `SEED_PHASES` array
4. Add npm script to `package.json`

### Clean Database
```bash
# WARNING: This deletes all data!
pnpm db:push --force
pnpm run seed:all
```

---

**Created**: November 5, 2025
**Last Updated**: November 5, 2025
**Version**: 1.0.0

