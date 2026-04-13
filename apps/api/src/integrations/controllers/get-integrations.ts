/**
 * 📋 Get Integrations Controller
 * 
 * Retrieves integration connections for a workspace
 * @epic-3.2-integrations
 */

import { IntegrationManager } from "../services/integration-manager";
import logger from '../../utils/logger';

export const getIntegrations = async (c: any) => {
  try {
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Query parameters
    const provider = c.req.query("provider");

    // Get integrations
    const integrations = await IntegrationManager.getIntegrations(workspaceId, provider);

    return c.json({
      success: true,
      data: integrations,
      meta: {
        total: integrations.length,
        provider: provider || "all"
      }
    });

  } catch (error) {
    logger.error("Failed to get integrations:", error);
    return c.json({ 
      error: "Failed to get integrations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
