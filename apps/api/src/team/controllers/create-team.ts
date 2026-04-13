/**
 * 🔒 SECURED: Create Team Controller
 * Sanitization + Sentry integration
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { teamTable, teamMemberTable } from "../../database/schema";
import { sanitizeText, sanitizeRichText } from "../../lib/universal-sanitization";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";
import { HTTPException } from "hono/http-exception";

export async function createTeam(c: Context) {
  try {
    const body = await c.req.json();
    const { name, description, workspaceId, projectId, memberIds } = body;

    // 🔒 SECURITY: Validate required fields
    if (!name || !workspaceId) {
      throw new HTTPException(400, {
        message: "Missing required fields: name and workspaceId are required",
      });
    }

    // 🔒 SECURITY: Sanitize all user inputs to prevent XSS
    const sanitizedName = sanitizeText(name || '', { maxLength: 100, stripHtmlTags: true });
    const sanitizedDescription = sanitizeRichText(description || '', { maxLength: 2000 });

    if (!sanitizedName || sanitizedName.length === 0) {
      throw new HTTPException(400, {
        message: "Team name cannot be empty or contain only dangerous content",
      });
    }

    const db = getDatabase();

    // Create the team
    const [newTeam] = await db
      .insert(teamTable)
      .values({
        name: sanitizedName,
        description: sanitizedDescription || "",
        workspaceId,
        projectId: projectId || null,
        isActive: true,
      })
      .returning();

    // Add members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      await db.insert(teamMemberTable).values(
        memberIds.map((userId: string) => ({
          teamId: newTeam.id,
          userId,
          role: "member",
        }))
      );
    }

    // 📊 SENTRY: Add breadcrumb for successful team creation
    addBreadcrumb('Team created successfully', 'team', 'info', {
      teamId: newTeam.id,
      workspaceId,
      hasDescription: !!description,
      memberCount: memberIds?.length || 0,
    });

    return c.json({ team: newTeam }, 201);
  } catch (error) {
    logger.error("Error creating team:", error);

    // 📊 SENTRY: Capture team creation errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'teams',
        action: 'create_team',
        workspaceId: (await c.req.json()).workspaceId,
        name: (await c.req.json()).name?.substring(0, 100),
      });
    }

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to create team" });
  }
}

