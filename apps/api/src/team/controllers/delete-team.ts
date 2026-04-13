/**
 * 🔒 SECURED: Delete Team Controller  
 * Sentry integration
 */

import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { teamTable } from "../../database/schema";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";
import { HTTPException } from "hono/http-exception";

export async function deleteTeam(c: Context) {
  const teamId = c.req.param("teamId");
  
  try {
    const db = getDatabase();

    const [deletedTeam] = await db
      .delete(teamTable)
      .where(eq(teamTable.id, teamId))
      .returning();

    if (!deletedTeam) {
      throw new HTTPException(404, {
        message: "Team not found",
      });
    }

    // 📊 SENTRY: Add breadcrumb for successful deletion
    addBreadcrumb('Team deleted successfully', 'team', 'info', {
      teamId,
      teamName: deletedTeam.name,
    });

    return c.json({ success: true, team: deletedTeam });
  } catch (error) {
    logger.error("Error deleting team:", error);

    // 📊 SENTRY: Capture team deletion errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'teams',
        action: 'delete_team',
        teamId,
      });
    }

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to delete team" });
  }
}

