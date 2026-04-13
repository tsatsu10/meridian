import { DigestData } from "../services/digest-generator";
import { formatDistanceToNow } from "date-fns";

export function generateDigestEmailHTML(digest: DigestData): string {
  const { user, period, metrics, content } = digest;
  
  const periodLabel = period.type === 'daily' ? 'Daily' : 'Weekly';
  const dateRange = period.type === 'daily'
    ? 'Yesterday'
    : `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodLabel} Digest - Meridian</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .metrics {
      display: flex;
      justify-content: space-around;
      padding: 20px;
      background: #f8f9fa;
    }
    .metric {
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .section {
      padding: 20px;
      border-bottom: 1px solid #eee;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 15px;
      color: #333;
    }
    .item {
      padding: 12px;
      margin-bottom: 10px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .item-title {
      font-weight: 600;
      margin: 0 0 5px;
    }
    .item-meta {
      font-size: 12px;
      color: #666;
    }
    .empty {
      text-align: center;
      color: #999;
      padding: 20px;
      font-style: italic;
    }
    .footer {
      padding: 20px;
      text-align: center;
      background: #f8f9fa;
      color: #666;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 ${periodLabel} Digest</h1>
      <p>Hi ${user.name}! Here's what happened ${dateRange}</p>
    </div>
    
    <!-- Metrics -->
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${metrics.tasksCompleted}</div>
        <div class="metric-label">Tasks Done</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.mentionsCount}</div>
        <div class="metric-label">Mentions</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.commentsReceived}</div>
        <div class="metric-label">Comments</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.kudosReceived}</div>
        <div class="metric-label">Kudos</div>
      </div>
    </div>
    
    ${content.recentTasks && content.recentTasks.length > 0 ? `
    <!-- Tasks Section -->
    <div class="section">
      <h2 class="section-title">✅ Completed Tasks</h2>
      ${content.recentTasks.map(task => `
        <div class="item">
          <div class="item-title">${task.title}</div>
          <div class="item-meta">${task.project || 'Personal'}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${content.recentKudos && content.recentKudos.length > 0 ? `
    <!-- Kudos Section -->
    <div class="section">
      <h2 class="section-title">🎉 Kudos Received</h2>
      ${content.recentKudos.map(kudo => `
        <div class="item">
          <div class="item-title">${kudo.emoji} ${kudo.message}</div>
          <div class="item-meta">From: ${kudo.fromUserEmail}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${content.recentMentions && content.recentMentions.length > 0 ? `
    <!-- Mentions Section -->
    <div class="section">
      <h2 class="section-title">@ Mentions</h2>
      ${content.recentMentions.map(mention => `
        <div class="item">
          <div class="item-title">${mention.title}</div>
          <div class="item-meta">${mention.content || mention.message}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- CTA -->
    <div class="section" style="text-align: center; border: none;">
      <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard" class="button">
        View Full Dashboard
      </a>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>You're receiving this because you subscribed to ${periodLabel.toLowerCase()} digests.</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications" style="color: #667eea;">Manage preferences</a></p>
      <p>© ${new Date().getFullYear()} Meridian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateDigestEmailText(digest: DigestData): string {
  const { user, period, metrics, content } = digest;
  
  const periodLabel = period.type === 'daily' ? 'Daily' : 'Weekly';
  const dateRange = period.type === 'daily'
    ? 'Yesterday'
    : `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`;
  
  let text = `
${periodLabel} Digest - Meridian

Hi ${user.name}! Here's what happened ${dateRange}

SUMMARY
-------
Tasks Completed: ${metrics.tasksCompleted}
Mentions: ${metrics.mentionsCount}
Comments: ${metrics.commentsReceived}
Kudos Received: ${metrics.kudosReceived}

`;
  
  if (content.recentTasks && content.recentTasks.length > 0) {
    text += `
COMPLETED TASKS
---------------
${content.recentTasks.map(task => `• ${task.title}`).join('\n')}

`;
  }
  
  if (content.recentKudos && content.recentKudos.length > 0) {
    text += `
KUDOS RECEIVED
--------------
${content.recentKudos.map(kudo => `${kudo.emoji} ${kudo.message} (from ${kudo.fromUserEmail})`).join('\n')}

`;
  }
  
  if (content.recentMentions && content.recentMentions.length > 0) {
    text += `
MENTIONS
--------
${content.recentMentions.map(mention => `• ${mention.title}`).join('\n')}

`;
  }
  
  text += `
View full dashboard: ${process.env.APP_URL || 'http://localhost:5173'}/dashboard

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;
  
  return text;
}


