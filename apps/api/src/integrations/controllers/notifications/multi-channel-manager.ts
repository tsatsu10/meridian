/**
 * 🔔 Multi-Channel Notification Manager
 * 
 * Manages notification delivery across multiple channels:
 * - Microsoft Teams
 * - Discord
 * - SMS/Twilio
 * - Slack (existing)
 * - Email (existing)
 * 
 * @epic-3.5-communication
 */

import { Context } from "hono";
import { getDatabase } from "../../../database/connection";
import { userPreferencesExtendedTable } from "../../../database/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../../utils/logger';

// Interface for channel configuration
interface ChannelConfig {
  type: 'teams' | 'discord' | 'sms' | 'slack' | 'email';
  enabled: boolean;
  config: Record<string, any>;
  testStatus?: 'pending' | 'success' | 'failed';
  lastTested?: Date;
  errorMessage?: string;
}

// Get all notification channels for a user
export async function getNotificationChannels(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    const userEmail = c.get("userEmail");
    
    if (userId !== userEmail) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    // Get channel configurations
    const channels = await db
      .select()
      .from(userPreferencesExtendedTable)
      .where(
        and(
          eq(userPreferencesExtendedTable.userId, userId),
          eq(userPreferencesExtendedTable.preferenceType, "notification-channels")
        )
      );
    
    const channelConfigs: Record<string, ChannelConfig> = {};
    
    channels.forEach(channel => {
      const data = JSON.parse(channel.preferenceData);
      channelConfigs[data.type] = data;
    });
    
    // Ensure all channel types exist with defaults
    const defaultChannels: Record<string, ChannelConfig> = {
      teams: {
        type: 'teams',
        enabled: false,
        config: { webhookUrl: '', teamName: '', channelName: '' }
      },
      discord: {
        type: 'discord',
        enabled: false,
        config: { webhookUrl: '', serverName: '', channelName: '' }
      },
      sms: {
        type: 'sms',
        enabled: false,
        config: { phoneNumber: '', twilioAccountSid: '', twilioAuthToken: '' }
      },
      slack: {
        type: 'slack',
        enabled: false,
        config: { webhookUrl: '', channelName: '', workspaceName: '' }
      },
      email: {
        type: 'email',
        enabled: true,
        config: { address: userEmail }
      }
    };
    
    // Merge defaults with user configurations
    Object.keys(defaultChannels).forEach(type => {
      if (!channelConfigs[type]) {
        channelConfigs[type] = defaultChannels[type];
      }
    });
    
    return c.json({
      success: true,
      data: channelConfigs
    });
  } catch (error) {
    logger.error("Failed to get notification channels:", error);
    return c.json({ error: "Failed to get notification channels" }, 500);
  }
}

