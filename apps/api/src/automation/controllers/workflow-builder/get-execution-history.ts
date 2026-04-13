/**
 * 📊 Get Workflow Execution History Controller
 * 
 * Retrieves execution history and analytics for a visual workflow
 * @epic-3.2.3-visual-workflows
 */

import { VisualWorkflowEngine } from "../../services/visual-workflow-engine";
import logger from '../../../utils/logger';

export const getWorkflowExecutionHistory = async (c: any) => {
  try {
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");
    const workflowId = c.req.param("id");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    if (!workflowId) {
      return c.json({ error: "Workflow ID required" }, 400);
    }

    const limit = parseInt(c.req.query("limit") || "50");
    const includeAnalytics = c.req.query("analytics") === "true";

    const workflowEngine = new VisualWorkflowEngine();
    
    // Get execution history
    const executions = await workflowEngine.getExecutionHistory(workflowId, limit);
    
    // Get analytics if requested
    let analytics = null;
    if (includeAnalytics) {
      analytics = await workflowEngine.getWorkflowAnalytics(workflowId);
    }

    return c.json({
      success: true,
      data: {
        executions,
        analytics,
        count: executions.length,
        workflowId
      }
    });

  } catch (error) {
    logger.error("Failed to get workflow execution history:", error);
    return c.json({ 
      error: "Failed to get workflow execution history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
