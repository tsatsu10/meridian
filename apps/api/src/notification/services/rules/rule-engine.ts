/**
 * Rule Engine
 * Evaluates alert rules and triggers notifications when conditions are met
 */

import { getDatabase } from '../../../database/connection';
import { alertRules, tasks, projects, notifications } from '../../../database/schema';
import { eq, and, gte, lte, count, desc } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import createNotification from '../../controllers/create-notification';
import { sendThroughIntegrations } from '../../../integrations/services/integration-delivery';

export interface RuleCondition {
  type: 'project_progress' | 'task_overdue' | 'mention' | 'keyword' | 'task_count' | 'no_activity';
  config: {
    // For project_progress
    projectId?: string;
    threshold?: number; // percentage
    operator?: 'above' | 'below' | 'equals';
    
    // For task_overdue
    daysOverdue?: number;
    
    // For mention
    keywords?: string[];
    
    // For keyword
    searchText?: string;
    searchIn?: ('title' | 'content' | 'comments')[];
    
    // For task_count
    status?: string;
    countThreshold?: number;
    countOperator?: 'above' | 'below' | 'equals';
    
    // For no_activity
    inactivityDays?: number;
  };
}

export interface AlertRule {
  id: string;
  userEmail: string;
  name: string;
  conditionType: string;
  conditionConfig: RuleCondition['config'];
  notificationChannels: string[];
  isActive: boolean;
}

/**
 * Evaluate a single rule
 */
export async function evaluateRule(rule: AlertRule, workspaceId: string): Promise<boolean> {
  const db = getDatabase();
  
  try {
    switch (rule.conditionType) {
      case 'project_progress':
        return await evaluateProjectProgress(db, rule, workspaceId);
      
      case 'task_overdue':
        return await evaluateTaskOverdue(db, rule, workspaceId);
      
      case 'task_count':
        return await evaluateTaskCount(db, rule, workspaceId);
      
      case 'no_activity':
        return await evaluateNoActivity(db, rule, workspaceId);
      
      default:
        logger.warn(`Unknown rule type: ${rule.conditionType}`);
        return false;
    }
  } catch (error) {
    logger.error(`Failed to evaluate rule ${rule.id}:`, error);
    return false;
  }
}

/**
 * Evaluate project progress condition
 */
async function evaluateProjectProgress(db: any, rule: AlertRule, workspaceId: string): Promise<boolean> {
  const { projectId, threshold = 50, operator = 'below' } = rule.conditionConfig;
  
  if (!projectId) return false;
  
  try {
    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (!project) return false;
    
    // Calculate progress
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    if (allTasks.length === 0) return false;
    
    const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
    const progress = (completedTasks / allTasks.length) * 100;
    
    // Check condition
    switch (operator) {
      case 'above':
        return progress > threshold;
      case 'below':
        return progress < threshold;
      case 'equals':
        return Math.abs(progress - threshold) < 1;
      default:
        return false;
    }
  } catch (error) {
    logger.error('Failed to evaluate project progress:', error);
    return false;
  }
}

/**
 * Evaluate task overdue condition
 */
async function evaluateTaskOverdue(db: any, rule: AlertRule, workspaceId: string): Promise<boolean> {
  const { daysOverdue = 1 } = rule.conditionConfig;
  
  try {
    const now = new Date();
    const overdueDate = new Date(now.getTime() - daysOverdue * 24 * 60 * 60 * 1000);
    
    const overdueTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assignee, rule.userEmail),
          lte(tasks.dueDate, overdueDate)
        )
      );
    
    return overdueTasks.length > 0;
  } catch (error) {
    logger.error('Failed to evaluate task overdue:', error);
    return false;
  }
}

/**
 * Evaluate task count condition
 */
