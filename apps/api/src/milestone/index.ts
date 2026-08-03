import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { createMilestone } from "./controllers/create-milestone";
import { getMilestones } from "./controllers/get-milestones";
import { updateMilestone } from "./controllers/update-milestone";
import { deleteMilestone } from "./controllers/delete-milestone";
import { auth } from "../middlewares/auth";
import rbacMiddleware, { checkProjectPermission } from "../middlewares/rbac";
import type { PermissionAction } from "../types/rbac";
import { getDatabase } from "../database/connection";
import { milestoneTable } from "../database/schema";

// @epic-1.3-milestones: Milestone management API routes
// @role-project-manager: PM needs comprehensive milestone management capabilities

const app = new Hono<{ Variables: { userEmail: string } }>();

// Apply authentication middleware
app.use("*", auth);

// SECURITY: requirePermission checked only "does the caller have this
// permission on ANY active role assignment, anywhere" — never that the
// assignment was scoped to the workspace that owns this milestone's
// project. A user with canManageProjectMilestones in their own workspace
// could edit/delete milestones in a completely different workspace's
// project by ID. Resolve milestone -> project and reuse the same
// workspace-scoped check task/team/project-notes routes already use.
async function resolveMilestoneProjectId(
  milestoneId: string,
): Promise<string | null> {
  const db = getDatabase();
  const [row] = await db
    .select({ projectId: milestoneTable.projectId })
    .from(milestoneTable)
    .where(eq(milestoneTable.id, milestoneId))
    .limit(1);
  return row?.projectId ?? null;
}

function requireMilestoneProjectPermission(permission: PermissionAction) {
  return createMiddleware<{ Variables: { userEmail: string } }>(
    async (c, next) => {
      const milestoneId = c.req.param("milestoneId");
      const projectId = milestoneId
        ? await resolveMilestoneProjectId(milestoneId)
        : null;
      if (!projectId) {
        return c.json({ error: "Milestone not found" }, 404);
      }
      const result = await checkProjectPermission(
        c.get("userEmail"),
        projectId,
        permission,
      );
      if (!result.allowed) {
        return c.json(
          result.body ?? { error: "Forbidden" },
          result.status ?? 403,
        );
      }
      await next();
    },
  );
}

// Get all milestones for a project
app.get(
  "/projects/:projectId/milestones",
  rbacMiddleware.requireProjectPermission("canViewProjectMilestones"),
  getMilestones,
);

// Create a new milestone
app.post(
  "/projects/:projectId/milestones",
  rbacMiddleware.requireProjectPermission("canManageProjectMilestones"),
  createMilestone,
);

// Update a milestone
app.put(
  "/milestones/:milestoneId",
  requireMilestoneProjectPermission("canManageProjectMilestones"),
  updateMilestone,
);

// Delete a milestone
app.delete(
  "/milestones/:milestoneId",
  requireMilestoneProjectPermission("canManageProjectMilestones"),
  deleteMilestone,
);

export default app;
