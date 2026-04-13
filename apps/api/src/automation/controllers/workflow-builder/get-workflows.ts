/**
 * 📋 Get Visual Workflows Controller
 * 
 * Retrieves visual workflows for a workspace with filtering options
 * @epic-3.2.3-visual-workflows
 */

import { WorkflowBuilderService } from "../../services/workflow-builder-service";
import logger from '../../../utils/logger';

export const getVisualWorkflows = async (c: any) => {
  try {
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Parse query filters
    const category = c.req.query("category");
    const isActive = c.req.query("active") === "true" ? true : 
                    c.req.query("active") === "false" ? false : undefined;
    const search = c.req.query("search");

    const filters = {
      ...(category && { category }),
      ...(isActive !== undefined && { isActive }),
      ...(search && { search })
    };

    const workflowBuilder = new WorkflowBuilderService();
    const workflows = await workflowBuilder.getWorkflows(workspaceId, filters);

    return c.json({
      success: true,
      data: {
        workflows,
        count: workflows.length,
        filters: {
          category,
          isActive,
          search
        }
      }
    });

  } catch (error) {
    logger.error("Failed to get visual workflows:", error);
    return c.json({ 
      error: "Failed to get visual workflows",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
