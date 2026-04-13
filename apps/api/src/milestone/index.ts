import { Hono } from "hono";
import { createMilestone } from "./controllers/create-milestone";
import { getMilestones } from "./controllers/get-milestones";
import { updateMilestone } from "./controllers/update-milestone";
import { deleteMilestone } from "./controllers/delete-milestone";
import { auth } from "../middlewares/auth";
import { requirePermission } from "../middlewares/rbac";

// @epic-1.3-milestones: Milestone management API routes
// @role-project-manager: PM needs comprehensive milestone management capabilities

const app = new Hono();

// Apply authentication middleware
app.use("*", auth);

// Get all milestones for a project
app.get(
  "/projects/:projectId/milestones",
  requirePermission("canViewProjectMilestones"),
  getMilestones
);

// Create a new milestone
app.post(
  "/projects/:projectId/milestones",
  requirePermission("canManageProjectMilestones"),
  createMilestone
);

// Update a milestone
app.put(
  "/milestones/:milestoneId",
  requirePermission("canManageProjectMilestones"),
  updateMilestone
);

// Delete a milestone
app.delete(
  "/milestones/:milestoneId",
  requirePermission("canManageProjectMilestones"),
  deleteMilestone
);

export default app; 
