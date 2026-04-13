/**
 * 🧩 Get Node Types Controller
 * 
 * Retrieves available workflow node types for the drag-and-drop builder
 * @epic-3.2.3-visual-workflows
 */

import { NodeTypeService } from "../../services/node-type-service";
import logger from '../../../utils/logger';

export const getWorkflowNodeTypes = async (c: any) => {
  try {
    const category = c.req.query("category");
    const grouped = c.req.query("grouped") === "true";

    const nodeTypeService = new NodeTypeService();

    if (grouped) {
      // Return node types grouped by category
      const nodeTypesByCategory = await nodeTypeService.getNodeTypesByCategory();
      
      return c.json({
        success: true,
        data: {
          nodeTypes: nodeTypesByCategory,
          categories: Object.keys(nodeTypesByCategory),
          totalCount: Object.values(nodeTypesByCategory).reduce((sum, nodes) => sum + nodes.length, 0)
        }
      });
    } else {
      // Return flat list of node types
      const nodeTypes = await nodeTypeService.getNodeTypes(category);
      
      return c.json({
        success: true,
        data: {
          nodeTypes,
          totalCount: nodeTypes.length,
          category
        }
      });
    }

  } catch (error) {
    logger.error("Failed to get workflow node types:", error);
    return c.json({ 
      error: "Failed to get workflow node types",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
