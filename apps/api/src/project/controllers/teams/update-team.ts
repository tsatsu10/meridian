/**
 * Update Project Team Controller
 * 
 * Updates team information (name, description, color, leadId)
 * 
 * @epic-3.4-teams: Edit team functionality
 */

import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import { teams } from "../../../database/schema";
import logger from '../../../utils/logger';

interface UpdateTeamRequest {
  name?: string;
  description?: string;
  color?: string;
  leadId?: string;
}

async function updateTeam(c: Context) {
  const db = getDatabase();
  const { projectId, teamId } = c.req.param();

  if (!projectId || !teamId) {
    return c.json({ error: "Project ID and Team ID are required" }, 400);
  }

  try {
    // Verify team exists and belongs to project
    const existingTeam = await db.query.teams.findFirst({
      where: and(
        eq(teams.id, teamId),
        eq(teams.projectId, projectId),
        eq(teams.isActive, true)
      ),
    });

    if (!existingTeam) {
      return c.json({ error: "Team not found" }, 404);
    }

    const body = await c.req.json<UpdateTeamRequest>();

    // Build update object
    const updates: Partial<typeof teams.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined && body.name.trim().length > 0) {
      updates.name = body.name.trim();
    }
    
    if (body.description !== undefined) {
      updates.description = body.description.trim() || null;
    }
    
    if (body.color !== undefined) {
      updates.color = body.color;
    }
    
    if (body.leadId !== undefined) {
      updates.leadId = body.leadId;
    }

    // Update the team
    const [updatedTeam] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, teamId))
      .returning();

    return c.json(updatedTeam);
  } catch (error) {
    logger.error("Error updating team:", error);
    return c.json({ error: "Failed to update team" }, 500);
  }
}

export default updateTeam;