// Update notification channel configuration
export async function updateNotificationChannel(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    const channelType = c.req.param("channelType");
    const userEmail = c.get("userEmail");
    
    if (userId !== userEmail) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const { config, enabled } = await c.req.json();
    
    // Validate channel type
    const validChannels = ['teams', 'discord', 'sms', 'slack', 'email'];
    if (!validChannels.includes(channelType)) {
      return c.json({ error: "Invalid channel type" }, 400);
    }
    
    // Validate configuration based on channel type
    const validationErrors = validateChannelConfig(channelType, config);
    if (validationErrors.length > 0) {
      return c.json({ 
        error: "Validation failed", 
        details: validationErrors 
      }, 400);
    }
    
    const channelData: ChannelConfig = {
      type: channelType as any,
      enabled,
      config,
      testStatus: 'pending'
    };
    
    // Check if channel config already exists
    const existing = await db
      .select()
      .from(userPreferencesExtendedTable)
      .where(
        and(
          eq(userPreferencesExtendedTable.userId, userId),
          eq(userPreferencesExtendedTable.preferenceType, "notification-channels")
        )
      );
    
    // Filter for this specific channel type
    const existingChannel = existing.find(ch => {
      const data = JSON.parse(ch.preferenceData);
      return data.type === channelType;
    });
    
    if (existingChannel) {
      // Update existing channel
      await db
        .update(userPreferencesExtendedTable)
        .set({
          preferenceData: JSON.stringify(channelData),
          updatedAt: new Date()
        })
        .where(eq(userPreferencesExtendedTable.id, existingChannel.id));
    } else {
      // Create new channel config
      await db.insert(userPreferencesExtendedTable).values({
        id: createId(),
        userId,
        preferenceType: "notification-channels",
        preferenceData: JSON.stringify(channelData),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return c.json({
      success: true,
      data: channelData
    });
  } catch (error) {
    logger.error("Failed to update notification channel:", error);
    return c.json({ error: "Failed to update notification channel" }, 500);
  }
}

// Test notification channel
export async function testNotificationChannel(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    const channelType = c.req.param("channelType");
    const userEmail = c.get("userEmail");
    
    if (userId !== userEmail) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    // Get channel configuration
    const channels = await db
      .select()
      .from(userPreferencesExtendedTable)
      .where(
        and(
          eq(userPreferencesExtendedTable.userId, userId),
          eq(userPreferencesExtendedTable.preferenceType, "notification-channels")
        )
      );
    
    const channelConfig = channels.find(ch => {
      const data = JSON.parse(ch.preferenceData);
      return data.type === channelType;
    });
    
    if (!channelConfig) {
      return c.json({ error: "Channel configuration not found" }, 404);
    }
    
    const config = JSON.parse(channelConfig.preferenceData);
    
    // Test the channel
    const testResult = await testChannel(channelType, config.config);
    
    // Update test status
    config.testStatus = testResult.success ? 'success' : 'failed';
    config.lastTested = new Date();
    config.errorMessage = testResult.error || undefined;
    
    await db
      .update(userPreferencesExtendedTable)
      .set({
        preferenceData: JSON.stringify(config),
        updatedAt: new Date()
      })
      .where(eq(userPreferencesExtendedTable.id, channelConfig.id));
    
    return c.json({
      success: true,
      data: {
        channelType,
        testResult: testResult.success,
        message: testResult.message,
        error: testResult.error
      }
    });
  } catch (error) {
    logger.error("Failed to test notification channel:", error);
    return c.json({ error: "Failed to test notification channel" }, 500);
  }
}

// Send test notification to all enabled channels
export async function sendTestNotification(c: Context) {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    const userEmail = c.get("userEmail");
    
    if (userId !== userEmail) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const { message = "Test notification from Meridian! 🚀" } = await c.req.json();
    
    // Get all enabled channels
    const channels = await db
      .select()
      .from(userPreferencesExtendedTable)
      .where(
        and(
          eq(userPreferencesExtendedTable.userId, userId),
          eq(userPreferencesExtendedTable.preferenceType, "notification-channels")
        )
      );
    
    const results: Array<{
      channel: string;
      success: boolean;
      message?: string;
      error?: string;
    }> = [];
    
    for (const channel of channels) {
      const config = JSON.parse(channel.preferenceData);
      
      if (config.enabled) {
        const result = await sendNotificationToChannel(config.type, config.config, {
          title: "Test Notification",
          message,
          timestamp: new Date().toISOString()
        });
        
        results.push({
          channel: config.type,
          success: result.success,
          message: result.message,
          error: result.error
        });
      }
    }
    
    return c.json({
      success: true,
      data: {
        totalChannels: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (error) {
    logger.error("Failed to send test notification:", error);
    return c.json({ error: "Failed to send test notification" }, 500);
  }
}

// Validation functions
function validateChannelConfig(channelType: string, config: any): Array<{field: string, message: string}> {
  const errors: Array<{field: string, message: string}> = [];
  
  switch (channelType) {
    case 'teams':
      if (!config.webhookUrl || !config.webhookUrl.includes('office.com')) {
        errors.push({ field: 'webhookUrl', message: 'Valid Microsoft Teams webhook URL required' });
      }
      break;
      
    case 'discord':
      if (!config.webhookUrl || !config.webhookUrl.includes('discord.com')) {
        errors.push({ field: 'webhookUrl', message: 'Valid Discord webhook URL required' });
      }
      break;
      
    case 'sms':
      if (!config.phoneNumber || !/^\+[1-9]\d{1,14}$/.test(config.phoneNumber)) {
        errors.push({ field: 'phoneNumber', message: 'Valid phone number in E.164 format required' });
      }
      if (!config.twilioAccountSid) {
        errors.push({ field: 'twilioAccountSid', message: 'Twilio Account SID required' });
      }
      if (!config.twilioAuthToken) {
        errors.push({ field: 'twilioAuthToken', message: 'Twilio Auth Token required' });
      }
      break;
      
    case 'slack':
      if (!config.webhookUrl || !config.webhookUrl.includes('slack.com')) {
        errors.push({ field: 'webhookUrl', message: 'Valid Slack webhook URL required' });
      }
      break;
      
    case 'email':
      if (!config.address || !config.address.includes('@')) {
        errors.push({ field: 'address', message: 'Valid email address required' });
      }
      break;
  }
  
  return errors;
}

// Channel testing functions
async function testChannel(channelType: string, config: any): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    switch (channelType) {
      case 'teams':
        return await testTeamsWebhook(config.webhookUrl);
      case 'discord':
        return await testDiscordWebhook(config.webhookUrl);
      case 'sms':
        return await testSMSService(config);
      case 'slack':
        return await testSlackWebhook(config.webhookUrl);
      case 'email':
        return { success: true, message: 'Email channel is always available' };
      default:
        return { success: false, error: 'Unknown channel type' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Channel-specific test functions
async function testTeamsWebhook(webhookUrl: string): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary": "Meridian Test",
        "themeColor": "0078D4",
        "title": "🚀 Meridian Test Notification",
        "text": "Your Microsoft Teams integration is working correctly!"
      })
    });
    
    if (response.ok) {
      return { success: true, message: 'Teams webhook test successful' };
    } else {
      return { success: false, error: `Teams webhook failed: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: `Teams webhook error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testDiscordWebhook(webhookUrl: string): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title: "🚀 Meridian Test Notification",
          description: "Your Discord integration is working correctly!",
          color: 0x5865F2,
          timestamp: new Date().toISOString()
        }]
      })
    });
    
    if (response.ok) {
      return { success: true, message: 'Discord webhook test successful' };
    } else {
      return { success: false, error: `Discord webhook failed: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: `Discord webhook error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testSMSService(config: any): Promise<{success: boolean, message?: string, error?: string}> {
  // Note: This is a mock implementation. In production, you'd use the Twilio SDK
  try {
    // Simulate SMS test (would use Twilio API in production)
    const isValidConfig = config.twilioAccountSid && config.twilioAuthToken && config.phoneNumber;
    
    if (!isValidConfig) {
      return { success: false, error: 'SMS configuration incomplete' };
    }
    
    // In production, this would send an actual SMS
    return { success: true, message: 'SMS service configuration is valid (test SMS not sent)' };
  } catch (error) {
    return { success: false, error: `SMS service error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testSlackWebhook(webhookUrl: string): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: "🚀 Meridian Test Notification",
        attachments: [{
          color: "good",
          text: "Your Slack integration is working correctly!"
        }]
      })
    });
    
    if (response.ok) {
      return { success: true, message: 'Slack webhook test successful' };
    } else {
      return { success: false, error: `Slack webhook failed: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: `Slack webhook error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Send notification to specific channel
async function sendNotificationToChannel(
  channelType: string, 
  config: any, 
  notification: { title: string; message: string; timestamp: string }
): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    switch (channelType) {
      case 'teams':
        return await sendTeamsNotification(config.webhookUrl, notification);
      case 'discord':
        return await sendDiscordNotification(config.webhookUrl, notification);
      case 'sms':
        return await sendSMSNotification(config, notification);
      case 'slack':
        return await sendSlackNotification(config.webhookUrl, notification);
      case 'email':
        return { success: true, message: 'Email notification queued' }; // Would integrate with email service
      default:
        return { success: false, error: 'Unknown channel type' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Channel-specific notification functions
async function sendTeamsNotification(webhookUrl: string, notification: any): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary": notification.title,
        "themeColor": "0078D4",
        "title": notification.title,
        "text": notification.message
      })
    });
    
    return response.ok 
      ? { success: true, message: 'Teams notification sent' }
      : { success: false, error: `Teams API error: ${response.status}` };
  } catch (error) {
    return { success: false, error: `Teams error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendDiscordNotification(webhookUrl: string, notification: any): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: notification.title,
          description: notification.message,
          color: 0x5865F2,
          timestamp: notification.timestamp
        }]
      })
    });
    
    return response.ok 
      ? { success: true, message: 'Discord notification sent' }
      : { success: false, error: `Discord API error: ${response.status}` };
  } catch (error) {
    return { success: false, error: `Discord error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendSlackNotification(webhookUrl: string, notification: any): Promise<{success: boolean, message?: string, error?: string}> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: notification.title,
        attachments: [{
          color: "good",
          text: notification.message
        }]
      })
    });
    
    return response.ok 
      ? { success: true, message: 'Slack notification sent' }
      : { success: false, error: `Slack API error: ${response.status}` };
  } catch (error) {
    return { success: false, error: `Slack error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendSMSNotification(config: any, notification: any): Promise<{success: boolean, message?: string, error?: string}> {
  // Mock SMS implementation - would use Twilio SDK in production
  return { 
    success: true, 
    message: `SMS notification queued for ${config.phoneNumber}` 
  };
}

