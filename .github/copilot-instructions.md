# Meridian AI Agent Instructions

> **Project**: Meridian - Modern project management platform with real-time collaboration
> **Architecture**: Turborepo monorepo with Hono API + React SPA frontend
> **Database**: PostgreSQL with Drizzle ORM | SQLite for development
> **Last Updated**: January 2025

## 🏗️ Architecture Overview

### Monorepo Structure
```
meridian/
├── apps/
│   ├── api/          # Hono.js REST API (Node.js/TypeScript)
│   ├── web/          # React SPA with TanStack Router + Vite
│   └── docs/         # Next.js documentation site
├── packages/
│   ├── libs/         # Shared utilities and types
│   └── typescript-config/  # Shared TS configs
└── charts/meridian/     # Helm chart for Kubernetes deployment
```

### Key Technology Decisions

**Backend (`apps/api/`)**:
- **Hono.js** over Express for performance and lightweight design
- **Drizzle ORM** for type-safe database access (NOT Prisma despite package.json artifacts)
- **PostgreSQL only** - SQLite support fully removed (use PostgreSQL for all environments)
- **Better Auth** for authentication with anonymous/demo mode support
- **Socket.IO** for real-time WebSocket features (`realtime/unified-websocket-server.ts`)
- **Single port architecture**: HTTP + WebSocket on port 1337 (NOT separate ports)
- **RBAC System**: Full role-based access control with 11 role types (workspace-manager, department-head, etc.)
- **Teams Module**: Dynamic team organization based on projects + general workspace teams

**Frontend (`apps/web/`)**:
- **TanStack Router** (file-based routing) NOT React Router
- **TanStack Query** for server state (NOT SWR, NOT Redux)
- **Zustand** for client state (user preferences, theme, etc.)
- **Radix UI + Tailwind CSS** for component primitives
- **Framer Motion** for animations
- **Vite** with PWA support for offline capabilities

## 🔑 Critical Patterns & Conventions

### 1. Database Layer (`apps/api/src/database/`)

**Schema Definition** (`schema.ts`):
```typescript
// PostgreSQL only - use Drizzle's pgTable
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const taskTable = pgTable("tasks", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  projectId: text("project_id").notNull()
    .references(() => projectTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("to-do"),
  // Always include timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Relations** (defined inline or in separate file):
```typescript
// Define relations for Drizzle query builder
import { relations } from "drizzle-orm";

export const taskTableRelations = relations(taskTable, ({ one, many }) => ({
  project: one(projectTable, {
    fields: [taskTable.projectId],
    references: [projectTable.id],
  }),
  activities: many(activityTable),
}));
```

**Key Pattern**: PostgreSQL-only setup. Use cascade deletes. Tables use plural naming (e.g., `users`, `projects`, `tasks`).

### 2. API Module Structure

Each feature module follows this pattern:
```
apps/api/src/{feature}/
├── index.ts                 # Route definitions
├── controllers/
│   ├── create-{feature}.ts
│   ├── get-{feature}.ts
│   ├── update-{feature}.ts
│   └── delete-{feature}.ts
└── utils/                   # Feature-specific utilities
```

**Route Example** (`apps/api/src/project/index.ts`):
```typescript
import { Hono } from "hono";
import createProject from "./controllers/create-project";

const projectRoute = new Hono();

projectRoute.post("/", async (c) => {
  const { workspaceId, name, icon, slug } = await c.req.json();
  const project = await createProject(workspaceId, name, icon, slug);
  return c.json(project);
});

export default projectRoute;
```

**Controller Pattern** (always async, returns data directly):
```typescript
async function createProject(workspaceId: string, name: string, icon: string, slug: string) {
  const [createdProject] = await db
    .insert(projectTable)
    .values({ workspaceId, name, icon, slug })
    .returning();
  
  return createdProject;
}
```

### 3. Authentication & Authorization

**Demo Mode** (`apps/api/.env`):
```bash
DEMO_MODE=true  # Bypasses auth, uses admin@meridian.app
```

**Middleware** (`apps/api/src/middlewares/auth.ts`):
```typescript
// Demo mode sets c.set("userEmail", "admin@meridian.app") automatically
// Production mode validates JWT session tokens via Better Auth
```

**Frontend Auth** (`apps/web/src/lib/auth.ts`):
```typescript
// Uses Better Auth client with cookie-based sessions
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:1337", // API base URL
});
```

### 4. Frontend State Management

**Server State** (TanStack Query):
```typescript
// apps/web/src/hooks/queries/{feature}/use-get-{feature}.ts
import { useQuery } from "@tanstack/react-query";

export default function useGetProjects(workspaceId: string) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => fetch(`/api/projects?workspaceId=${workspaceId}`).then(r => r.json()),
    enabled: !!workspaceId, // Important: guard against undefined params
  });
}
```

**Client State** (Zustand):
```typescript
// apps/web/src/store/{feature}.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferences {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
}

