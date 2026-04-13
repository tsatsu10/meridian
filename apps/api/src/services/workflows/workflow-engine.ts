/**
 * Workflow Engine Service
 * Core automation engine for workflow execution
 * Phase 3.1 - Workflow Automation Engine
 */

import { getDatabase } from '../../database/connection';
import { workflow, workflowCondition, workflowAction, workflowExecution } from '../../database/schema/workflows';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface ExecutionContext {
  workflowId: string;
  triggeredBy: string;
  triggeredEntityId?: string;
  entityData: any;
  variables: Record<string, any>;
}

interface ConditionEvaluator {
  field: string;
  operator: string;
  value: string;
}

interface ActionExecutor {
  id: string;
  actionType: string;
  actionConfig: unknown;
  order: number | null;
  delaySeconds: number | null;
}

export class WorkflowEngine {
  private getDb() {
    return getDatabase();
  }

  /**
   * Trigger workflows based on event type
   */
  async triggerWorkflows(
    workspaceId: string,
    triggerType: string,
    entityData: any,
    entityId?: string
  ): Promise<void> {
    try {
      // Find all enabled workflows for this trigger type
      const workflows = await this.getDb()
        .select()
        .from(workflow)
        .where(
          and(
            eq(workflow.workspaceId, workspaceId),
            eq(workflow.triggerType, triggerType),
            eq(workflow.isEnabled, true)
          )
        );

      logger.info('Workflows triggered', {
        workspaceId,
        triggerType,
        count: workflows.length,
      });

      // Execute each workflow
      for (const wf of workflows) {
        await this.executeWorkflow({
          workflowId: wf.id,
          triggeredBy: triggerType,
          triggeredEntityId: entityId,
          entityData,
          variables: {},
        });
      }
    } catch (error: any) {
      logger.error('Failed to trigger workflows', {
        error: error.message,
        workspaceId,
        triggerType,
      });
    }
  }

  /**
   * Execute a single workflow
   */
  async executeWorkflow(context: ExecutionContext): Promise<boolean> {
    const startTime = Date.now();
    const executionLog: any[] = [];

    try {
      logger.info('Executing workflow', { workflowId: context.workflowId });

      // Get workflow conditions
      const conditions = await this.getDb()
        .select()
        .from(workflowCondition)
        .where(eq(workflowCondition.workflowId, context.workflowId))
        .orderBy(workflowCondition.order);

      // Evaluate all conditions (AND logic)
      const conditionsPassed = await this.evaluateConditions(
        conditions,
        context.entityData,
        executionLog
      );

      if (!conditionsPassed) {
        logger.info('Workflow conditions not met', { workflowId: context.workflowId });
        
        await this.createExecutionRecord(context, 'skipped', null, startTime, executionLog, 0, 0, 0);
        return false;
      }

      // Get workflow actions
      const actions = await this.getDb()
        .select()
        .from(workflowAction)
        .where(eq(workflowAction.workflowId, context.workflowId))
        .orderBy(workflowAction.order);

      // Execute actions sequentially
      let actionsSucceeded = 0;
      let actionsFailed = 0;

      for (const action of actions) {
        try {
          // Apply delay if specified
          if (action.delaySeconds && action.delaySeconds > 0) {
            await this.delay(action.delaySeconds * 1000);
          }

          await this.executeAction(action, context, executionLog);
          actionsSucceeded++;
        } catch (error: any) {
          logger.error('Action execution failed', {
            actionId: action.id,
            error: error.message,
          });
          actionsFailed++;
          executionLog.push({
            actionId: action.id,
            status: 'failed',
            error: error.message,
          });
        }
      }

      const status = actionsFailed === 0 ? 'success' : actionsSucceeded > 0 ? 'partial' : 'failed';

      // Create execution record
      await this.createExecutionRecord(
        context,
        status,
        null,
        startTime,
        executionLog,
        actions.length,
        actionsSucceeded,
        actionsFailed
      );

      // Update workflow execution count
      await this.getDb()
        .update(workflow)
        .set({
          lastExecutedAt: new Date(),
          executionCount: sql`${workflow.executionCount} + 1`,
        })
        .where(eq(workflow.id, context.workflowId));

      return status === 'success';
    } catch (error: any) {
      logger.error('Workflow execution failed', {
        workflowId: context.workflowId,
        error: error.message,
      });

      await this.createExecutionRecord(
        context,
        'failed',
        error.message,
        startTime,
        executionLog,
        0,
        0,
        0
      );

      return false;
    }
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    conditions: any[],
    entityData: any,
    executionLog: any[]
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, entityData);
      
