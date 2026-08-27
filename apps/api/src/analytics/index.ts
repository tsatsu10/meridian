import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import {
  requireProjectPermission,
  requireWorkspacePermission,
} from "../middlewares/rbac";
import { getProjectAnalytics } from "./controllers/get-project-analytics";
import { getWorkspaceAnalytics } from "./controllers/get-workspace-analytics";
// Phase 3: Live metrics
import {
  getTodayTaskCount,
  getTaskTrend,
  getLiveTaskStats,
} from "./controllers/task-counter";
import { getWorkspaceProgress } from "./controllers/progress-tracker";

// @epic-3.1-analytics: Analytics API routes
// @role-workspace-manager: Workspace manager needs organization-wide analytics
// @role-project-manager: PM needs project-specific analytics

const app = new Hono();

// Apply authentication middleware
app.use("*", auth);

// Get workspace-level analytics
//
// 🚨 SECURITY: guarded by requireWorkspacePermission, NOT the unscoped
// requirePermission. The controller reads :workspaceId straight from the path
// and never checks membership itself, so an unscoped "does this caller hold
// canViewAnalytics anywhere" gate let any member of any workspace read any
// OTHER workspace's analytics. This guard resolves the caller's assignment in
// the workspace being requested and denies when there is none.
app.get(
  "/workspaces/:workspaceId/analytics",
  // Workspace-WIDE analytics use canViewWorkspaceAnalytics, not the generic
  // canViewAnalytics. Overloading one key for both scopes meant granting a
  // project manager analytics for their own project also handed them the
  // whole workspace's aggregate.
  requireWorkspacePermission("canViewWorkspaceAnalytics"),
  getWorkspaceAnalytics,
);

// Get project-level analytics — scoped for the same reason, via the project's
// owning workspace.
app.get(
  "/projects/:projectId/analytics",
  requireProjectPermission("canViewProjectAnalytics"),
  getProjectAnalytics,
);

// Phase 3: Live Task Counter
// 🚨 These four took :workspaceId from the path with no authorization, so any
// authenticated user could read another workspace's task counts and progress.
app.use(
  "/tasks/today/:workspaceId",
  requireWorkspacePermission("canViewTasks", "workspaceId"),
);
app.use(
  "/tasks/trend/:workspaceId",
  requireWorkspacePermission("canViewTasks", "workspaceId"),
);
app.use(
  "/tasks/live/:workspaceId",
  requireWorkspacePermission("canViewTasks", "workspaceId"),
);
app.use(
  "/progress/:workspaceId",
  requireWorkspacePermission("canViewProjects", "workspaceId"),
);

app.get("/tasks/today/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  try {
    const data = await getTodayTaskCount(workspaceId);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

app.get("/tasks/trend/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  try {
    const data = await getTaskTrend(workspaceId);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

app.get("/tasks/live/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  try {
    const data = await getLiveTaskStats(workspaceId);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

app.get("/progress/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  try {
    const data = await getWorkspaceProgress(workspaceId);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export default app;