export const useUserPreferencesStore = create<UserPreferences>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
    }),
    { name: "user-preferences" } // localStorage key
  )
);
```

### 5. RBAC & Permission System

**Role Types** (11 total):
- **workspace-manager**: Full workspace control
- **department-head**: Department-scoped management
- **workspace-viewer**: Read-only workspace access
- **project-manager**: Project-scoped management
- **project-viewer**: Read-only project access
- **team-lead**: Team coordination
- **member**: Standard project participation
- **client, contractor, stakeholder, guest**: External users with limited access

**Permission Checking** (`apps/api/src/rbac/index.ts`):
```typescript
// Check permission with context
POST /api/rbac/permissions/check
{
  userId: "user123",
  permission: "canManageProjects",
  context: {
    workspaceId: "ws123",
    projectId: "proj456"
  }
}

// Response includes role, permission result, and custom overrides
{
  allowed: true,
  role: "project-manager",
  context: { workspaceId: "ws123", projectId: "proj456" }
}
```

**Role Assignment** (`apps/api/src/rbac/index.ts`):
```typescript
// Assign role with scope
POST /api/rbac/assign
{
  userId: "user123",
  role: "project-manager",
  workspaceId: "ws123",
  projectIds: ["proj1", "proj2"], // Scoped to specific projects
  reason: "Promoted to project manager"
}
```

### 6. Teams Module

**Dynamic Team Generation** (`apps/api/src/team/index.ts`):
```typescript
// Teams are auto-generated from workspace structure
GET /api/team/:workspaceId

// Returns:
{
  teams: [
    {
      id: "team-general-ws123",
      name: "General Team",
      type: "general",
      members: [...all workspace members],
      memberCount: 12
    },
    {
      id: "team-project-proj456",
      name: "Mobile App Team",
      type: "project",
      projectId: "proj456",
      members: [...project team members],
      memberCount: 5
    }
  ]
}
```

**Key Pattern**: Teams are computed dynamically, not stored. General team includes all workspace members, project teams filter by assignment.

### 7. Real-Time Features (WebSocket)

**Server** (`apps/api/src/realtime/unified-websocket-server.ts`):
```typescript
// Single Socket.IO server instance attached to HTTP server
const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true }
});

io.on("connection", (socket) => {
  socket.on("join:project", (projectId) => {
    socket.join(`project:${projectId}`);
  });
  
  socket.on("task:update", (data) => {
    io.to(`project:${data.projectId}`).emit("task:updated", data);
  });
});
```

**Client** (`apps/web/src/hooks/use-socket.ts`):
```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:1337", {
  withCredentials: true,
  transports: ["websocket", "polling"]
});

socket.on("task:updated", (data) => {
  queryClient.invalidateQueries({ queryKey: ["tasks", data.projectId] });
});
```

## 🚀 Development Workflows

### Starting Development

```bash
# Root level - run frontend only (most common)
pnpm dev

# Run all apps (API + Web + Docs)
pnpm dev:all

# API only
cd apps/api && npm run dev

# Web only
cd apps/web && npm run dev
```

### Database Operations

```bash
cd apps/api

# Generate migration after schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Seed database
npm run db:seed

# Reset SQLite database
npm run db:reset
```

**Important**: Always run migrations BEFORE starting the API server. The server auto-migrates on startup but may fail if schema conflicts exist.

### Working with Task Master

This project uses [claude-task-master](https://github.com/task-master/task-master) for AI-assisted task management:

```bash
# View all tasks
task-master list

# Show next recommended task
task-master next

# Show specific task details
task-master show <id>

# Mark task complete
task-master set-status --id=<id> --status=done

# Expand complex task into subtasks
task-master expand --id=<id> --research
```

**Key Files**:
- `tasks/tasks.json` - Task hierarchy and status
- `.cursor/rules/dev_workflow.mdc` - Complete workflow documentation
- `.taskmasterconfig` - AI model configuration

### Testing & Verification

**Frontend**:
```bash
cd apps/web
npm run lint        # TypeScript + ESLint
npm run build       # Verify production build
```

**API**:
```bash
cd apps/api
npm run build       # Verify esbuild compilation

