/**
 * Create Project Team Controller
 * 
 * Creates a new team for a specific project
 * 
 * @epic-3.4-teams: Create team functionality
 */

import { Context } from "hono";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../../../database/connection";
import logger from '../../../utils/logger';
import { 
  projectTable as projects,
  teams,
  userTable as users
} from "../../../database/schema";

interface CreateTeamRequest {
  name: string;
  description?: string;
  color?: string;
  leadId?: string;
}

async function createTeam(c: Context) {
  const db = getDatabase();
  const { projectId } = c.req.param();
  const userEmail = c.get("userEmail");

  if (!projectId) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  try {
    // Get user for createdBy
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const body = await c.req.json<CreateTeamRequest>();

    if (!body.name || body.name.trim().length === 0) {
      return c.json({ error: "Team name is required" }, 400);
    }

    // Create the team
    const [newTeam] = await db
      .insert(teams)
      .values({
        id: createId(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        color: body.color || "#3B82F6",
        workspaceId: project.workspaceId,
        projectId: projectId,
        leadId: body.leadId || user.id,
        createdBy: user.id,
        isActive: true,
      })
      .returning();

    return c.json({
      ...newTeam,
      members: [], // New team starts with no members
    }, 201);
  } catch (error) {
    logger.error("Error creating team:", error);
    return c.json({ error: "Failed to create team" }, 500);
  }
}

export default createTeam;


