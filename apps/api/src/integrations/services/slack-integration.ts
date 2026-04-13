/**
 * 💬 Slack Integration Service
 * 
 * Handles Slack workspace integration, channel notifications, bot commands,
 * and real-time communication automation for Meridian workflows.
 * 
 * @epic-3.2-integrations
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import logger from '../../utils/logger';
import { 
  integrationConnectionTable, 
  projectTable,
  taskTable,
  userTable
} from "../../database/schema";

// Slack API types
export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_private: boolean;
  is_archived: boolean;
  purpose: { value: string };
  topic: { value: string };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    email: string;
    display_name: string;
    image_72: string;
  };
}

export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
  reply_broadcast?: boolean;
}

export interface SlackWebhookPayload {
  type: string;
  event?: {
    type: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
  };
  challenge?: string;
}

// Slack integration configuration
export interface SlackConfig {
  botToken: string;
  userToken?: string;
  signingSecret: string;
  appId?: string;
  teamId?: string;
  enterpriseId?: string;
  webhookUrl?: string;
}

export class SlackIntegration {
  private botToken: string;
  private userToken?: string;
  private signingSecret: string;
  private baseURL = "https://slack.com/api";

  constructor(config: SlackConfig) {
    this.botToken = config.botToken;
    this.userToken = config.userToken;
    this.signingSecret = config.signingSecret;
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; team?: any }> {
    try {
      const response = await this.makeRequest("/auth.test");
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          return { 
            success: true, 
            team: {
              id: data.team_id,
              name: data.team,
              url: data.url,
              bot_id: data.bot_id
            }
          };
        } else {
          return { success: false, error: data.error || "Authentication failed" };
        }
      } else {
        return { success: false, error: "Invalid Slack bot token" };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      };
    }
  }

  /**
   * Get Slack channels
   */
  async getChannels(types: string = "public_channel,private_channel"): Promise<SlackChannel[]> {
    try {
      const response = await this.makeRequest(`/conversations.list?types=${types}&limit=1000`);
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }
      
      return data.channels;
    } catch (error) {
      logger.error("Failed to get Slack channels:", error);
      throw error;
    }
  }

  /**
   * Get Slack users
   */
  async getUsers(): Promise<SlackUser[]> {
    try {
      const response = await this.makeRequest("/users.list?limit=1000");
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }
      
      return data.members.filter((user: any) => !user.deleted && !user.is_bot);
    } catch (error) {
      logger.error("Failed to get Slack users:", error);
      throw error;
    }
  }

  /**
   * Send message to Slack channel or user
   */
  async sendMessage(message: SlackMessage): Promise<any> {
    try {
      const payload = {
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments,
        thread_ts: message.thread_ts,
        reply_broadcast: message.reply_broadcast
      };

      const response = await this.makeRequest("/chat.postMessage", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      logger.error("Failed to send Slack message:", error);
      throw error;
    }
  }

  /**
   * Send rich notification with Meridian formatting
   */
  async sendMeridianNotification(
    channel: string,
    notification: {
      title: string;
      message: string;
      color?: string;
      fields?: Array<{ title: string; value: string; short?: boolean }>;
      actions?: Array<{ type: string; text: string; url?: string; value?: string }>;
      footer?: string;
      timestamp?: Date;
    }
  ): Promise<any> {
    try {
             const attachment: any = {
         color: notification.color || "#2196F3", // Meridian blue
         title: notification.title,
         text: notification.message,
         fields: notification.fields || [],
         footer: notification.footer || "Meridian",
         footer_icon: "https://meridian.app/meridian-logomark.png",
         ts: notification.timestamp ? Math.floor(notification.timestamp.getTime() / 1000) : Math.floor(Date.now() / 1000)
       };

       // Add action buttons if provided
       if (notification.actions && notification.actions.length > 0) {
         attachment.actions = notification.actions.map(action => ({
           type: action.type,
           text: action.text,
           url: action.url,
           value: action.value
         }));
       }

      return await this.sendMessage({
        channel,
        attachments: [attachment]
      });
    } catch (error) {
      logger.error("Failed to send Meridian notification:", error);
      throw error;
    }
  }

  /**
   * Create Slack channel for project
   */
  async createChannel(
    name: string,
    purpose?: string,
    isPrivate: boolean = false
  ): Promise<SlackChannel> {
    try {
      const payload = {
        name: name.toLowerCase().replace(/[^a-z0-9\-_]/g, "-"),
        is_private: isPrivate
      };

      const response = await this.makeRequest("/conversations.create", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      // Set channel purpose if provided
      if (purpose && data.channel) {
        await this.setChannelPurpose(data.channel.id, purpose);
      }
      
      return data.channel;
    } catch (error) {
      logger.error("Failed to create Slack channel:", error);
      throw error;
    }
  }

  /**
   * Set channel purpose/topic
   */
  async setChannelPurpose(channelId: string, purpose: string): Promise<void> {
    try {
      const response = await this.makeRequest("/conversations.setPurpose", {
        method: "POST",
        body: JSON.stringify({
          channel: channelId,
          purpose
        })
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }
    } catch (error) {
      logger.error("Failed to set channel purpose:", error);
      throw error;
    }
  }

  /**
   * Invite users to channel
   */
  async inviteUsersToChannel(channelId: string, userIds: string[]): Promise<void> {
    try {
      const response = await this.makeRequest("/conversations.invite", {
        method: "POST",
        body: JSON.stringify({
          channel: channelId,
          users: userIds.join(",")
        })
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }
    } catch (error) {
      logger.error("Failed to invite users to channel:", error);
      throw error;
    }
  }

  /**
   * Handle Slack webhook events
   */
  static async handleWebhook(
    workspaceId: string,
    payload: SlackWebhookPayload,
    signature: string,
    timestamp: string
  ) {
    try {
      logger.debug(`Processing Slack webhook: ${payload.type}`);

      // Handle URL verification challenge
      if (payload.type === "url_verification") {
        return { challenge: payload.challenge };
      }

      // Handle event callbacks
      if (payload.type === "event_callback" && payload.event) {
        await this.handleSlackEvent(workspaceId, payload.event);
      }

      return { success: true, processed: true };
    } catch (error) {
      logger.error("Failed to handle Slack webhook:", error);
      throw error;
    }
  }

  /**
   * Connect Slack workspace to Meridian
   */
  static async connectWorkspace(
    workspaceId: string,
    userId: string,
    config: {
      botToken: string;
      userToken?: string;
      signingSecret: string;
      teamName?: string;
      teamId?: string;
    }
  ) {
    try {
      // Test Slack connection
      const slack = new SlackIntegration({ 
        botToken: config.botToken,
        userToken: config.userToken,
        signingSecret: config.signingSecret
      });
      
      const testResult = await slack.testConnection();
      
      if (!testResult.success) {
        throw new Error(testResult.error || "Failed to connect to Slack");
      }

      const db = getDatabase();
      
      // Create integration connection
      const integration = await db.insert(integrationConnectionTable).values({
        id: createId(),
        name: `Slack - ${testResult.team?.name || config.teamName || "Workspace"}`,
        provider: "slack",
        workspaceId,
        createdBy: userId,
        config: JSON.stringify({
          teamId: testResult.team?.id || config.teamId,
          teamName: testResult.team?.name || config.teamName,
          teamUrl: testResult.team?.url,
          botId: testResult.team?.bot_id,
          features: {
            channelNotifications: true,
            directMessages: true,
            channelCreation: true,
            fileSharing: true
          }
        }),
        credentials: JSON.stringify({
          botToken: config.botToken,
          userToken: config.userToken,
          signingSecret: config.signingSecret
        }),
        connectionStatus: "connected",
        isActive: true,
        lastConnectedAt: new Date()
      }).returning();

      return {
        success: true,
        integration: integration[0],
        team: testResult.team
      };
    } catch (error) {
      logger.error("Failed to connect Slack workspace:", error);
      throw error;
    }
  }

  /**
   * Send task notification to Slack
   */
  static async sendTaskNotification(
    workspaceId: string,
    taskId: string,
    action: "created" | "updated" | "completed" | "assigned",
    channelId?: string
  ) {
    try {
      const db = getDatabase();
      // Get task details
      const task = await db.select()
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(eq(taskTable.id, taskId));

      if (!task.length) {
        throw new Error("Task not found");
      }

      const taskData = task[0];

      // Get Slack integrations for workspace
      const integrations = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.workspaceId, workspaceId),
            eq(integrationConnectionTable.provider, "slack"),
            eq(integrationConnectionTable.isActive, true)
          )
        );

      for (const integration of integrations) {
        const config = JSON.parse(integration.config);
        const credentials = JSON.parse(integration.credentials || "{}");

        const slack = new SlackIntegration({
          botToken: credentials.botToken,
          userToken: credentials.userToken,
          signingSecret: credentials.signingSecret
        });

        // Determine notification content based on action
        let title: string;
        let message: string;
        let color: string;

        switch (action) {
          case "created":
            title = "New Task Created";
            message = `Task "${taskData.task.title}" has been created in project ${taskData.project.name}`;
            color = "#4CAF50"; // Green
            break;
          case "updated":
            title = "Task Updated";
            message = `Task "${taskData.task.title}" has been updated`;
            color = "#FF9800"; // Orange
            break;
          case "completed":
            title = "Task Completed";
            message = `Task "${taskData.task.title}" has been completed! 🎉`;
            color = "#2196F3"; // Blue
            break;
          case "assigned":
            title = "Task Assigned";
            message = `Task "${taskData.task.title}" has been assigned to ${taskData.task.assigneeEmail}`;
            color = "#9C27B0"; // Purple
            break;
        }

        const fields = [
          { title: "Project", value: taskData.project.name, short: true },
          { title: "Priority", value: taskData.task.priority || "medium", short: true },
          { title: "Status", value: taskData.task.status, short: true },
          { title: "Due Date", value: taskData.task.dueDate ? new Date(taskData.task.dueDate).toLocaleDateString() : "Not set", short: true }
        ];

        if (taskData.task.assigneeEmail) {
          fields.push({ title: "Assignee", value: taskData.task.assigneeEmail, short: true });
        }

        // Send notification
        const targetChannel = channelId || config.defaultChannel || "general";
        
        await slack.sendMeridianNotification(targetChannel, {
          title,
          message,
          color,
          fields,
          actions: [{
            type: "button",
            text: "View Task",
            url: `${process.env.WEB_URL}/dashboard/workspace/${workspaceId}/project/${taskData.project.id}/tasks/${taskId}`
          }],
          footer: `Meridian • ${taskData.project.name}`,
          timestamp: new Date()
        });

        // Update integration metrics
        await db.update(integrationConnectionTable)
          .set({
            totalOperations: integration.totalOperations + 1,
            successfulOperations: integration.successfulOperations + 1,
            lastSyncAt: new Date()
          })
          .where(eq(integrationConnectionTable.id, integration.id));
      }

      return { success: true, notificationsSent: integrations.length };
    } catch (error) {
      logger.error("Failed to send task notification to Slack:", error);
      throw error;
    }
  }

  // Private helper methods
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      "Authorization": `Bearer ${this.botToken}`,
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Meridian-Slack-Integration/1.0"
    };

    return fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
  }

  // Event handlers
  private static async handleSlackEvent(workspaceId: string, event: any) {
    switch (event.type) {
      case "message":
        await this.handleSlackMessage(workspaceId, event);
        break;
      case "channel_created":
        await this.handleChannelCreated(workspaceId, event);
        break;
      case "user_change":
        await this.handleUserChange(workspaceId, event);
        break;
      default:
        logger.debug(`Unhandled Slack event: ${event.type}`);
    }
  }

  private static async handleSlackMessage(workspaceId: string, event: any) {
    // Handle bot commands and mentions
    if (event.text && event.text.toLowerCase().includes("meridian")) {
      logger.debug("Meridian mentioned in Slack message:", event.text);
      // TODO: Implement bot command processing
    }
  }

  private static async handleChannelCreated(workspaceId: string, event: any) {
    logger.debug("New Slack channel created:", event.channel?.name);
    // TODO: Optionally sync with Meridian project channels
  }

  private static async handleUserChange(workspaceId: string, event: any) {
    logger.debug("Slack user profile changed:", event.user?.id);
    // TODO: Sync user profile changes with Meridian
  }
} 