# Manual endpoint testing
curl http://localhost:1337/api/projects
```

## 🎯 Common Tasks & Solutions

### Adding a New Database Table

1. **Define schema** in `apps/api/src/database/schema.ts`:
```typescript
export const newFeatureTable = pgTable("new_feature", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  // ... fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

2. **Define relations** in `apps/api/src/database/relations.ts`:
```typescript
export const newFeatureTableRelations = relations(newFeatureTable, ({ one, many }) => ({
  // ... relations
}));
```

3. **Export schema** in `apps/api/src/database/index.ts`:
```typescript
export const schema = {
  // ... existing
  newFeatureTable,
  newFeatureTableRelations,
};
```

4. **Generate & apply migration**:
```bash
npm run db:generate
npm run db:migrate
```

### Adding a New API Endpoint

1. **Create controller** in `apps/api/src/{feature}/controllers/`:
```typescript
async function getFeature(id: string) {
  return await db.query.featureTable.findFirst({
    where: eq(featureTable.id, id),
  });
}
export default getFeature;
```

2. **Add route** in `apps/api/src/{feature}/index.ts`:
```typescript
featureRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const feature = await getFeature(id);
  return c.json(feature);
});
```

3. **Register in main app** (`apps/api/src/index.ts`):
```typescript
app.route("/api/feature", featureRoute);
```

### Adding a React Route

1. **Create route file** in `apps/web/src/routes/`:
```typescript
// apps/web/src/routes/_layout/_authenticated/feature/$id.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/_authenticated/feature/$id")({
  component: FeatureComponent,
});

function FeatureComponent() {
  const { id } = Route.useParams();
  // ... component logic
}
```

2. **TanStack Router** auto-generates routes from file structure:
- `_layout/` = layout wrapper
- `_authenticated/` = protected route
- `$id` = dynamic parameter

### Fixing Type Errors

**Common Issue**: Module not found errors in monorepo
```bash
# From root - rebuild all packages
pnpm build

# Clear Turbo cache
rm -rf .turbo
pnpm build
```

**TypeScript Config**: Each app extends `packages/typescript-config/base.json`

## 🔍 Debugging & Troubleshooting

### API Not Starting

1. **Check database connection**:
```bash
# PostgreSQL (all environments)
DATABASE_URL="postgresql://user:pass@localhost:5432/meridian"

# For Neon or cloud PostgreSQL
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/meridian?sslmode=require"
```

2. **Check port conflicts**:
```bash
# Windows
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Linux/Mac
lsof -ti:1337 | xargs kill -9
```

3. **Check demo mode**:
```bash
# apps/api/.env
DEMO_MODE=true  # Should be set for development
```

### WebSocket Connection Issues

**Problem**: "WebSocket connection failed"
**Solution**: Ensure API is running on port 1337 (NOT 3005 or 3008 - those are legacy references)

**Check**:
```typescript
// apps/web/src/constants/urls.ts
export const API_URL = "http://localhost:1337";
export const WS_URL = "ws://localhost:1337";
```

### Build Failures

**Vite cache issues**:
```bash
cd apps/web
rm -rf node_modules/.vite
npm run build
```

**TypeScript errors in build**:
```bash
# Validate types without building
cd apps/web
npx tsc --noEmit
```

## 📚 Key Files Reference

- `apps/api/src/database/schema.ts` - Main PostgreSQL database schema
- `apps/api/src/database/index.ts` - Database connection setup
- `apps/api/src/index.ts` - API entry point & route registration
- `apps/api/src/rbac/index.ts` - RBAC endpoints and permission system
- `apps/api/src/team/index.ts` - Teams module with project-based organization
- `apps/web/src/routes/` - All frontend routes (TanStack Router)
- `apps/web/src/hooks/queries/` - React Query hooks for API calls
- `apps/web/src/store/` - Zustand stores for client state
- `apps/web/src/lib/auth.ts` - Better Auth client configuration
- `apps/api/src/realtime/unified-websocket-server.ts` - WebSocket server
- `.cursor/rules/` - Cursor AI agent rules and workflows
- `.windsurfrules` - Windsurf AI agent rules
- Feature inventory docs (when present) — comprehensive API surface audit

## ⚠️ Important Notes

1. **Single .env Location**: Only `apps/api/.env` is used. Frontend gets config from constants.
2. **Demo Mode Required**: Set `DEMO_MODE=true` for local development (bypasses auth).
3. **Port 1337**: API + WebSocket both on 1337. Ignore legacy references to 3005/3008/3006.
4. **PostgreSQL Only**: No SQLite support. All environments use PostgreSQL.
5. **Migration Before Start**: Always apply migrations before starting API server.
6. **Drizzle NOT Prisma**: Despite Prisma artifacts in package.json, project uses Drizzle ORM.
7. **RBAC System**: 11 role types with contextual permissions (workspace/project/department scoped).
8. **Teams Auto-Generated**: Teams are dynamically created from workspace members + project assignments.

## 🎨 UI/UX Patterns

### Magic UI Components
Project uses custom components inspired by Magic UI library:
- `apps/web/src/components/magicui/` - Animated components (dock, bento-grid, etc.)
- Tailwind CSS with `cn()` utility for class merging
- Framer Motion for complex animations

### Design System
- **Primary Brand**: #288cfa (Meridian Blue)
- **Typography**: Inter font family
- **Dark Mode**: Managed via Zustand + `next-themes`
- **Icons**: Lucide React icons

### Responsive Breakpoints
```typescript
// Mobile: 320px - 767px
// Tablet: 768px - 1023px  
// Desktop: 1024px+
```

## 🚢 Deployment

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Kubernetes (Helm)
```bash
cd charts/meridian
helm install meridian .
```

### Environment Variables (Production)
```bash
DATABASE_URL="postgresql://..."
BETTER_AUTH_URL="https://api.your-domain.com"
JWT_ACCESS_SECRET="<secure-secret>"
DEMO_MODE=false
```

---

**Last Updated**: January 2025
**Maintainer**: elidegbotse@gmail.com
**Status**: Active Development - 108 core functions verified working
