/**
 * 🤖 Workflow Engine Service - Core automation execution engine
 * 
 * Handles workflow template execution, instance management, and automation logic.
 * Supports triggers, conditions, actions, and error handling.
 * 
 * @epic-3.1-automation-engine
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../../database/connection";
import {
  workflowTemplateTable,
  workflowInstanceTable,
  workflowExecutionTable,
  automationRuleTable,
  taskTable,
  projectTable,
  notificationTable,
  userTable,
} from "../../database/schema";
import { eq, and, desc, count } from "drizzle-orm";

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
type TaskStatusValue = (typeof TASK_STATUSES)[number];

function toTaskStatus(value: unknown): TaskStatusValue {
  const s = typeof value === "string" ? value : "";
  return TASK_STATUSES.includes(s as TaskStatusValue)
    ? (s as TaskStatusValue)
    : "todo";
}

const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
type PriorityValue = (typeof PRIORITY_VALUES)[number];

function toTaskPriority(value: unknown): PriorityValue {
  const s = typeof value === "string" ? value : "";
  return PRIORITY_VALUES.includes(s as PriorityValue)
    ? (s as PriorityValue)
    : "medium";
}

// Workflow configuration types
export interface TriggerConfig {
  type: string; // task_created, task_status_changed, task_assigned, due_date_approaching, etc.
  conditions?: Record<string, any>;
  projectIds?: string[];
  taskIds?: string[];
}

export interface ActionConfig {
  type: string; // send_notification, create_task, update_task, assign_task, etc.
  config: Record<string, any>;
  delayMs?: number;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  category: string;
  triggers: TriggerConfig[];
  actions: ActionConfig[];
  conditions?: Record<string, any>;
}

export interface ExecutionContext {
  workspaceId: string;
  userId: string;
  triggerData: Record<string, any>;
  instanceId: string;
}

export class WorkflowEngine {
  /**
   * Create a new workflow template
   */
  static async createTemplate(
    workspaceId: string,
    userId: string,
    definition: WorkflowDefinition
  ) {
    const db = getDatabase();
    const templateId = createId();
    
    const template = await db.insert(workflowTemplateTable).values({
      id: templateId,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      workspaceId,
      createdBy: userId,
      triggerConfig: JSON.stringify(definition.triggers),
      actionConfig: JSON.stringify(definition.actions),
      conditionConfig: definition.conditions ? JSON.stringify(definition.conditions) : null,
      isActive: true
    }).returning();

    return template[0];
  }

  /**
   * Create a workflow instance from a template
   */
  static async createInstance(
    templateId: string,
    workspaceId: string,
    userId: string,
    options: {
      name: string;
      projectId?: string;
      taskId?: string;
      teamId?: string;
      customConfig?: Record<string, any>;
    }
  ) {
    const db = getDatabase();
    const instanceId = createId();
    
    const instance = await db.insert(workflowInstanceTable).values({
      id: instanceId,
      templateId,
      workspaceId,
      projectId: options.projectId ?? null,
      taskId: options.taskId ?? null,
      teamId: options.teamId ?? null,
      name: options.name,
      status: "pending",
      config: options.customConfig ?? null,
      createdBy: userId,
    }).returning();

    return instance[0];
  }

  /**
   * Execute a workflow instance
   */
  static async executeWorkflow(
    instanceId: string,
    triggerEvent: string,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const db = getDatabase();
    const executionId = createId();
    const startTime = Date.now();

    try {
      // Get workflow instance
      const instanceResult = await db.select()
        .from(workflowInstanceTable)
        .where(eq(workflowInstanceTable.id, instanceId));
      
      if (!instanceResult.length) {
        throw new Error(`Workflow instance ${instanceId} not found`);
      }
      
      const instance = instanceResult[0]!;

      const templateId = instance.templateId;
      if (!templateId) {
        throw new Error(`Workflow instance ${instanceId} has no template`);
      }

      const templateResult = await db
        .select()
        .from(workflowTemplateTable)
        .where(eq(workflowTemplateTable.id, templateId));

      if (!templateResult.length) {
        throw new Error(`Workflow template ${templateId} not found`);
      }

      const template = templateResult[0]!;

      await db.insert(workflowExecutionTable).values({
        id: executionId,
        instanceId,
        templateId,
        workspaceId: instance.workspaceId,
        status: "running",
        stepNumber: 0,
        stepName: "workflow_run",
        startedAt: new Date(),
        input: { triggerEvent, triggerData },
      });

      // Parse workflow configuration
      const triggers = JSON.parse(template.triggerConfig) as TriggerConfig[];
      const actions = JSON.parse(template.actionConfig) as ActionConfig[];
      const conditions = template.conditionConfig 
        ? JSON.parse(template.conditionConfig) 
        : null;

      // Check if trigger matches
      const triggerMatches = triggers.some(trigger => 
        this.matchesTrigger(trigger, triggerEvent, triggerData)
      );

      if (!triggerMatches) {
        await this.updateExecution(executionId, {
          status: "skipped",
          completedAt: new Date(),
          duration: Date.now() - startTime,
          output: { skipped: true, reason: "Trigger not matched" },
        });
        return { success: true, skipped: true };
      }

      // Check additional conditions
      if (conditions && !this.evaluateConditions(conditions, triggerData, context)) {
        await this.updateExecution(executionId, {
          status: "skipped",
          completedAt: new Date(),
          duration: Date.now() - startTime,
          output: { skipped: true, reason: "Conditions not met" },
        });
        return { success: true, skipped: true };
      }

      // Execute actions
      const actionResults = [];
      let actionsExecuted = 0;
      let actionsSuccessful = 0;
      let actionsFailed = 0;

      for (const action of actions) {
        try {
          actionsExecuted++;
          
          // Add delay if specified
          if (action.delayMs && action.delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, action.delayMs));
          }

          const result = await this.executeAction(action, triggerData, context);
          actionResults.push({ action: action.type, success: true, result });
          actionsSuccessful++;
        } catch (error) {
          actionResults.push({ 
            action: action.type, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
          actionsFailed++;
        }
      }

      const endTime = Date.now();
      await this.updateExecution(executionId, {
        status: actionsFailed > 0 ? "failed" : "success",
        completedAt: new Date(),
        duration: endTime - startTime,
        output: actionResults,
        metadata: {
          trigger: triggerEvent,
          triggerData,
          actionsExecuted,
          actionsSuccessful,
          actionsFailed,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        },
      });

      await db
        .update(workflowInstanceTable)
        .set({ updatedAt: new Date() })
        .where(eq(workflowInstanceTable.id, instanceId));

      await db
        .update(workflowTemplateTable)
        .set({
          usageCount: (template.usageCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(workflowTemplateTable.id, templateId));

      return {
        success: true,
        executionId,
        actionsExecuted,
        actionsSuccessful,
        actionsFailed,
        results: actionResults
      };

    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : undefined;
      await this.updateExecution(executionId, {
        status: "failed",
        completedAt: new Date(),
        duration: Date.now() - startTime,
        error: stack ? `${message}\n${stack}` : message,
      });

      throw error;
    }
  }

  /**
   * Check if trigger configuration matches the event
   */
  private static matchesTrigger(
    trigger: TriggerConfig, 
    eventType: string, 
    eventData: Record<string, any>
  ): boolean {
    if (trigger.type !== eventType) {
      return false;
    }

    // Check project filtering
    if (trigger.projectIds && eventData.projectId) {
      if (!trigger.projectIds.includes(eventData.projectId)) {
        return false;
      }
    }

    // Check task filtering
    if (trigger.taskIds && eventData.taskId) {
      if (!trigger.taskIds.includes(eventData.taskId)) {
        return false;
      }
    }

    // Check additional conditions
    if (trigger.conditions) {
      for (const [key, value] of Object.entries(trigger.conditions)) {
        if (eventData[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate workflow conditions
   */
  private static evaluateConditions(
    conditions: Record<string, any>,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ): boolean {
    // Simple condition evaluation - can be extended for complex logic
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = triggerData[key] || context[key as keyof ExecutionContext];
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * Execute a specific action
   */
  private static async executeAction(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    switch (action.type) {
      // Core actions
      case "send_notification":
        return await this.executeSendNotification(action, triggerData, context);
      
      case "create_task":
        return await this.executeCreateTask(action, triggerData, context);
      
      case "update_task":
        return await this.executeUpdateTask(action, triggerData, context);
      
      case "assign_task":
        return await this.executeAssignTask(action, triggerData, context);
      
      case "change_task_status":
        return await this.executeChangeTaskStatus(action, triggerData, context);
      
      // @epic-3.2-integrations: Integration actions
      case "github_create_issue":
        return await this.executeGitHubCreateIssue(action, triggerData, context);
      
      case "github_update_issue":
        return await this.executeGitHubUpdateIssue(action, triggerData, context);
      
      case "slack_send_message":
        return await this.executeSlackSendMessage(action, triggerData, context);
      
      case "email_send":
        return await this.executeEmailSend(action, triggerData, context);
      
      case "webhook_call":
        return await this.executeWebhookCall(action, triggerData, context);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /** Used by the visual workflow engine to run a single action with the core executor. */
  static async dispatchVisualAction(
    actionType: string,
    config: Record<string, any>,
    triggerData: Record<string, any>,
    context: ExecutionContext,
  ) {
    const action: ActionConfig = { type: actionType, config };
    return this.executeAction(action, triggerData, context);
  }

  /**
   * Action: Send notification
   */
  private static async executeSendNotification(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext,
  ) {
    const db = getDatabase();
    const {
      title,
      content,
      userEmail: configEmail,
      type = "automation",
    } = action.config;
    const rawEmail =
      (configEmail as string | undefined) ||
      (triggerData.userEmail as string | undefined);
    if (!rawEmail) {
      throw new Error("userEmail required for send_notification");
    }

    const [recipient] = await db
      .select({ id: userTable.id, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.email, rawEmail))
      .limit(1);
    if (!recipient) {
      throw new Error(`User not found for email ${rawEmail}`);
    }

    const processedTitle = this.replaceVariables(
      String(title ?? ""),
      triggerData,
      context,
    );
    const processedContent = this.replaceVariables(
      String(content ?? ""),
      triggerData,
      context,
    );

    const resourceId =
      (triggerData.taskId as string | undefined) ??
      (triggerData.projectId as string | undefined) ??
      null;

    await db.insert(notificationTable).values({
      userId: recipient.id,
      userEmail: recipient.email,
      title: processedTitle,
      content: processedContent,
      type: String(type),
      resourceId,
      resourceType: triggerData.taskId ? "task" : "project",
    });

    return { notificationSent: true, title: processedTitle };
  }

  /**
   * Action: Create task
   */
  private static async executeCreateTask(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext,
  ) {
    const db = getDatabase();
    const {
      title,
      description,
      projectId: cfgProjectId,
      assigneeEmail,
      priority: cfgPriority,
    } = action.config;

    const resolvedProjectId =
      (cfgProjectId as string | undefined) ??
      (triggerData.projectId as string | undefined);
    if (!resolvedProjectId) {
      throw new Error("projectId required for create_task");
    }

    const processedTitle = this.replaceVariables(
      String(title ?? "Task"),
      triggerData,
      context,
    );
    const processedDescription = description
      ? this.replaceVariables(String(description), triggerData, context)
      : undefined;

    const taskId = createId();
    const email = assigneeEmail as string | undefined;
    let assigneeId: string | null = null;
    let userEmail: string | null = null;
    if (email) {
      const [u] = await db
        .select({ id: userTable.id, email: userTable.email })
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);
      if (u) {
        assigneeId = u.id;
        userEmail = u.email;
      }
    }

    await db.insert(taskTable).values({
      id: taskId,
      title: processedTitle,
      description: processedDescription ?? null,
      projectId: resolvedProjectId,
      assigneeId,
      userEmail,
      status: "todo",
      priority: toTaskPriority(cfgPriority),
    });

    return { taskCreated: true, taskId, title: processedTitle };
  }

  /**
   * Action: Update task
   */
  private static async executeUpdateTask(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const db = getDatabase();
    const { taskId, updates } = action.config;
    const targetTaskId = taskId || triggerData.taskId;
    
    if (!targetTaskId) {
      throw new Error("Task ID required for update action");
    }

    // Process any variable replacements in updates
    const processedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "string") {
        processedUpdates[key] = this.replaceVariables(value, triggerData, context);
      } else {
        processedUpdates[key] = value;
      }
    }

    await db.update(taskTable)
      .set(processedUpdates)
      .where(eq(taskTable.id, targetTaskId));

    return { taskUpdated: true, taskId: targetTaskId, updates: processedUpdates };
  }

  /**
   * Action: Assign task
   */
  private static async executeAssignTask(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const db = getDatabase();
    const { taskId, assigneeEmail } = action.config;
    const targetTaskId = taskId || triggerData.taskId;
    
    if (!targetTaskId) {
      throw new Error("Task ID required for assign action");
    }

    let assigneeId: string | null = null;
    let userEmail: string | null = null;
    if (assigneeEmail) {
      const [u] = await db
        .select({ id: userTable.id, email: userTable.email })
        .from(userTable)
        .where(eq(userTable.email, String(assigneeEmail)))
        .limit(1);
      if (u) {
        assigneeId = u.id;
        userEmail = u.email;
      }
    }

    await db
      .update(taskTable)
      .set({ assigneeId, userEmail })
      .where(eq(taskTable.id, targetTaskId));

    return { taskAssigned: true, taskId: targetTaskId, assigneeEmail };
  }

  /**
   * Action: Change task status
   */
  private static async executeChangeTaskStatus(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const db = getDatabase();
    const { taskId, status } = action.config;
    const targetTaskId = taskId || triggerData.taskId;
    
    if (!targetTaskId) {
      throw new Error("Task ID required for status change action");
    }

    const nextStatus = toTaskStatus(status);
    await db
      .update(taskTable)
      .set({ status: nextStatus })
      .where(eq(taskTable.id, targetTaskId));

    return {
      statusChanged: true,
      taskId: targetTaskId,
      newStatus: nextStatus,
    };
  }

  /**
   * Replace variables in strings
   */
  private static replaceVariables(
    template: string,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ): string {
    let result = template;
    
    // Replace trigger data variables
    for (const [key, value] of Object.entries(triggerData)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    // Replace context variables
    result = result.replace(/{{workspaceId}}/g, context.workspaceId);
    result = result.replace(/{{userId}}/g, context.userId);
    result = result.replace(/{{instanceId}}/g, context.instanceId);
    
    return result;
  }

  /**
   * Update workflow execution record
   */
  private static async updateExecution(
    executionId: string,
    updates: {
      status: string;
      completedAt?: Date;
      duration?: number;
      output?: unknown;
      error?: string | null;
      metadata?: unknown;
    },
  ) {
    const db = getDatabase();
    await db
      .update(workflowExecutionTable)
      .set({
        status: updates.status,
        ...(updates.completedAt !== undefined && {
          completedAt: updates.completedAt,
        }),
        ...(updates.duration !== undefined && { duration: updates.duration }),
        ...(updates.output !== undefined && { output: updates.output }),
        ...(updates.error !== undefined && { error: updates.error }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata }),
      })
      .where(eq(workflowExecutionTable.id, executionId));
  }

  /**
   * Get automation analytics for a workspace
   */
  static async getAnalytics(workspaceId: string) {
    const db = getDatabase();
    const [templates, instances, executions] = await Promise.all([
      // Template count
      db.select({ count: count() })
        .from(workflowTemplateTable)
        .where(eq(workflowTemplateTable.workspaceId, workspaceId)),
      
      // Instance count  
      db.select({ count: count() })
        .from(workflowInstanceTable)
        .where(eq(workflowInstanceTable.workspaceId, workspaceId)),
      
      // Recent executions
      db.select()
        .from(workflowExecutionTable)
        .innerJoin(workflowInstanceTable, eq(workflowExecutionTable.instanceId, workflowInstanceTable.id))
        .where(eq(workflowInstanceTable.workspaceId, workspaceId))
        .orderBy(desc(workflowExecutionTable.startedAt))
        .limit(10)
    ]);

    return {
      totalTemplates: templates[0]?.count ?? 0,
      totalInstances: instances[0]?.count ?? 0,
      totalExecutions: executions.length,
      recentExecutions: executions.map((exec) => {
        const input = exec.workflow_execution.input as {
          triggerEvent?: string;
        } | null;
        return {
          id: exec.workflow_execution.id,
          status: exec.workflow_execution.status,
          triggerEvent: input?.triggerEvent ?? null,
          startedAt: exec.workflow_execution.startedAt,
          completedAt: exec.workflow_execution.completedAt,
          durationMs: exec.workflow_execution.duration,
        };
      }),
    };
  }

  /**
   * Integration Action: Create GitHub issue
   * @epic-3.2-integrations
   */
  private static async executeGitHubCreateIssue(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const { title, body, labels, assignees, repositoryId } = action.config;
    
    const processedTitle = this.replaceVariables(title, triggerData, context);
    const processedBody = this.replaceVariables(body || "", triggerData, context);
    
    // Import integration service dynamically to avoid circular dependencies
    const { broadcastIntegrationEvent } = await import("../../integrations/services/integration-manager.js");
    
    const result = await broadcastIntegrationEvent({
      type: "github_create_issue",
      provider: "github",
      workspaceId: context.workspaceId,
      payload: {
        title: processedTitle,
        body: processedBody,
        labels: labels || [],
        assignees: assignees || [],
        repositoryId
      },
      timestamp: new Date()
    });

    return { githubIssueCreated: true, title: processedTitle, result };
  }

  /**
   * Integration Action: Update GitHub issue
   * @epic-3.2-integrations
   */
  private static async executeGitHubUpdateIssue(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const { issueNumber, updates, repositoryId } = action.config;
    
    // Process variable replacements in updates
    const processedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "string") {
        processedUpdates[key] = this.replaceVariables(value, triggerData, context);
      } else {
        processedUpdates[key] = value;
      }
    }

    const { broadcastIntegrationEvent } = await import("../../integrations/services/integration-manager.js");
    
    const result = await broadcastIntegrationEvent({
      type: "github_update_issue",
      provider: "github",
      workspaceId: context.workspaceId,
      payload: {
        issueNumber,
        updates: processedUpdates,
        repositoryId
      },
      timestamp: new Date()
    });

    return { githubIssueUpdated: true, issueNumber, updates: processedUpdates, result };
  }

  /**
   * Integration Action: Send Slack message
   * @epic-3.2-integrations
   */
  private static async executeSlackSendMessage(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const { channel, text, attachments } = action.config;
    
    const processedText = this.replaceVariables(text, triggerData, context);
    
    const { broadcastIntegrationEvent } = await import("../../integrations/services/integration-manager.js");
    
    const result = await broadcastIntegrationEvent({
      type: "slack_send_message",
      provider: "slack",
      workspaceId: context.workspaceId,
      payload: {
        channel,
        text: processedText,
        attachments: attachments || []
      },
      timestamp: new Date()
    });

    return { slackMessageSent: true, channel, text: processedText, result };
  }

  /**
   * Integration Action: Send email
   * @epic-3.2-integrations
   */
  private static async executeEmailSend(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const { to, subject, template, templateData } = action.config;
    
    const processedSubject = this.replaceVariables(subject, triggerData, context);
    const processedTo = this.replaceVariables(to, triggerData, context);
    
    // Process template data variables
    const processedTemplateData: Record<string, any> = {};
    if (templateData) {
      for (const [key, value] of Object.entries(templateData)) {
        if (typeof value === "string") {
          processedTemplateData[key] = this.replaceVariables(value, triggerData, context);
        } else {
          processedTemplateData[key] = value;
        }
      }
    }

    const { broadcastIntegrationEvent } = await import("../../integrations/services/integration-manager.js");
    
    const result = await broadcastIntegrationEvent({
      type: "email_send",
      provider: "email",
      workspaceId: context.workspaceId,
      payload: {
        to: processedTo,
        subject: processedSubject,
        template,
        templateData: processedTemplateData
      },
      timestamp: new Date()
    });

    return { emailSent: true, to: processedTo, subject: processedSubject, result };
  }

  /**
   * Integration Action: Call webhook
   * @epic-3.2-integrations
   */
  private static async executeWebhookCall(
    action: ActionConfig,
    triggerData: Record<string, any>,
    context: ExecutionContext
  ) {
    const { url, method = "POST", headers = {}, payload } = action.config;
    
    const processedUrl = this.replaceVariables(url, triggerData, context);
    
    // Process payload variables
    let processedPayload = payload;
    if (typeof payload === "string") {
      processedPayload = this.replaceVariables(payload, triggerData, context);
    } else if (typeof payload === "object" && payload !== null) {
      processedPayload = {};
      for (const [key, value] of Object.entries(payload)) {
        if (typeof value === "string") {
          processedPayload[key] = this.replaceVariables(value, triggerData, context);
        } else {
          processedPayload[key] = value;
        }
      }
    }

    const { broadcastIntegrationEvent } = await import("../../integrations/services/integration-manager.js");
    
    const result = await broadcastIntegrationEvent({
      type: "webhook_call",
      provider: "webhook",
      workspaceId: context.workspaceId,
      payload: {
        url: processedUrl,
        method,
        headers,
        payload: processedPayload
      },
      timestamp: new Date()
    });

    return { webhookCalled: true, url: processedUrl, method, result };
  }
} 