      executionLog.push({
        conditionId: condition.id,
        field: condition.field,
        operator: condition.operator,
        expectedValue: condition.value,
        actualValue: this.getFieldValue(entityData, condition.field),
        result,
      });

      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: ConditionEvaluator, entityData: any): boolean {
    const fieldValue = this.getFieldValue(entityData, condition.field);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue == expectedValue;
      
      case 'not_equals':
        return fieldValue != expectedValue;
      
      case 'contains':
        return String(fieldValue).includes(expectedValue);
      
      case 'not_contains':
        return !String(fieldValue).includes(expectedValue);
      
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(expectedValue);
      
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(expectedValue);
      
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      
      case 'is_not_empty':
        return fieldValue && fieldValue !== '';
      
      case 'starts_with':
        return String(fieldValue).startsWith(expectedValue);
      
      case 'ends_with':
        return String(fieldValue).endsWith(expectedValue);
      
      case 'regex':
        try {
          const regex = new RegExp(expectedValue);
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      
      default:
        logger.warn('Unknown operator', { operator: condition.operator });
        return false;
    }
  }

  /**
   * Execute a workflow action
   */
  private async executeAction(
    action: ActionExecutor,
    context: ExecutionContext,
    executionLog: any[]
  ): Promise<void> {
    const actionStart = Date.now();

    try {
      switch (action.actionType) {
        case 'update_field':
          await this.executeUpdateField(action.actionConfig, context);
          break;
        
        case 'send_notification':
          await this.executeSendNotification(action.actionConfig, context);
          break;
        
        case 'create_task':
          await this.executeCreateTask(action.actionConfig, context);
          break;
        
        case 'assign_task':
          await this.executeAssignTask(action.actionConfig, context);
          break;
        
        case 'send_email':
          await this.executeSendEmail(action.actionConfig, context);
          break;
        
        case 'send_webhook':
          await this.executeSendWebhook(action.actionConfig, context);
          break;
        
        case 'add_comment':
          await this.executeAddComment(action.actionConfig, context);
          break;
        
        case 'move_task':
          await this.executeMoveTask(action.actionConfig, context);
          break;
        
        default:
          logger.warn('Unknown action type', { actionType: action.actionType });
      }

      executionLog.push({
        actionId: action.id,
        actionType: action.actionType,
        status: 'success',
        duration: Date.now() - actionStart,
      });
    } catch (error: any) {
      executionLog.push({
        actionId: action.id,
        actionType: action.actionType,
        status: 'failed',
        error: error.message,
        duration: Date.now() - actionStart,
      });
      throw error;
    }
  }

  /**
   * Action Executors
   */

  private async executeUpdateField(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would update the entity field
    logger.info('Executing update_field action', { config, context: context.workflowId });
    // TODO: Implement actual field update logic
  }

  private async executeSendNotification(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would send notification via notification service
    logger.info('Executing send_notification action', { config, context: context.workflowId });
    // TODO: Integrate with notification service
  }

  private async executeCreateTask(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would create a new task
    logger.info('Executing create_task action', { config, context: context.workflowId });
    // TODO: Integrate with task service
  }

  private async executeAssignTask(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would assign task to user
    logger.info('Executing assign_task action', { config, context: context.workflowId });
    // TODO: Implement task assignment logic
  }

  private async executeSendEmail(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would send email
    logger.info('Executing send_email action', { config, context: context.workflowId });
    // TODO: Integrate with email service
  }

  private async executeSendWebhook(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would send webhook
    logger.info('Executing send_webhook action', { config, context: context.workflowId });
    // TODO: Integrate with webhook service
  }

  private async executeAddComment(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would add comment
    logger.info('Executing add_comment action', { config, context: context.workflowId });
    // TODO: Integrate with comment service
  }

  private async executeMoveTask(config: any, context: ExecutionContext): Promise<void> {
    // Implementation would move task to different status/project
    logger.info('Executing move_task action', { config, context: context.workflowId });
    // TODO: Implement task move logic
  }

  /**
   * Helper methods
   */

  private getFieldValue(data: any, field: string): any {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async createExecutionRecord(
    context: ExecutionContext,
    status: string,
    error: string | null,
    startTime: number,
    executionLog: any[],
    actionsExecuted: number,
    actionsSucceeded: number,
    actionsFailed: number
  ): Promise<void> {
    await this.getDb().insert(workflowExecution).values({
      workflowId: context.workflowId,
      triggeredBy: context.triggeredBy,
      triggeredEntityId: context.triggeredEntityId,
      status,
      error,
      executionTimeMs: Date.now() - startTime,
      actionsExecuted,
      actionsSucceeded,
      actionsFailed,
      executionLog,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default WorkflowEngine;



