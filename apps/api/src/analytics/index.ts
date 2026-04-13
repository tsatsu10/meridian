import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import { requirePermission } from "../middlewares/rbac";
import { getProjectAnalytics } from "./controllers/get-project-analytics";
import { getWorkspaceAnalytics } from "./controllers/get-workspace-analytics";
// Phase 3: Live metrics
import { getTodayTaskCount, getTaskTrend, getLiveTaskStats } from "./controllers/task-counter";
import { getWorkspaceProgress } from "./controllers/progress-tracker";

// @epic-3.1-analytics: Analytics API routes
// @role-workspace-manager: Workspace manager needs organization-wide analytics
// @role-project-manager: PM needs project-specific analytics

const app = new Hono();

// Apply authentication middleware
app.use("*", auth);

// Get workspace-level analytics
app.get(
  "/workspaces/:workspaceId/analytics",
  requirePermission("canViewAnalytics"),
  getWorkspaceAnalytics
);

// Get project-level analytics
app.get(
  "/projects/:projectId/analytics",
  requirePermission("canViewAnalytics"),
  getProjectAnalytics
);

// Phase 3: Live Task Counter
app.get("/tasks/today/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  
  try {
    const data = await getTodayTaskCount(workspaceId);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
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
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
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
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
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
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

export default app; 
