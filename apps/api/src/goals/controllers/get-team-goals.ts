/**
 * 🎯 Get Team Goals Controller
 *
 * GET /api/goals/team/:teamId
 * Gets all goals for team members with aggregated progress
 */

import type { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { teams, teamMembers } from "../../database/schema";
import { eq, and, inArray } from "drizzle-orm";
import logger from "../../utils/logger";

export async function getTeamGoals(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.get("userId");
    const teamId = c.req.param("teamId");

    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }
    if (!teamId) {
      return c.json({ error: "Team id is required" }, 400);
    }

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const isMember = members.some((m) => m.userId === userId);
    if (!isMember) {
      return c.json(
        { error: "Access denied - you must be a team member" },
        403,
      );
    }

    const memberUserIds = members.map((m) => m.userId);

    const teamGoals =
      memberUserIds.length === 0
        ? []
        : await db.query.goals.findMany({
            where: and(
              inArray(goals.userId, memberUserIds),
              eq(goals.status, "active"),
              inArray(goals.privacy, ["team", "organization"]),
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
            orderBy: (g, { desc }) => [desc(g.createdAt)],
          });

    const stats = {
      totalGoals: teamGoals.length,
      membersWithGoals: new Set(teamGoals.map((g) => g.userId)).size,
      totalMembers: memberUserIds.length,
      averageProgress:
        teamGoals.length > 0
          ? Math.round(
              teamGoals.reduce((sum, g) => sum + (g.progress ?? 0), 0) /
                teamGoals.length,
            )
          : 0,
      completedGoals: teamGoals.filter((g) => (g.progress ?? 0) >= 100).length,
      onTrackGoals: teamGoals.filter((g) => {
        const p = g.progress ?? 0;
        return p >= 25 && p < 100;
      }).length,
      atRiskGoals: teamGoals.filter((g) => (g.progress ?? 0) < 25).length,
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
      },
    });
  } catch (error) {
    logger.error("Get team goals error:", error);
    return c.json(
      {
        error: "Failed to fetch team goals",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      500,
    );
  }
}
