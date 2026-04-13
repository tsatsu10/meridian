/**
 * 🎯 Get Team Goals Controller
 * 
 * GET /api/goals/team/:teamId
 * Gets all goals for team members with aggregated progress
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals, goalKeyResults } from "../../database/schema/goals";
import { users } from "../../database/schema";
import { teams, teamMembers } from "../../database/schema";
import { eq, and, inArray } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getTeamGoals(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const teamId = c.req.param('teamId');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Get team and verify user is a member
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        members: true,
      },
    });
    
    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }
    
    // Check if user is a member of this team
    const isMember = team.members.some((member: any) => member.userId === userId);
    if (!isMember) {
      return c.json({ error: "Access denied - you must be a team member" }, 403);
    }
    
    // Get all team member user IDs
    const memberUserIds = team.members.map((member: any) => member.userId);
    
    // Fetch all goals for team members (team or organization privacy)
    const teamGoals = await db.query.goals.findMany({
      where: and(
        inArray(goals.userId, memberUserIds),
        eq(goals.status, 'active'),
        inArray(goals.privacy, ['team', 'organization'])
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        keyResults: true,
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });
    
    // Calculate team statistics
    const stats = {
      totalGoals: teamGoals.length,
      membersWithGoals: new Set(teamGoals.map(g => g.userId)).size,
      totalMembers: memberUserIds.length,
      averageProgress: teamGoals.length > 0 
        ? Math.round(teamGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / teamGoals.length)
        : 0,
      completedGoals: teamGoals.filter(g => g.progress >= 100).length,
      onTrackGoals: teamGoals.filter(g => g.progress >= 25 && g.progress < 100).length,
      atRiskGoals: teamGoals.filter(g => g.progress < 25).length,
    };
    
    return c.json({ 
      success: true, 
      data: {
        team: {
          id: team.id,
          name: team.name,
          memberCount: memberUserIds.length,
        },
        goals: teamGoals,
        stats,
      }
    });
    
  } catch (error) {
    logger.error("Get team goals error:", error);
    return c.json({ 
      error: "Failed to fetch team goals",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