async function evaluateTaskCount(db: any, rule: AlertRule, workspaceId: string): Promise<boolean> {
  const { status = 'pending', countThreshold = 10, countOperator = 'above' } = rule.conditionConfig;
  
  try {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assignee, rule.userEmail),
          eq(tasks.status, status)
        )
      );
    
    const taskCount = userTasks.length;
    
    switch (countOperator) {
      case 'above':
        return taskCount > countThreshold;
      case 'below':
        return taskCount < countThreshold;
      case 'equals':
        return taskCount === countThreshold;
      default:
        return false;
    }
  } catch (error) {
    logger.error('Failed to evaluate task count:', error);
    return false;
  }
}

/**
 * Evaluate no activity condition
 */
async function evaluateNoActivity(db: any, rule: AlertRule, workspaceId: string): Promise<boolean> {
  const { inactivityDays = 7 } = rule.conditionConfig;
  
  try {
    const inactivityDate = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
    
    // Check for recent task updates
    const recentTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assignee, rule.userEmail),
          gte(tasks.updatedAt, inactivityDate)
        )
      );
    
    // No activity if no recent task updates
    return recentTasks.length === 0;
  } catch (error) {
    logger.error('Failed to evaluate no activity:', error);
    return false;
  }
}

/**
 * Trigger alert for a rule
 */
export async function triggerAlert(rule: AlertRule, workspaceId: string): Promise<void> {
  logger.info(`Triggering alert for rule ${rule.name} (${rule.id})`);
  
  try {
    // Create notification message based on rule type
    const message = generateAlertMessage(rule);
    
    // Send notifications through configured channels
    for (const channel of rule.notificationChannels) {
      if (channel === 'in_app') {
        await createNotification({
          userEmail: rule.userEmail,
          title: `Alert: ${rule.name}`,
          content: message,
          type: 'alert',
          priority: 'high',
        });
      } else if (channel === 'email' || channel === 'slack' || channel === 'teams') {
        // Send through integrations
        await sendThroughIntegrations(rule.userEmail, workspaceId, {
          title: `Alert: ${rule.name}`,
          message,
          type: 'alert',
          priority: 'high',
          createdAt: new Date(),
        });
      }
    }
    
    logger.info(`Alert triggered successfully for rule ${rule.id}`);
  } catch (error) {
    logger.error(`Failed to trigger alert for rule ${rule.id}:`, error);
  }
}

/**
 * Generate alert message based on rule
 */
function generateAlertMessage(rule: AlertRule): string {
  switch (rule.conditionType) {
    case 'project_progress':
      const { threshold, operator, projectId } = rule.conditionConfig;
      return `Project progress is ${operator} ${threshold}% (Project: ${projectId})`;
    
    case 'task_overdue':
      const { daysOverdue } = rule.conditionConfig;
      return `You have tasks overdue by ${daysOverdue} days`;
    
    case 'task_count':
      const { status, countThreshold, countOperator } = rule.conditionConfig;
      return `You have ${countOperator} ${countThreshold} ${status} tasks`;
    
    case 'no_activity':
      const { inactivityDays } = rule.conditionConfig;
      return `No activity detected for ${inactivityDays} days`;
    
    case 'mention':
      return 'You were mentioned in a notification';
    
    case 'keyword':
      return `Keyword detected: ${rule.conditionConfig.searchText}`;
    
    default:
      return `Alert triggered: ${rule.name}`;
  }
}

/**
 * Evaluate all active rules for all users
 * Called by scheduler
 */
export async function evaluateAllRules(): Promise<void> {
  const db = getDatabase();
  
  try {
    logger.info('Evaluating all active alert rules...');
    
    const activeRules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.isActive, true));
    
    logger.info(`Found ${activeRules.length} active rules to evaluate`);
    
    for (const rule of activeRules) {
      try {
        // Assume workspaceId from rule or fetch from user
        const workspaceId = 'default'; // TODO: Get from user context
        
        const shouldTrigger = await evaluateRule(rule as AlertRule, workspaceId);
        
        if (shouldTrigger) {
          await triggerAlert(rule as AlertRule, workspaceId);
        }
      } catch (error) {
        logger.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }
    
    logger.info('Finished evaluating all alert rules');
  } catch (error) {
    logger.error('Failed to evaluate rules:', error);
  }
}


