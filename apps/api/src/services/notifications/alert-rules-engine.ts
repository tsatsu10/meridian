/**
 * Alert Rules Engine
 * Custom notification rules with conditions and actions
 * Phase 2.2 - Smart Notifications System
 */

import { getDatabase } from '../../database/connection';
import { notificationRule } from '../../database/schema/notifications';
import { eq, and, sql } from 'drizzle-orm';
import { NotificationService } from './notification-service';
import { WebhookService } from './webhook-service';
import { logger } from '../logging/logger';

interface RuleCondition {
  field: string; // e.g., 'status', 'priority', 'dueDate', 'assignee'
  operator: string; // e.g., 'equals', 'not_equals', 'contains', 'greater_than', 'less_than'
  value: any;
}

interface RuleAction {
  type: string; // e.g., 'send_notification', 'send_email', 'send_webhook', 'assign_task', 'update_field'
  config: any;
}

interface EvaluateRuleParams {
  ruleId: string;
  entity: any; // The entity being evaluated (task, project, etc.)
  triggerContext: any; // Additional context (actor, changes, etc.)
}

export class AlertRulesEngine {
  private notificationService: NotificationService;
  private webhookService: WebhookService;

  constructor() {
    this.notificationService = new NotificationService();
    this.webhookService = new WebhookService();
  }

  private getDb() {
    return getDatabase();
  }

