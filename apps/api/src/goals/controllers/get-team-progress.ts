/**
 * 🎯 Get Team Progress Controller
 * 
 * GET /api/goals/team/:teamId/progress
 * Gets aggregated progress summary for team
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { teams, teamMembers } from "../../database/schema";
import { eq, and, inArray, gte } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getTeamProgress(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get('userId');
    const teamId = c.req.param('teamId');
    
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    // Get team members
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    
    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }
    
    // Get member IDs
    const memberUserIds = team.members.map((member: any) => member.userId);
    
    // Get goals for each member
    const memberProgress = await Promise.all(
      team.members.map(async (member: any) => {
        const memberGoals = await db.query.goals.findMany({
          where: and(
            eq(goals.userId, member.userId),
            eq(goals.status, 'active'),
            inArray(goals.privacy, ['team', 'organization'])
          ),
          with: {
            keyResults: true,
          },
        });
        
        const totalProgress = memberGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
        const avgProgress = memberGoals.length > 0 
          ? Math.round(totalProgress / memberGoals.length)
          : 0;
        
        return {
          user: member.user,
          goalsCount: memberGoals.length,
          averageProgress: avgProgress,
          completedGoals: memberGoals.filter(g => g.progress >= 100).length,
          goals: memberGoals.map(g => ({
            id: g.id,
            title: g.title,
            progress: g.progress,
            keyResultsCount: g.keyResults?.length || 0,
          })),
        };
      })
    );
    
    // Team-wide statistics
    const teamStats = {
      totalGoals: memberProgress.reduce((sum, m) => sum + m.goalsCount, 0),
      averageProgress: memberProgress.length > 0
        ? Math.round(memberProgress.reduce((sum, m) => sum + m.averageProgress, 0) / memberProgress.length)
        : 0,
      membersWithGoals: memberProgress.filter(m => m.goalsCount > 0).length,
      totalMembers: team.members.length,
      completedGoals: memberProgress.reduce((sum, m) => sum + m.completedGoals, 0),
    };
    
    return c.json({ 
      success: true, 
      data: {
        team: {
          id: team.id,
          name: team.name,
        },
        memberProgress,
        stats: teamStats,
      }
    });
    
  } catch (error) {
    logger.error("Get team progress error:", error);
    return c.json({ 
      error: "Failed to fetch team progress",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



