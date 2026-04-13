/**
 * Update Team Member Role Controller
 * 
 * Updates the role of a team member
 * 
 * @epic-3.4-teams: Change member role functionality
 */

import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import logger from '../../../utils/logger';
import { 
  teams,
  teamMembers,
  userTable as users
} from "../../../database/schema";

interface UpdateRoleRequest {
  role: string;
}

async function updateMemberRole(c: Context) {
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

    // Verify member exists in team
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, memberId),
        eq(teamMembers.teamId, teamId)
      ),
    });

    if (!existingMember) {
      return c.json({ error: "Member not found in team" }, 404);
    }

    const body = await c.req.json<UpdateRoleRequest>();

    if (!body.role) {
      return c.json({ error: "Role is required" }, 400);
    }

    // Update member role
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ role: body.role })
      .where(eq(teamMembers.id, memberId))
      .returning();

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, updatedMember.userId))
      .limit(1);

    // Return updated member with user details
    return c.json({
      id: updatedMember.id,
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      avatar: user?.avatar,
      role: updatedMember.role,
      joinedAt: updatedMember.joinedAt,
    });
  } catch (error) {
    logger.error("Error updating member role:", error);
    return c.json({ error: "Failed to update member role" }, 500);
  }
}

export default updateMemberRole;


