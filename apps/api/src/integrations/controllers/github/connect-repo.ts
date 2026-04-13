/**
 * 🐙 Connect GitHub Repository Controller
 * 
 * Connects a GitHub repository to a Meridian project
 * @epic-3.2-integrations
 */

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { GitHubIntegration } from "../../services/github-integration";
import logger from '../../../utils/logger';

const connectRepoSchema = z.object({
  projectId: z.string(),
  repositoryUrl: z.string().url(),
  accessToken: z.string().min(1),
  syncIssues: z.boolean().default(true),
  autoCreateTasks: z.boolean().default(false)
});

export const connectGitHubRepo = zValidator("json", connectRepoSchema, async (c) => {
  try {
    const data = c.req.valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Connect GitHub repository
    const result = await GitHubIntegration.connectRepository(
      workspaceId,
      data.projectId,
      userEmail,
      {
        accessToken: data.accessToken,
        repositoryUrl: data.repositoryUrl,
        syncIssues: data.syncIssues,
        autoCreateTasks: data.autoCreateTasks
      }
    );

    return c.json({
      success: true,
      message: "GitHub repository connected successfully",
      data: {
        integration: {
          ...result.integration,
          credentials: null // Never return credentials
        },
        repository: result.repository
      }
    });

  } catch (error) {
    logger.error("Failed to connect GitHub repository:", error);
    return c.json({ 
      error: "Failed to connect GitHub repository",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}); 
