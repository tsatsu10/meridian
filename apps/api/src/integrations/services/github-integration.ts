/**
 * 🐙 GitHub Integration Service
 * 
 * Handles GitHub repository synchronization, issue automation, and webhook processing.
 * Provides seamless integration between Meridian projects and GitHub repositories.
 * 
 * @epic-3.2-integrations
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  integrationConnectionTable, 
  projectTable, 
  taskTable,
  automationRuleTable
} from "../../database/schema";
import { triggerAutomationRules } from "../../automation/services/automation-rule-engine";
import logger from '../../utils/logger';

// GitHub API types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string; avatar_url: string }>;
  milestone: { title: string; description: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubWebhookPayload {
  action: string;
  repository: GitHubRepo;
  issue?: GitHubIssue;
  pull_request?: any;
  sender: { login: string };
}

// GitHub integration configuration
export interface GitHubConfig {
  accessToken: string;
  repositoryId?: number;
  repositoryName?: string;
  webhookSecret?: string;
  syncIssues?: boolean;
  syncPullRequests?: boolean;
  autoCreateTasks?: boolean;
}

export class GitHubIntegration {
  private accessToken: string;
  private baseURL = "https://api.github.com";

  constructor(config: GitHubConfig) {
    this.accessToken = config.accessToken;
  }

  /**
   * Test GitHub connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest("/user");
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: "Invalid GitHub access token" };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      };
    }
  }

  /**
   * Get user's GitHub repositories
   */
  async getRepositories(): Promise<GitHubRepo[]> {
    try {
      const response = await this.makeRequest("/user/repos?sort=updated&per_page=100");
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error("Failed to get GitHub repositories:", error);
      throw error;
    }
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}`);
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error("Failed to get GitHub repository:", error);
      throw error;
    }
  }

  /**
   * Get repository issues
   */
  async getIssues(owner: string, repo: string, state: "open" | "closed" | "all" = "open"): Promise<GitHubIssue[]> {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=100`);
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error("Failed to get GitHub issues:", error);
      throw error;
    }
  }

  /**
   * Create GitHub issue
   */
  async createIssue(
    owner: string, 
    repo: string, 
    issue: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
      milestone?: number;
    }
  ): Promise<GitHubIssue> {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/issues`, {
        method: "POST",
        body: JSON.stringify(issue)
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error("Failed to create GitHub issue:", error);
      throw error;
    }
  }

  /**
   * Update GitHub issue
   */
  async updateIssue(
    owner: string, 
    repo: string, 
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error("Failed to update GitHub issue:", error);
      throw error;
    }
  }

  /**
   * Create webhook for repository
   */
  async createWebhook(
    owner: string, 
    repo: string, 
    webhookUrl: string, 
    secret: string
  ): Promise<any> {
    try {
      const webhook = {
        name: "web",
        active: true,
        events: ["issues", "pull_request", "push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: secret,
          insecure_ssl: "0"
        }
      };

      const response = await this.makeRequest(`/repos/${owner}/${repo}/hooks`, {
        method: "POST",
        body: JSON.stringify(webhook)
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error("Failed to create GitHub webhook:", error);
      throw error;
    }
  }

  /**
   * Handle GitHub webhook event
   */
  static async handleWebhook(
    workspaceId: string,
    payload: GitHubWebhookPayload,
    signature: string
  ) {
    try {
      logger.debug(`Processing GitHub webhook: ${payload.action}`);

      // Process different webhook events
      switch (payload.action) {
        case "opened":
          if (payload.issue) {
            await this.handleIssueOpened(workspaceId, payload);
          }
          break;
        
        case "closed":
          if (payload.issue) {
            await this.handleIssueClosed(workspaceId, payload);
          }
          break;
        
        case "assigned":
          if (payload.issue) {
            await this.handleIssueAssigned(workspaceId, payload);
          }
          break;

        default:
          logger.debug(`Unhandled GitHub webhook action: ${payload.action}`);
      }

      // Trigger automation rules for GitHub events
      await triggerAutomationRules("github_webhook", {
        action: payload.action,
        repository: payload.repository.full_name,
        issue: payload.issue,
        pullRequest: payload.pull_request,
        sender: payload.sender.login
      }, workspaceId);

      return { success: true, processed: true };
    } catch (error) {
      logger.error("Failed to handle GitHub webhook:", error);
      throw error;
    }
  }

  /**
   * Sync GitHub issues with Meridian tasks
   */
  static async syncRepositoryIssues(
    workspaceId: string,
    projectId: string,
    owner: string,
    repo: string,
    accessToken: string
  ) {
    const db = getDatabase();
    
    try {
      const github = new GitHubIntegration({ accessToken });
      const issues = await github.getIssues(owner, repo, "open");

      let createdTasks = 0;
      let updatedTasks = 0;

      for (const issue of issues) {
        // Check if task already exists for this issue
        const existingTask = await db.select()
          .from(taskTable)
          .where(
            and(
              eq(taskTable.projectId, projectId),
              eq(taskTable.externalId, `github-${issue.id}`)
            )
          );

        if (existingTask.length > 0) {
          // Update existing task
          await db.update(taskTable)
            .set({
              title: issue.title,
              description: issue.body || "",
              status: issue.state === "closed" ? "completed" : "todo",
              updatedAt: new Date()
            })
            .where(eq(taskTable.id, existingTask[0].id));
          
          updatedTasks++;
        } else {
          // Create new task
          await db.insert(taskTable).values({
            id: createId(),
            title: issue.title,
            description: issue.body || "",
            projectId,
            status: "todo",
            priority: "medium",
            externalId: `github-${issue.id}`,
            externalUrl: issue.html_url,
            createdBy: "system"
          });
          
          createdTasks++;
        }
      }

      return { 
        success: true, 
        createdTasks, 
        updatedTasks, 
        totalIssues: issues.length 
      };
    } catch (error) {
      logger.error("Failed to sync GitHub issues:", error);
      throw error;
    }
  }

  /**
   * Connect GitHub repository to Meridian project
   */
  static async connectRepository(
    workspaceId: string,
    projectId: string,
    userId: string,
    config: {
      accessToken: string;
      repositoryUrl: string;
      syncIssues: boolean;
      autoCreateTasks: boolean;
    }
  ) {
    const db = getDatabase();
    
    try {
      // Parse repository URL
      const repoMatch = config.repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        throw new Error("Invalid GitHub repository URL");
      }

      const [, owner, repo] = repoMatch;

      // Test GitHub connection
      const github = new GitHubIntegration({ accessToken: config.accessToken });
      const testResult = await github.testConnection();
      
      if (!testResult.success) {
        throw new Error(testResult.error || "Failed to connect to GitHub");
      }

      // Get repository details
      const repository = await github.getRepository(owner, repo);

      // Create integration connection
      const integration = await db.insert(integrationConnectionTable).values({
        id: createId(),
        name: `GitHub - ${repository.full_name}`,
        provider: "github",
        workspaceId,
        createdBy: userId,
        config: JSON.stringify({
          owner,
          repo,
          repositoryId: repository.id,
          repositoryUrl: repository.html_url,
          syncIssues: config.syncIssues,
          autoCreateTasks: config.autoCreateTasks
        }),
        credentials: JSON.stringify({
          accessToken: config.accessToken
        }),
        connectionStatus: "connected",
        isActive: true,
        lastConnectedAt: new Date()
      }).returning();

      // Update project with GitHub integration
      await db.update(projectTable)
        .set({
          integrationConfig: JSON.stringify({
            github: {
              integrationId: integration[0].id,
              repositoryUrl: repository.html_url,
              owner,
              repo
            }
          })
        })
        .where(eq(projectTable.id, projectId));

      // Sync issues if requested
      if (config.syncIssues) {
        await this.syncRepositoryIssues(
          workspaceId,
          projectId,
          owner,
          repo,
          config.accessToken
        );
      }

      return {
        success: true,
        integration: integration[0],
        repository
      };
    } catch (error) {
      logger.error("Failed to connect GitHub repository:", error);
      throw error;
    }
  }

  // Private helper methods
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Meridian-Integration/1.0"
    };

    if (options.body) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    return fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
  }

  // Webhook event handlers
  private static async handleIssueOpened(workspaceId: string, payload: GitHubWebhookPayload) {
    const db = getDatabase();
    if (!payload.issue) return;

    // Find projects connected to this repository
    const projects = await db.select()
      .from(projectTable)
      .innerJoin(integrationConnectionTable, eq(integrationConnectionTable.workspaceId, workspaceId))
      .where(
        and(
          eq(integrationConnectionTable.provider, "github"),
          eq(integrationConnectionTable.isActive, true)
        )
      );

    // Create task for issue if auto-create is enabled
    for (const project of projects) {
      const config = JSON.parse(project.integration_connection.config);
      
      if (config.autoCreateTasks && 
          config.owner === payload.repository.full_name.split("/")[0] &&
          config.repo === payload.repository.full_name.split("/")[1]) {
        
        await db.insert(taskTable).values({
          id: createId(),
          title: payload.issue.title,
          description: payload.issue.body || "",
          projectId: project.project.id,
          status: "todo",
          priority: "medium",
          externalId: `github-${payload.issue.id}`,
          externalUrl: payload.issue.html_url,
          createdBy: "github-integration"
        });
      }
    }
  }

  private static async handleIssueClosed(workspaceId: string, payload: GitHubWebhookPayload) {
    const db = getDatabase();
    if (!payload.issue) return;

    // Find and update corresponding task
    const task = await db.select()
      .from(taskTable)
      .where(eq(taskTable.externalId, `github-${payload.issue.id}`));

    if (task.length > 0) {
      await db.update(taskTable)
        .set({
          status: "completed",
          updatedAt: new Date()
        })
        .where(eq(taskTable.id, task[0].id));
    }
  }

  private static async handleIssueAssigned(workspaceId: string, payload: GitHubWebhookPayload) {
    const db = getDatabase();
    if (!payload.issue) return;

    // Find and update corresponding task
    const task = await db.select()
      .from(taskTable)
      .where(eq(taskTable.externalId, `github-${payload.issue.id}`));

    if (task.length > 0 && payload.issue.assignees.length > 0) {
      // Note: This would need mapping from GitHub username to Meridian user email
      const assignee = payload.issue.assignees[0];
      
      await db.update(taskTable)
        .set({
          assigneeEmail: `${assignee.login}@github.local`, // Placeholder mapping
          updatedAt: new Date()
        })
        .where(eq(taskTable.id, task[0].id));
    }
  }
} 
