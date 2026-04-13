/**
 * Get Project Teams Controller
 * 
 * Returns all teams for a specific project with member details
 * 
 * @epic-3.4-teams: Get all teams for project settings page
 */

import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import logger from '../../../utils/logger';
import { 
  projectTable as projects, 
  teams,
  teamMembers,
  userTable as users 
} from "../../../database/schema";

async function getProjectTeams(c: Context) {
  const db = getDatabase();
  const { projectId } = c.req.param();

  if (!projectId) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  try {
    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Get all teams for this project
    const projectTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        color: teams.color,
        leadId: teams.leadId,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .where(
        and(
          eq(teams.projectId, projectId),
          eq(teams.isActive, true)
        )
      );

    // Get members for each team
    const teamsWithMembers = await Promise.all(
      projectTeams.map(async (team) => {
        const members = await db
          .select({
            id: teamMembers.id,
            userId: teamMembers.userId,
            userEmail: users.email,
            userName: users.name,
            avatar: users.avatar,
            role: teamMembers.role,
            joinedAt: teamMembers.joinedAt,
          })
          .from(teamMembers)
          .leftJoin(users, eq(teamMembers.userId, users.id))
          .where(eq(teamMembers.teamId, team.id));

        return {
          ...team,
          members,
        };
      })
    );

    return c.json(teamsWithMembers);
  } catch (error) {
    logger.error("Error fetching project teams:", error);
    return c.json({ error: "Failed to fetch teams" }, 500);
  }
}

export default getProjectTeams;


