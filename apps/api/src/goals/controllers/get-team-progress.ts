/**
 * 🎯 Get Team Progress Controller
 *
 * GET /api/goals/team/:teamId/progress
 * Gets aggregated progress summary for team
 */

import type { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { goals } from "../../database/schema/goals";
import { teams, teamMembers, users } from "../../database/schema";
import { eq, and, inArray } from "drizzle-orm";
import logger from "../../utils/logger";

type MemberProgressRow = {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  goalsCount: number;
  averageProgress: number;
  completedGoals: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number | null;
    keyResultsCount: number;
  }>;
};

export async function getTeamProgress(c: Context) {
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

    const memberUserIds = members.map((m) => m.userId);

    const userRows =
      memberUserIds.length > 0
        ? await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              avatar: users.avatar,
            })
            .from(users)
            .where(inArray(users.id, memberUserIds))
        : [];

    const userById = new Map(userRows.map((u) => [u.id, u]));

    const memberProgress: MemberProgressRow[] = await Promise.all(
      members.map(async (member) => {
        const memberGoals = await db.query.goals.findMany({
          where: and(
            eq(goals.userId, member.userId),
            eq(goals.status, "active"),
            inArray(goals.privacy, ["team", "organization"]),
          ),
          with: {
            keyResults: true,
          },
        });

        const totalProgress = memberGoals.reduce(
          (sum, g) => sum + (g.progress ?? 0),
          0,
        );
        const avgProgress =
          memberGoals.length > 0
            ? Math.round(totalProgress / memberGoals.length)
            : 0;

        const u = userById.get(member.userId);

        return {
          user: u ?? {
            id: member.userId,
            name: "",
            email: "",
            avatar: null as string | null,
          },
          goalsCount: memberGoals.length,
          averageProgress: avgProgress,
          completedGoals: memberGoals.filter((g) => (g.progress ?? 0) >= 100)
            .length,
          goals: memberGoals.map((g) => ({
            id: g.id,
            title: g.title,
            progress: g.progress,
            keyResultsCount: g.keyResults?.length ?? 0,
          })),
        };
      }),
    );

    const teamStats = {
      totalGoals: memberProgress.reduce(
        (sum: number, m: MemberProgressRow) => sum + m.goalsCount,
        0,
      ),
      averageProgress:
        memberProgress.length > 0
          ? Math.round(
              memberProgress.reduce(
                (sum: number, m: MemberProgressRow) => sum + m.averageProgress,
                0,
              ) / memberProgress.length,
            )
          : 0,
      membersWithGoals: memberProgress.filter((m) => m.goalsCount > 0).length,
      totalMembers: members.length,
      completedGoals: memberProgress.reduce(
        (sum: number, m: MemberProgressRow) => sum + m.completedGoals,
        0,
      ),
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
      },
    });
  } catch (error) {
    logger.error("Get team progress error:", error);
    return c.json(
      {
        error: "Failed to fetch team progress",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      500,
    );
  }
}
