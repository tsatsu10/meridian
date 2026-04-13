/**
 * Message Formatter Service
 * Formats notifications for different platforms (Slack, Teams, Discord, etc.)
 */

interface NotificationData {
  title: string;
  content?: string;
  message?: string;
  type: string;
  userEmail?: string;
  resourceId?: string;
  resourceType?: string;
  priority?: string;
  createdAt?: Date;
}

/**
 * Format notification for Slack
 * Uses Slack Block Kit for rich formatting
 */
export function formatForSlack(notification: NotificationData): any {
  const { title, content, message, type, priority, createdAt } = notification;
  
  // Determine color based on priority or type
  let color = '#36a64f'; // default green
  if (priority === 'urgent') color = '#ff0000';
  else if (priority === 'high') color = '#ff9900';
  else if (type === 'mention') color = '#4a90e2';
  else if (type === 'error') color = '#d9534f';
  
  // Determine emoji based on type
  let emoji = '📢';
  if (type === 'mention') emoji = '👋';
  else if (type === 'task') emoji = '✅';
  else if (type === 'comment') emoji = '💬';
  else if (type === 'kudos') emoji = '🎉';
  else if (type === 'error') emoji = '⚠️';
  
  return {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *${title}*`,
            },
          },
          ...(content || message ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: content || message,
              },
            },
          ] : []),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Type: ${type} ${priority ? `| Priority: ${priority}` : ''}${createdAt ? ` | ${new Date(createdAt).toLocaleString()}` : ''}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Format notification for Microsoft Teams
 * Uses Adaptive Cards format
 */
export function formatForTeams(notification: NotificationData): any {
  const { title, content, message, type, priority, createdAt } = notification;
  
  // Determine theme color
  let themeColor = '0078D4'; // default blue
  if (priority === 'urgent') themeColor = 'FF0000';
  else if (priority === 'high') themeColor = 'FF9900';
  else if (type === 'error') themeColor = 'D9534F';
  
  // Determine emoji
  let emoji = '📢';
  if (type === 'mention') emoji = '👋';
  else if (type === 'task') emoji = '✅';
  else if (type === 'comment') emoji = '💬';
  else if (type === 'kudos') emoji = '🎉';
  
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: title,
    themeColor,
    sections: [
      {
        activityTitle: `${emoji} ${title}`,
        activitySubtitle: content || message || '',
        facts: [
          {
            name: 'Type',
            value: type,
          },
          ...(priority ? [
            {
              name: 'Priority',
              value: priority,
            },
          ] : []),
          ...(createdAt ? [
            {
              name: 'Time',
              value: new Date(createdAt).toLocaleString(),
            },
          ] : []),
        ],
      },
    ],
  };
}

/**
 * Format notification for Discord
 * Uses Discord Embed format
 */
export function formatForDiscord(notification: NotificationData): any {
  const { title, content, message, type, priority, createdAt } = notification;
  
  // Determine color (Discord uses decimal color)
  let color = 3447003; // default blue
  if (priority === 'urgent') color = 16711680; // red
  else if (priority === 'high') color = 16750592; // orange
  else if (type === 'success') color = 3066993; // green
  
  return {
    embeds: [
      {
        title,
        description: content || message || '',
        color,
        fields: [
          {
            name: 'Type',
            value: type,
            inline: true,
          },
          ...(priority ? [
            {
              name: 'Priority',
              value: priority,
              inline: true,
            },
          ] : []),
        ],
        timestamp: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format notification for plain text (fallback)
 */
export function formatPlainText(notification: NotificationData): string {
  const { title, content, message, type, priority, createdAt } = notification;
  
  let text = `**${title}**\n`;
  if (content || message) {
    text += `${content || message}\n`;
  }
  text += `\nType: ${type}`;
  if (priority) {
    text += ` | Priority: ${priority}`;
  }
  if (createdAt) {
    text += ` | ${new Date(createdAt).toLocaleString()}`;
  }
  
  return text;
}

/**
 * Main formatter function that routes to appropriate platform
 */
export function formatNotificationForPlatform(
  notification: NotificationData,
  platform: 'slack' | 'teams' | 'discord' | 'text'
): any {
  switch (platform) {
    case 'slack':
      return formatForSlack(notification);
    case 'teams':
      return formatForTeams(notification);
    case 'discord':
      return formatForDiscord(notification);
    case 'text':
    default:
      return formatPlainText(notification);
  }
}


