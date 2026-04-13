/**
 * Get Automation Settings Controller
 * Retrieves workspace-level automation configuration
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable } from "../../database/schema";

export interface AutomationSettings {
  // Global Settings
  automationEnabled: boolean;
  allowUserAutomation: boolean;
  maxRulesPerUser: number;
  maxActionsPerRule: number;
  
  // Workflow Settings
  workflowExecutionTimeout: number; // seconds
  maxConcurrentWorkflows: number;
  retryFailedWorkflows: boolean;
  maxRetryAttempts: number;
  retryDelayMinutes: number;
  
  // Notification Settings
  notifyOnWorkflowStart: boolean;
  notifyOnWorkflowComplete: boolean;
  notifyOnWorkflowError: boolean;
  errorNotificationRecipients: string[];
  
  // Execution Limits
  dailyExecutionLimit: number | null;
  monthlyExecutionLimit: number | null;
  executionHistoryRetentionDays: number;
  
  // Rule Priorities
  allowRulePriorities: boolean;
  defaultRulePriority: number;
  
  // Advanced Settings
  enableDebugMode: boolean;
  logExecutionDetails: boolean;
  allowExternalWebhooks: boolean;
  webhookTimeout: number; // seconds
  allowAPIIntegrations: boolean;
  requireApprovalForDestructive: boolean;
}

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  automationEnabled: true,
  allowUserAutomation: true,
  maxRulesPerUser: 50,
  maxActionsPerRule: 10,
  workflowExecutionTimeout: 300,
  maxConcurrentWorkflows: 10,
  retryFailedWorkflows: true,
  maxRetryAttempts: 3,
  retryDelayMinutes: 5,
  notifyOnWorkflowStart: false,
  notifyOnWorkflowComplete: true,
  notifyOnWorkflowError: true,
  errorNotificationRecipients: [],
  dailyExecutionLimit: null,
  monthlyExecutionLimit: null,
  executionHistoryRetentionDays: 90,
  allowRulePriorities: true,
  defaultRulePriority: 5,
  enableDebugMode: false,
  logExecutionDetails: true,
  allowExternalWebhooks: true,
  webhookTimeout: 30,
  allowAPIIntegrations: true,
  requireApprovalForDestructive: true,
};

export default async function getAutomationSettings(
  workspaceId: string
): Promise<AutomationSettings> {
  const db = getDatabase();
  
  // Get workspace
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  // Get automation settings from workspace settings JSONB
  const storedSettings = (workspace.settings as any) || {};
  const automationSettings = storedSettings.automation || {};
  
  // Merge with defaults
  return { ...DEFAULT_AUTOMATION_SETTINGS, ...automationSettings };
}


