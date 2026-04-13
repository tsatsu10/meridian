/**
 * 🔒 SECURED: Update Team Controller
 * Sanitization + Sentry integration
 */

import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { teamTable } from "../../database/schema";
import { sanitizeText, sanitizeRichText } from "../../lib/universal-sanitization";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";
import { HTTPException } from "hono/http-exception";

export async function updateTeam(c: Context) {
  const teamId = c.req.param("teamId");
  
  try {
    // Parse request body
    let body;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      logger.error("JSON parsing error:", jsonError);
      throw new HTTPException(400, {
        message: "Invalid JSON in request body",
      });
    }
    
    if (!body || Object.keys(body).length === 0) {
      throw new HTTPException(400, {
        message: "Request body is empty",
      });
    }
    
    const { name, description, projectId, settings } = body;

    const db = getDatabase();

    // Validate there's at least one field to update
    if (!name && description === undefined && projectId === undefined && !settings) {
      throw new HTTPException(400, {
        message: "No valid fields to update",
      });
    }

    // 🔒 SECURITY: Build sanitized update object
    const updateData: any = { updatedAt: new Date() };
    
    if (name !== undefined) {
      const sanitizedName = sanitizeText(name, { maxLength: 100, stripHtmlTags: true });
      if (!sanitizedName || sanitizedName.length === 0) {
        throw new HTTPException(400, {
          message: "Team name cannot be empty or contain only dangerous content",
        });
      }
      updateData.name = sanitizedName;
    }
    
    if (description !== undefined) {
      updateData.description = sanitizeRichText(description || '', { maxLength: 2000 });
    }
    
    if (projectId !== undefined) updateData.projectId = projectId;
    if (settings) updateData.settings = settings;

    logger.debug(`[Team Update] Updating team ${teamId} with:`, updateData);

    const [updatedTeam] = await db
      .update(teamTable)
      .set(updateData)
      .where(eq(teamTable.id, teamId))
      .returning();

    if (!updatedTeam) {
      logger.debug(`[Team Update] Team ${teamId} not found`);
      throw new HTTPException(404, {
        message: "Team not found",
      });
    }

    // 📊 SENTRY: Add breadcrumb for successful update
    addBreadcrumb('Team updated successfully', 'team', 'info', {
      teamId,
      fieldsUpdated: Object.keys(updateData),
    });

    logger.debug(`[Team Update] Team ${teamId} updated successfully`);
    return c.json({ team: updatedTeam });
  } catch (error) {
    logger.error("[Team Update] Error updating team:", error);
    logger.error("[Team Update] Error details:", error instanceof Error ? error.message : String(error));
    logger.error("[Team Update] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // 📊 SENTRY: Capture team update errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'teams',
        action: 'update_team',
        teamId,
      });
    }

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { 
      message: "Failed to update team",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

