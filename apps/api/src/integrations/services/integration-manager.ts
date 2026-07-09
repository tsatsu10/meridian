/**
 * 🔌 Integration Manager Service - Core integration orchestration
 * 
 * Manages all third-party integrations, handles events, and coordinates
 * between different integration providers.
 * 
 * @epic-3.2-integrations
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import logger from '../../utils/logger';
import { parseIntegrationJsonField } from "../../lib/parse-integration-json";
import { 
  integrationConnectionTable, 
  webhookEndpointTable,
  apiKeyTable,
  workflowTemplateTable,
  automationRuleTable
} from "../../database/schema";

// Integration event types
export interface IntegrationEvent {
  type: string;
  provider: string;
  workspaceId: string;
  payload: Record<string, any>;
  timestamp: Date;
}

// Integration configuration
export interface IntegrationConfig {
  provider: string;
  name: string;
  config: Record<string, any>;
  credentials?: Record<string, any>;
}

// Integration health status
export interface IntegrationHealth {
  id: string;
  provider: string;
  name: string;
  status: "healthy" | "warning" | "error" | "disconnected";
  lastCheck: Date;
  message?: string;
  metrics?: {
    totalOperations: number;
    successRate: number;
    lastOperation: Date;
  };
}

export class IntegrationManager {
  private static instance: IntegrationManager;
  private integrations: Map<string, any> = new Map();
  
  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Create a new integration connection
   */
  static async createIntegration(
    workspaceId: string,
    userId: string,
    config: IntegrationConfig
  ) {
    const db = getDatabase();
    
    try {
      // Validate provider
      const supportedProviders = ["github", "slack", "email", "webhook", "discord", "jira", "ipstack", "openweathermap", "unsplash"];
      if (!supportedProviders.includes(config.provider)) {
        throw new Error(`Unsupported provider: ${config.provider}`);
      }

      // Create integration record
      const integration = await db.insert(integrationConnectionTable).values({
        id: createId(),
        name: config.name,
        provider: config.provider,
        workspaceId,
        createdBy: userId,
        config: JSON.stringify(config.config),
        credentials: config.credentials ? JSON.stringify(config.credentials) : null,
        status: "pending",
        syncStatus: "pending"
      }).returning();

      // Initialize provider-specific integration
      await this.initializeProvider(integration[0]);

      return integration[0];
    } catch (error) {
      logger.error("Failed to create integration:", error);
      throw error;
    }
  }

  /**
   * Get integrations for a workspace
   */
  static async getIntegrations(workspaceId: string, provider?: string) {
    const db = getDatabase();
    
    try {
      let conditions = [eq(integrationConnectionTable.workspaceId, workspaceId)];
      
      if (provider) {
        conditions.push(eq(integrationConnectionTable.provider, provider));
      }

      const integrations = await db.select()
        .from(integrationConnectionTable)
        .where(and(...conditions))
        .orderBy(desc(integrationConnectionTable.createdAt));

      // Parse JSON fields and remove sensitive credentials
      return integrations.map(integration => ({
        ...integration,
        config: parseIntegrationJsonField(integration.config),
        credentials: null, // Never return credentials
        hasCredentials: !!integration.credentials
      }));
    } catch (error) {
      logger.error("Failed to get integrations:", error);
      throw error;
    }
  }

  /**
   * Update integration configuration
   */
  static async updateIntegration(
    integrationId: string,
    workspaceId: string,
    updates: Partial<IntegrationConfig>
  ) {
    const db = getDatabase();
    
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.config) updateData.config = JSON.stringify(updates.config);
      if (updates.credentials) updateData.credentials = JSON.stringify(updates.credentials);
      
      updateData.updatedAt = new Date();

      const integration = await db.update(integrationConnectionTable)
        .set(updateData)
        .where(
          and(
            eq(integrationConnectionTable.id, integrationId),
            eq(integrationConnectionTable.workspaceId, workspaceId)
          )
        )
        .returning();

      if (!integration.length) {
        throw new Error("Integration not found");
      }

      // Reinitialize provider if config changed
      if (updates.config || updates.credentials) {
        await this.initializeProvider(integration[0]);
      }

      return integration[0];
    } catch (error) {
      logger.error("Failed to update integration:", error);
      throw error;
    }
  }

  /**
   * Delete integration
   */
  static async deleteIntegration(integrationId: string, workspaceId: string) {
    const db = getDatabase();
    
    try {
      // Get integration first to clean up provider-specific resources
      const integration = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.id, integrationId),
            eq(integrationConnectionTable.workspaceId, workspaceId)
          )
        );

      if (!integration.length) {
        throw new Error("Integration not found");
      }

      // Clean up provider-specific resources
      await this.cleanupProvider(integration[0]);

      // Delete the integration
      await db.delete(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.id, integrationId),
            eq(integrationConnectionTable.workspaceId, workspaceId)
          )
        );

      return { success: true };
    } catch (error) {
      logger.error("Failed to delete integration:", error);
      throw error;
    }
  }

  /**
   * Test integration connection
   */
  static async testIntegration(integrationId: string, workspaceId: string) {
    const db = getDatabase();
    
    try {
      const integration = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.id, integrationId),
            eq(integrationConnectionTable.workspaceId, workspaceId)
          )
        );

      if (!integration.length) {
        throw new Error("Integration not found");
      }

      // Test provider-specific connection
      const testResult = await this.testProvider(integration[0]);
      const testErr =
        "error" in testResult && typeof testResult.error === "string"
          ? testResult.error
          : null;

      await db.update(integrationConnectionTable)
        .set({
          status: testResult.success ? "active" : "error",
          syncStatus: testResult.success ? "success" : "failed",
          lastSync: testResult.success ? new Date() : null,
          errorMessage: testErr,
          updatedAt: new Date()
        })
        .where(eq(integrationConnectionTable.id, integrationId));

      return testResult;
    } catch (error) {
      logger.error("Failed to test integration:", error);
      throw error;
    }
  }

  /**
   * Send event to integration
   */
  static async sendEvent(event: IntegrationEvent) {
    const db = getDatabase();
    
    try {
      // Get active integrations for this workspace and provider
      const integrations = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.workspaceId, event.workspaceId),
            eq(integrationConnectionTable.provider, event.provider),
            eq(integrationConnectionTable.status, "active")
          )
        );

      const results = [];

      for (const integration of integrations) {
        try {
          const result = await this.sendProviderEvent(integration, event);
          results.push({
            integrationId: integration.id,
            success: true,
            result
          });

          await db.update(integrationConnectionTable)
            .set({
              lastSync: new Date(),
              syncStatus: "success",
              errorMessage: null
            })
            .where(eq(integrationConnectionTable.id, integration.id));

        } catch (error) {
          results.push({
            integrationId: integration.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });

          await db.update(integrationConnectionTable)
            .set({
              lastSync: new Date(),
              syncStatus: "failed",
              errorMessage: error instanceof Error ? error.message : "Unknown error"
            })
            .where(eq(integrationConnectionTable.id, integration.id));
        }
      }

      return results;
    } catch (error) {
      logger.error("Failed to send integration event:", error);
      throw error;
    }
  }

  /**
   * Handle incoming webhook
   */
  static async handleWebhook(webhookId: string, payload: any, headers: Record<string, string>) {
    const db = getDatabase();
    
    try {
      // Get webhook endpoint
      const webhook = await db.select()
        .from(webhookEndpointTable)
        .where(eq(webhookEndpointTable.id, webhookId));

      if (!webhook.length) {
        throw new Error("Webhook not found");
      }

      const webhookConfig = webhook[0];
      if (!webhookConfig) {
        throw new Error("Webhook not found");
      }

      if (webhookConfig.secret) {
        const isValid = await this.verifyWebhookSignature(
          webhookConfig.secret,
          JSON.stringify(payload),
          headers
        );
        
        if (!isValid) {
          throw new Error("Invalid webhook signature");
        }
      }

      const result = await this.processWebhook(webhookConfig, payload);

      await db.update(webhookEndpointTable)
        .set({
          lastTriggered: new Date(),
          updatedAt: new Date()
        })
        .where(eq(webhookEndpointTable.id, webhookId));

      return result;
    } catch (error) {
      const webhook = await db.select()
        .from(webhookEndpointTable)
        .where(eq(webhookEndpointTable.id, webhookId));

      const row = webhook[0];
      if (row) {
        await db.update(webhookEndpointTable)
          .set({
            lastTriggered: new Date(),
            failureCount: (row.failureCount ?? 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(webhookEndpointTable.id, webhookId));
      }

      logger.error("Failed to handle webhook:", error);
      throw error;
    }
  }

  /**
   * Get integration analytics
   */
  static async getAnalytics(workspaceId: string) {
    const db = getDatabase();
    
    try {
      const [integrations, webhooks, automationRules] = await Promise.all([
        // Integration count by provider
        db.select({
          provider: integrationConnectionTable.provider,
          count: count()
        })
        .from(integrationConnectionTable)
        .where(eq(integrationConnectionTable.workspaceId, workspaceId))
        .groupBy(integrationConnectionTable.provider),

        // Webhook statistics
        db.select({
          count: count(),
          failureSum: sql<number>`coalesce(sum(${webhookEndpointTable.failureCount}), 0)`
        })
        .from(webhookEndpointTable)
        .where(eq(webhookEndpointTable.workspaceId, workspaceId)),

        // Automation rules using integrations
        db.select({ count: count() })
        .from(automationRuleTable)
        .where(
          and(
            eq(automationRuleTable.workspaceId, workspaceId),
            eq(automationRuleTable.isActive, true)
          )
        )
      ]);

      return {
        integrations: {
          total: integrations.reduce((sum, i) => sum + i.count, 0),
          byProvider: integrations,
          totalOperations: integrations.reduce((sum, i) => sum + i.count, 0),
          successRate: this.calculateSuccessRate(integrations)
        },
        webhooks: {
          total: webhooks[0]?.count || 0,
          totalFailures: Number(webhooks[0]?.failureSum ?? 0),
          successRate: this.calculateWebhookSuccessRate(webhooks)
        },
        automation: {
          activeRules: automationRules[0]?.count || 0
        }
      };
    } catch (error) {
      logger.error("Failed to get integration analytics:", error);
      throw error;
    }
  }

  /**
   * Check health of all integrations
   */
  static async checkHealth(workspaceId: string): Promise<IntegrationHealth[]> {
    const db = getDatabase();
    
    try {
      const integrations = await db.select()
        .from(integrationConnectionTable)
        .where(eq(integrationConnectionTable.workspaceId, workspaceId));

      const healthChecks = await Promise.all(
        integrations.map(async (integration) => {
          try {
            const testResult = await this.testProvider(integration);
            
            const errMsg =
              "error" in testResult && typeof testResult.error === "string"
                ? testResult.error
                : undefined;
            return {
              id: integration.id,
              provider: integration.provider,
              name: integration.name,
              status: testResult.success ? "healthy" : "error",
              lastCheck: new Date(),
              message: errMsg || "Integration is healthy",
              metrics: {
                totalOperations: 0,
                successRate: this.calculateIntegrationSuccessRate(integration),
                lastOperation: integration.lastSync ?? integration.createdAt
              }
            } as IntegrationHealth;
          } catch (error) {
            return {
              id: integration.id,
              provider: integration.provider,
              name: integration.name,
              status: "error",
              lastCheck: new Date(),
              message: error instanceof Error ? error.message : "Health check failed",
              metrics: {
                totalOperations: 0,
                successRate: this.calculateIntegrationSuccessRate(integration),
                lastOperation: integration.lastSync ?? integration.createdAt
              }
            } as IntegrationHealth;
          }
        })
      );

      return healthChecks;
    } catch (error) {
      logger.error("Failed to check integration health:", error);
      throw error;
    }
  }

  // Private helper methods
  private static async initializeProvider(integration: any) {
    // Provider-specific initialization logic
    // This will be implemented for each provider
    logger.debug(`Initializing ${integration.provider} integration:`, integration.name);
  }

  private static async cleanupProvider(integration: any) {
    // Provider-specific cleanup logic
    logger.debug(`Cleaning up ${integration.provider} integration:`, integration.name);
  }

  private static async testProvider(integration: any) {
    // Provider-specific testing logic
    // This will be implemented for each provider
    return { success: true };
  }

  private static async sendProviderEvent(integration: any, event: IntegrationEvent) {
    // Provider-specific event sending logic
    // This will be implemented for each provider
    return { sent: true };
  }

  private static async processWebhook(webhook: any, payload: any) {
    // Process webhook based on integration type
    logger.debug(`Processing webhook for integration:`, webhook.integrationId);
    return { processed: true };
  }

  private static async verifyWebhookSignature(
    secret: string, 
    payload: string, 
    headers: Record<string, string>
  ): Promise<boolean> {
    // Implement webhook signature verification
    // This will vary by provider (GitHub, Slack, etc.)
    return true;
  }

  private static calculateSuccessRate(
    integrations: { count: number; provider: string }[]
  ): number {
    const total = integrations.reduce((sum, i) => sum + i.count, 0);
    return total > 0 ? 100 : 0;
  }

  private static calculateWebhookSuccessRate(
    webhooks: { count: number; failureSum: number }[]
  ): number {
    const row = webhooks[0];
    if (!row || row.count === 0) return 0;
    return row.failureSum === 0 ? 100 : 0;
  }

  private static calculateIntegrationSuccessRate(integration: {
    syncStatus?: string | null;
  }): number {
    return integration.syncStatus === "success" ? 100 : 0;
  }
}

// Export event broadcasting function
export async function broadcastIntegrationEvent(event: IntegrationEvent) {
  return await IntegrationManager.sendEvent(event);
} 
