/**
 * Remove Team Member Controller
 * 
 * Removes a user from a team
 * 
 * @epic-3.4-teams: Remove member from team functionality
 */

import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import { teams, teamMembers, userTable as users } from "../../../database/schema";
import logger from '../../../utils/logger';

async function removeMember(c: Context) {
  const db = getDatabase();
  const { projectId, teamId, memberId } = c.req.param();

  if (!projectId || !teamId || !memberId) {
    return c.json({ error: "Project ID, Team ID, and Member ID are required" }, 400);
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

    // Get member details before deletion
    const member = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, memberId),
        eq(teamMembers.teamId, teamId)
      ),
    });

    if (!member) {
      return c.json({ error: "Member not found in team" }, 404);
    }

    // Get user details for response
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, member.userId))
      .limit(1);

    // Remove member from team
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, memberId));

    return c.json({ 
      success: true, 
      message: `${user?.name || 'Member'} removed from team "${existingTeam.name}"` 
    });
  } catch (error) {
    logger.error("Error removing team member:", error);
    return c.json({ error: "Failed to remove team member" }, 500);
  }
}

export default removeMember;


