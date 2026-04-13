/**
 * Integration Delivery Service
 * Sends notifications through external platforms (Slack, Teams, etc.)
 */

import { getDatabase } from '../../database/connection';
import { integrations } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { formatForSlack, formatForTeams } from './message-formatter';

interface NotificationData {
  title: string;
  content?: string;
  message?: string;
  type: string;
  priority?: string;
  createdAt?: Date;
}

/**
 * Send notification through active integrations for a user
 */
export async function sendThroughIntegrations(
  userEmail: string,
  workspaceId: string,
  notification: NotificationData
): Promise<{ success: boolean; channels: string[] }> {
  const db = getDatabase();
  const sentChannels: string[] = [];
  
  try {
    // Get all active integrations for this user/workspace
    const userIntegrations = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userEmail, userEmail),
          eq(integrations.workspaceId, workspaceId),
          eq(integrations.isActive, true)
        )
      );
    
    for (const integration of userIntegrations) {
      try {
        if (integration.integrationType === 'slack' && integration.webhookUrl) {
          await sendToSlack(integration.webhookUrl, notification);
          sentChannels.push('slack');
          logger.info(`Notification sent to Slack for ${userEmail}`);
        } else if (integration.integrationType === 'teams' && integration.webhookUrl) {
          await sendToTeams(integration.webhookUrl, notification);
          sentChannels.push('teams');
          logger.info(`Notification sent to Teams for ${userEmail}`);
        }
      } catch (error) {
        logger.error(`Failed to send to ${integration.integrationType}:`, error);
      }
    }
    
    return { success: sentChannels.length > 0, channels: sentChannels };
  } catch (error) {
    logger.error('Failed to send through integrations:', error);
    return { success: false, channels: [] };
  }
}

/**
 * Send notification to Slack
 */
async function sendToSlack(webhookUrl: string, notification: NotificationData): Promise<void> {
  const message = formatForSlack(notification);
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`);
  }
}

/**
 * Send notification to Microsoft Teams
 */
async function sendToTeams(webhookUrl: string, notification: NotificationData): Promise<void> {
  const message = formatForTeams(notification);
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    throw new Error(`Teams webhook failed: ${response.statusText}`);
  }
}