  /**
   * Create a new alert rule
   */
  async createRule(params: {
    userId: string;
    workspaceId: string;
    name: string;
    description?: string;
    triggerType: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    projectIds?: string[];
  }): Promise<any> {
    try {
      const [rule] = await this.getDb().insert(notificationRule).values({
        userId: params.userId,
        workspaceId: params.workspaceId,
        name: params.name,
        description: params.description,
        triggerType: params.triggerType,
        conditions: params.conditions,
        actions: params.actions,
        projectIds: params.projectIds || null,
        isEnabled: true,
        triggerCount: 0,
      }).returning();

      logger.info('Alert rule created', {
        ruleId: rule.id,
        name: params.name,
      });

      return rule;
    } catch (error: any) {
      logger.error('Failed to create alert rule', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateRule(ruleId: string, updates: any): Promise<any> {
    try {
      const [updated] = await this.getDb()
        .update(notificationRule)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(notificationRule.id, ruleId))
        .returning();

      logger.info('Alert rule updated', { ruleId });
      return updated;
    } catch (error: any) {
      logger.error('Failed to update alert rule', {
        error: error.message,
        ruleId,
      });
      throw error;
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      await this.getDb()
        .delete(notificationRule)
        .where(eq(notificationRule.id, ruleId));

      logger.info('Alert rule deleted', { ruleId });
    } catch (error: any) {
      logger.error('Failed to delete alert rule', {
        error: error.message,
        ruleId,
      });
      throw error;
    }
  }

  /**
   * Get rules for a workspace
   */
  async getWorkspaceRules(workspaceId: string, isEnabled?: boolean): Promise<any[]> {
    try {
      const conditions = [eq(notificationRule.workspaceId, workspaceId)];

      if (isEnabled !== undefined) {
        conditions.push(eq(notificationRule.isEnabled, isEnabled));
      }

      const rules = await this.getDb()
        .select()
        .from(notificationRule)
        .where(and(...conditions));

      return rules;
    } catch (error: any) {
      logger.error('Failed to get workspace rules', {
        error: error.message,
        workspaceId,
      });
      return [];
    }
  }

  /**
   * Evaluate rules for a specific trigger event
   */
  async evaluateTrigger(
    workspaceId: string,
    triggerType: string,
    entity: any,
    triggerContext: any
  ): Promise<void> {
    try {
      // Get all enabled rules for this trigger type
      const rules = await this.getDb()
        .select()
        .from(notificationRule)
        .where(and(
          eq(notificationRule.workspaceId, workspaceId),
          eq(notificationRule.triggerType, triggerType),
          eq(notificationRule.isEnabled, true)
        ));

      for (const rule of rules) {
        try {
          // Check if rule applies to this project
          if (rule.projectIds && Array.isArray(rule.projectIds)) {
            if (entity.projectId && !rule.projectIds.includes(entity.projectId)) {
              continue;
            }
          }

          // Evaluate conditions
          const conditionsMet = this.evaluateConditions(
            rule.conditions as RuleCondition[],
            entity,
            triggerContext
          );

          if (conditionsMet) {
            // Execute actions
            await this.executeActions(
              rule.actions as RuleAction[],
              rule,
              entity,
              triggerContext
            );

            // Update trigger tracking
            await this.getDb()
              .update(notificationRule)
              .set({
                lastTriggeredAt: new Date(),
                triggerCount: sql`${notificationRule.triggerCount} + 1`,
              })
              .where(eq(notificationRule.id, rule.id));

            logger.info('Alert rule triggered', {
              ruleId: rule.id,
              ruleName: rule.name,
            });
          }
        } catch (error: any) {
          logger.error('Failed to evaluate rule', {
            error: error.message,
            ruleId: rule.id,
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to evaluate trigger', {
        error: error.message,
        workspaceId,
        triggerType,
      });
    }
  }

  /**
   * Test a rule without saving or executing
   */
  async testRule(
    conditions: RuleCondition[],
    testEntity: any
  ): Promise<{ passed: boolean; results: any[] }> {
    try {
      const results = [];

      for (const condition of conditions) {
        const result = this.evaluateCondition(condition, testEntity, {});
        results.push({
          condition,
          passed: result,
        });
      }

      const allPassed = results.every((r) => r.passed);

      return { passed: allPassed, results };
    } catch (error: any) {
      logger.error('Failed to test rule', {
        error: error.message,
      });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Evaluate all conditions for a rule
   */
  private evaluateConditions(
    conditions: RuleCondition[],
    entity: any,
    context: any
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always trigger
    }

    return conditions.every((condition) => 
      this.evaluateCondition(condition, entity, context)
    );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    entity: any,
    context: any
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, entity, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      
      case 'not_equals':
        return fieldValue !== condition.value;
      
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(condition.value);
      
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(condition.value);
      
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      
      case 'starts_with':
        return String(fieldValue).startsWith(String(condition.value));
      
      case 'ends_with':
        return String(fieldValue).endsWith(String(condition.value));
      
      case 'matches_regex':
        try {
          const regex = new RegExp(condition.value);
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      
      default:
        logger.warn('Unknown condition operator', { operator: condition.operator });
        return false;
    }
  }

  /**
   * Get field value from entity or context
   */
  private getFieldValue(field: string, entity: any, context: any): any {
    // Support nested fields with dot notation
    const parts = field.split('.');
    let value = entity;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    // Check context if not found in entity
    if (value === undefined && context[field] !== undefined) {
      return context[field];
    }

    return value;
  }

  /**
   * Execute all actions for a triggered rule
   */
  private async executeActions(
    actions: RuleAction[],
    rule: any,
    entity: any,
    context: any
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action, rule, entity, context);
      } catch (error: any) {
        logger.error('Failed to execute action', {
          error: error.message,
          ruleId: rule.id,
          actionType: action.type,
        });
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: RuleAction,
    rule: any,
    entity: any,
    context: any
  ): Promise<void> {
    switch (action.type) {
      case 'send_notification':
        await this.executeSendNotification(action, rule, entity, context);
        break;
      
      case 'send_webhook':
        await this.executeSendWebhook(action, rule, entity, context);
        break;
      
      case 'send_email':
        await this.executeSendEmail(action, rule, entity, context);
        break;
      
      default:
        logger.warn('Unknown action type', { actionType: action.type });
    }
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotification(
    action: RuleAction,
    rule: any,
    entity: any,
    context: any
  ): Promise<void> {
    const config = action.config || {};
    
    // Determine recipients
    const recipients = config.recipients || [rule.userId];

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        userId,
        workspaceId: rule.workspaceId,
        type: 'custom',
        title: this.interpolateTemplate(config.title || 'Alert triggered', entity, context),
        message: this.interpolateTemplate(config.message || '', entity, context),
        entityType: entity.entityType || 'custom',
        entityId: entity.id,
        actorId: context.actorId,
        actorName: context.actorName,
        priority: config.priority || 'normal',
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
        },
      });
    }
  }

  /**
   * Execute send webhook action
   */
  private async executeSendWebhook(
    action: RuleAction,
    rule: any,
    entity: any,
    context: any
  ): Promise<void> {
    const config = action.config || {};
    
    await this.webhookService.broadcastToWorkspace(
      rule.workspaceId,
      'custom',
      {
        title: this.interpolateTemplate(config.title || 'Alert triggered', entity, context),
        message: this.interpolateTemplate(config.message || '', entity, context),
        url: config.url,
        priority: config.priority || 'normal',
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          entity,
        },
      }
    );
  }

  /**
   * Execute send email action
   */
  private async executeSendEmail(
    action: RuleAction,
    rule: any,
    entity: any,
    context: any
  ): Promise<void> {
    const config = action.config || {};
    
    // This would integrate with EmailService
    logger.info('Send email action triggered', {
      ruleId: rule.id,
      recipients: config.recipients,
    });
  }

  /**
   * Interpolate template strings with entity/context data
   */
  private interpolateTemplate(template: string, entity: any, context: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const value = this.getFieldValue(key.trim(), entity, context);
      return value !== undefined ? String(value) : '';
    });
  }
}

export default AlertRulesEngine;



