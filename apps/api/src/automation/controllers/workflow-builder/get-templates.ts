/**
 * 📚 Get Workflow Templates Controller
 * 
 * Retrieves pre-built workflow templates for the template marketplace
 * @epic-3.2.3-visual-workflows
 */

import { WorkflowBuilderService } from "../../services/workflow-builder-service";
import logger from '../../../utils/logger';

export const getWorkflowTemplates = async (c: any) => {
  try {
    const category = c.req.query("category");
    const complexity = c.req.query("complexity");

    const workflowBuilder = new WorkflowBuilderService();
    const templates = await workflowBuilder.getWorkflowTemplates(
      category ?? undefined,
    );

    // Group templates by category for better organization
    const templatesByCategory = templates.reduce((acc, template) => {
      const cat = template.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(template);
      return acc;
    }, {} as Record<string, any[]>);

    return c.json({
      success: true,
      data: {
        templates,
        templatesByCategory,
        totalCount: templates.length,
        categories: Object.keys(templatesByCategory),
        filters: {
          category,
          complexity
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
