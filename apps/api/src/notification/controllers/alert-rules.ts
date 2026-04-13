import { getDatabase } from '../../database/connection';
import { alertRules } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../../utils/logger';
import { evaluateRule, triggerAlert, type AlertRule } from '../services/rules/rule-engine';

/**
 * Create a new alert rule
 */
export async function createAlertRule(userEmail: string, data: {
  name: string;
  conditionType: string;
  conditionConfig: any;
  notificationChannels?: string[];
  isActive?: boolean;
}) {
  const db = getDatabase();
  
  try {
    const [rule] = await db
      .insert(alertRules)
      .values({
        id: createId(),
        userEmail,
        name: data.name,
        conditionType: data.conditionType,
        conditionConfig: data.conditionConfig,
        notificationChannels: data.notificationChannels || ['in_app'],
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    logger.info(`Alert rule created: ${rule.id} for ${userEmail}`);
    return rule;
  } catch (error) {
    logger.error('Failed to create alert rule:', error);
    throw new Error('Failed to create alert rule');
  }
}

/**
 * Get all alert rules for a user
 */
export async function getUserAlertRules(userEmail: string) {
  const db = getDatabase();
  
  try {
    const rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.userEmail, userEmail));
    
    return rules;
  } catch (error) {
    logger.error('Failed to get alert rules:', error);
    throw new Error('Failed to get alert rules');
  }
}

/**
 * Get a specific alert rule
 */
export async function getAlertRule(ruleId: string, userEmail: string) {
  const db = getDatabase();
  
  try {
    const [rule] = await db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.id, ruleId),
          eq(alertRules.userEmail, userEmail)
        )
      )
      .limit(1);
    
    if (!rule) {
      throw new Error('Alert rule not found');
    }
    
    return rule;
  } catch (error) {
    logger.error('Failed to get alert rule:', error);
    throw error;
  }
}

/**
 * Update an alert rule
 */
export async function updateAlertRule(
  ruleId: string,
  userEmail: string,
  updates: {
    name?: string;
    conditionType?: string;
    conditionConfig?: any;
    notificationChannels?: string[];
    isActive?: boolean;
  }
) {
  const db = getDatabase();
  
  try {
    const [updated] = await db
      .update(alertRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(alertRules.id, ruleId),
          eq(alertRules.userEmail, userEmail)
        )
      )
      .returning();
    
    if (!updated) {
      throw new Error('Alert rule not found');
    }
    
    logger.info(`Alert rule updated: ${ruleId}`);
    return updated;
  } catch (error) {
    logger.error('Failed to update alert rule:', error);
    throw error;
  }
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(ruleId: string, userEmail: string) {
  const db = getDatabase();
  
  try {
    const [deleted] = await db
      .delete(alertRules)
      .where(
        and(
          eq(alertRules.id, ruleId),
          eq(alertRules.userEmail, userEmail)
        )
      )
      .returning();
    
    if (!deleted) {
      throw new Error('Alert rule not found');
    }
    
    logger.info(`Alert rule deleted: ${ruleId}`);
    return deleted;
  } catch (error) {
    logger.error('Failed to delete alert rule:', error);
    throw error;
  }
}

/**
 * Test an alert rule
 */
export async function testAlertRule(ruleId: string, userEmail: string, workspaceId: string) {
  try {
    const rule = await getAlertRule(ruleId, userEmail);
    
    const shouldTrigger = await evaluateRule(rule as AlertRule, workspaceId);
    
    if (shouldTrigger) {
      await triggerAlert(rule as AlertRule, workspaceId);
      return { triggered: true, message: 'Alert condition met and notification sent' };
    } else {
      return { triggered: false, message: 'Alert condition not met' };
    }
  } catch (error) {
    logger.error('Failed to test alert rule:', error);
    throw error;
  }
}


