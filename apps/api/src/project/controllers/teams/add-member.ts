/**
 * Add Team Member Controller
 * 
 * Adds a user to a team with specified role
 * 
 * @epic-3.4-teams: Add member to team functionality
 */

import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../../../database/connection";
import logger from '../../../utils/logger';
import { 
  teams,
  teamMembers,
  userTable as users
} from "../../../database/schema";

interface AddMemberRequest {
  userEmail: string;
  userName: string;
  role?: string;
}

async function addMember(c: Context) {
  const db = getDatabase();
  const { projectId, teamId } = c.req.param();
  const currentUserEmail = c.get("userEmail");

  if (!projectId || !teamId) {
    return c.json({ error: "Project ID and Team ID are required" }, 400);
  }

  try {
    // Get current user for addedBy
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, currentUserEmail))
      .limit(1);

    if (!currentUser) {
      return c.json({ error: "User not found" }, 401);
    }

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

    const body = await c.req.json<AddMemberRequest>();

    if (!body.userEmail) {
      return c.json({ error: "User email is required" }, 400);
    }

    // Get the user to add
    const [userToAdd] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.userEmail))
      .limit(1);

    if (!userToAdd) {
      return c.json({ error: "User to add not found" }, 404);
    }

    // Check if already a member
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userToAdd.id)
      ),
    });

    if (existingMember) {
      return c.json({ error: "User is already a member of this team" }, 409);
    }

    // Add member to team
    const [newMember] = await db
      .insert(teamMembers)
      .values({
        id: createId(),
        teamId: teamId,
        userId: userToAdd.id,
        role: body.role || "member",
        addedBy: currentUser.id,
        joinedAt: new Date(),
      })
      .returning();

    // Return member with user details
    return c.json({
      id: newMember.id,
      userId: userToAdd.id,
      userEmail: userToAdd.email,
      userName: userToAdd.name,
      avatar: userToAdd.avatar,
      role: newMember.role,
      joinedAt: newMember.joinedAt,
    }, 201);
  } catch (error) {
    logger.error("Error adding team member:", error);
    return c.json({ error: "Failed to add team member" }, 500);
  }
}

export default addMember;


