/**
 * Delete Project Team Controller
 * 
 * Soft deletes a team (sets isActive to false) or hard deletes based on parameter
 * 
 * @epic-3.4-teams: Delete team functionality
 */

import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import { teams, teamMembers } from "../../../database/schema";
import logger from '../../../utils/logger';

async function deleteTeam(c: Context) {
  const db = getDatabase();
  const { projectId, teamId } = c.req.param();
  const hardDelete = c.req.query("hard") === "true";

  if (!projectId || !teamId) {
    return c.json({ error: "Project ID and Team ID are required" }, 400);
  }

  try {
    // Verify team exists and belongs to project
    const existingTeam = await db.query.teams.findFirst({
      where: and(
        eq(teams.id, teamId),
        eq(teams.projectId, projectId)
      ),
    });

    if (!existingTeam) {
      return c.json({ error: "Team not found" }, 404);
    }

    if (hardDelete) {
      // Hard delete - remove team and all members
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
      
      return c.json({ 
        success: true, 
        message: `Team "${existingTeam.name}" permanently deleted` 
      });
    } else {
      // Soft delete - set isActive to false
      await db
        .update(teams)
        .set({ 
          isActive: false,
          updatedAt: new Date() 
        })
        .where(eq(teams.id, teamId));
      
      return c.json({ 
        success: true, 
        message: `Team "${existingTeam.name}" deactivated` 
      });
    }
  } catch (error) {
    logger.error("Error deleting team:", error);
    return c.json({ error: "Failed to delete team" }, 500);
  }
}

export default deleteTeam;


