/**
 * 📋 Get Workflow Templates Controller
 * 
 * Retrieves workflow templates for a workspace
 * @epic-3.1-automation-engine
 */

import { eq, and, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workflowTemplateTable } from "../../database/schema";
import logger from '../../utils/logger';

export const getWorkflowTemplates = async (c: any) => {
  const db = getDatabase();
  
  try {
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Query parameters
    const category = c.req.query("category");
    const isActive = c.req.query("active");
    const isPublic = c.req.query("public");

    // Build query conditions
    let conditions = [eq(workflowTemplateTable.workspaceId, workspaceId)];

    if (category) {
      conditions.push(eq(workflowTemplateTable.category, category));
    }

    if (isActive !== undefined) {
      conditions.push(eq(workflowTemplateTable.isActive, isActive === "true"));
    }

    if (isPublic !== undefined) {
      conditions.push(eq(workflowTemplateTable.isGlobal, isPublic === "true"));
    }

    // Get templates
    const templates = await db.select()
      .from(workflowTemplateTable)
      .where(and(...conditions))
      .orderBy(desc(workflowTemplateTable.createdAt));

    // Parse JSON fields for response
    const processedTemplates = templates.map(template => ({
      ...template,
      triggerConfig: JSON.parse(template.triggerConfig),
      actionConfig: JSON.parse(template.actionConfig),
      conditionConfig: template.conditionConfig ? JSON.parse(template.conditionConfig) : null
    }));

    return c.json({
      success: true,
      data: processedTemplates,
      meta: {
        total: templates.length,
        filters: {
          category,
          isActive,
          isPublic
        }
      }
    });

  } catch (error) {
    logger.error("Failed to get workflow templates:", error);
    return c.json({ 
      error: "Failed to get workflow templates",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
