/**
 * 🏗️ Create Workflow from Template Controller
 * 
 * Creates a new workflow based on a pre-built template
 * @epic-3.2.3-visual-workflows
 */

import { Context } from "hono";
import { z } from "zod";
import { WorkflowBuilderService } from "../../services/workflow-builder-service";
import logger from '../../../utils/logger';

const createFromTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional()
});

export const createWorkflowFromTemplate = async (c: Context) => {
  try {
    // Validate the request body
    const body = await c.req.json();
    const validation = createFromTemplateSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ error: "Invalid request data", details: validation.error }, 400);
    }

    const data = validation.data;
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");
    const templateId = c.req.param("templateId");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    if (!templateId) {
      return c.json({ error: "Template ID required" }, 400);
    }

    // Initialize the workflow builder service
    const workflowService = new WorkflowBuilderService();

    // Check if template exists
    const template = await workflowService.getTemplate(templateId);
    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    const result = await workflowService.createFromTemplate(
      templateId,
      workspaceId,
      userEmail,
      {
        name: data.name || template.name,
        description: data.description ?? template.description ?? undefined,
      },
    );

    if (!result.success) {
      return c.json(
        { error: result.error ?? "Failed to create workflow from template" },
        400,
      );
    }

    return c.json({
      success: true,
      data: result.workflow,
      message: "Workflow created successfully from template",
    });

  } catch (error) {
    logger.error("Error creating workflow from template:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}; 
