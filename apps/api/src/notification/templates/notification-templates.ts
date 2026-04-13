/**
 * 📧 Notification Email Templates
 * 
 * Centralized template system for all notification types.
 * Supports HTML and plain text formats.
 */

export interface TemplateContext {
  user: {
    name: string;
    email: string;
  };
  notification: {
    title: string;
    content: string;
    type: string;
    priority?: string;
  };
  resource?: {
    id: string;
    type: string;
    name?: string;
  };
  actor?: {
    name: string;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, any>;
  ctaUrl?: string;
  ctaText?: string;
}

/**
 * Base HTML template with common styling
 */
function baseHTML(content: string, title: string = 'Notification'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Meridian</title>
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
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      padding: 20px;
      text-align: center;
      background: #f8f9fa;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-urgent { background: #dc2626; color: white; }
    .badge-high { background: #ea580c; color: white; }
    .badge-normal { background: #3b82f6; color: white; }
    .badge-low { background: #64748b; color: white; }
    .metadata {
      background: #f8f9fa;
      border-left: 3px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .metadata-label {
      font-weight: 600;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .metadata-value {
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>This is an automated notification from Meridian.</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications">Manage notification preferences</a></p>
      <p>© ${new Date().getFullYear()} Meridian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Task Assignment Template
 */
export function taskAssignedTemplate(ctx: TemplateContext): { html: string; text: string } {
  const html = baseHTML(`
    <div class="header">
      <h1>✅ New Task Assigned</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.actor?.name || 'Someone'} assigned you a new task:</p>
      
      <div class="metadata">
        <div class="metadata-label">Task</div>
        <div class="metadata-value"><strong>${ctx.notification.title}</strong></div>
        ${ctx.notification.content ? `<p style="margin-top: 10px;">${ctx.notification.content}</p>` : ''}
      </div>
      
      ${ctx.metadata?.dueDate ? `
        <p><strong>Due Date:</strong> ${new Date(ctx.metadata.dueDate).toLocaleDateString()}</p>
      ` : ''}
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'View Task'}</a>
      ` : ''}
    </div>
  `, 'Task Assigned');

  const text = `
Task Assigned - Meridian

Hi ${ctx.user.name},

${ctx.actor?.name || 'Someone'} assigned you a new task:

${ctx.notification.title}
${ctx.notification.content || ''}

${ctx.metadata?.dueDate ? `Due Date: ${new Date(ctx.metadata.dueDate).toLocaleDateString()}` : ''}

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}/tasks

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Mention Template
 */
export function mentionTemplate(ctx: TemplateContext): { html: string; text: string } {
  const html = baseHTML(`
    <div class="header">
      <h1>@ You were mentioned</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.actor?.name || 'Someone'} mentioned you in a ${ctx.resource?.type || 'comment'}:</p>
      
      <div class="metadata">
        ${ctx.notification.title ? `<div class="metadata-value"><strong>${ctx.notification.title}</strong></div>` : ''}
        <p style="margin-top: 10px;">"${ctx.notification.content}"</p>
      </div>
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'View Conversation'}</a>
      ` : ''}
    </div>
  `, 'You were mentioned');

  const text = `
You were mentioned - Meridian

Hi ${ctx.user.name},

${ctx.actor?.name || 'Someone'} mentioned you in a ${ctx.resource?.type || 'comment'}:

${ctx.notification.title || ''}
"${ctx.notification.content}"

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Comment Template
 */
export function commentTemplate(ctx: TemplateContext): { html: string; text: string } {
  const html = baseHTML(`
    <div class="header">
      <h1>💬 New Comment</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.actor?.name || 'Someone'} commented on "${ctx.notification.title}":</p>
      
      <div class="metadata">
        <p>"${ctx.notification.content}"</p>
      </div>
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'Reply'}</a>
      ` : ''}
    </div>
  `, 'New Comment');

  const text = `
New Comment - Meridian

Hi ${ctx.user.name},

${ctx.actor?.name || 'Someone'} commented on "${ctx.notification.title}":

"${ctx.notification.content}"

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Task Due Soon Template
 */
export function taskDueSoonTemplate(ctx: TemplateContext): { html: string; text: string } {
  const dueDate = ctx.metadata?.dueDate ? new Date(ctx.metadata.dueDate) : new Date();
  const timeUntilDue = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60));

  const html = baseHTML(`
    <div class="header">
      <h1>⏰ Task Due Soon</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>Your task is due ${timeUntilDue < 24 ? `in ${timeUntilDue} hours` : 'soon'}:</p>
      
      <div class="metadata">
        <div class="metadata-value"><strong>${ctx.notification.title}</strong></div>
        ${ctx.notification.content ? `<p style="margin-top: 10px;">${ctx.notification.content}</p>` : ''}
        <p style="margin-top: 10px;"><strong>Due:</strong> ${dueDate.toLocaleString()}</p>
      </div>
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'View Task'}</a>
      ` : ''}
    </div>
  `, 'Task Due Soon');

  const text = `
Task Due Soon - Meridian

Hi ${ctx.user.name},

Your task is due ${timeUntilDue < 24 ? `in ${timeUntilDue} hours` : 'soon'}:

${ctx.notification.title}
${ctx.notification.content || ''}

Due: ${dueDate.toLocaleString()}

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}/tasks

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Workspace Invitation Template
 */
export function workspaceInviteTemplate(ctx: TemplateContext): { html: string; text: string } {
  const html = baseHTML(`
    <div class="header">
      <h1>🎉 Workspace Invitation</h1>
    </div>
    <div class="content">
      <p>Hi there!,</p>
      <p>${ctx.actor?.name || 'Someone'} invited you to join ${ctx.workspace?.name || 'a workspace'} on Meridian.</p>
      
      <div class="metadata">
        <div class="metadata-label">Workspace</div>
        <div class="metadata-value"><strong>${ctx.workspace?.name || 'Unnamed Workspace'}</strong></div>
        ${ctx.metadata?.role ? `<p style="margin-top: 10px;"><strong>Role:</strong> ${ctx.metadata.role}</p>` : ''}
      </div>
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'Accept Invitation'}</a>
      ` : ''}
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you don't know ${ctx.actor?.name || 'the sender'}, you can safely ignore this email.
      </p>
    </div>
  `, 'Workspace Invitation');

  const text = `
Workspace Invitation - Meridian

Hi there!,

${ctx.actor?.name || 'Someone'} invited you to join ${ctx.workspace?.name || 'a workspace'} on Meridian.

${ctx.metadata?.role ? `Role: ${ctx.metadata.role}` : ''}

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}/accept-invite

If you don't know ${ctx.actor?.name || 'the sender'}, you can safely ignore this email.

---
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Kudos Template
 */
export function kudosTemplate(ctx: TemplateContext): { html: string; text: string } {
  const html = baseHTML(`
    <div class="header">
      <h1>🎉 You received Kudos!</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.actor?.name || 'Someone'} sent you kudos:</p>
      
      <div class="metadata" style="text-align: center; border-left: none;">
        <div style="font-size: 48px; margin: 20px 0;">
          ${ctx.metadata?.emoji || '🎉'}
        </div>
        <div style="font-size: 18px; font-weight: 600; margin: 10px 0;">
          "${ctx.notification.content}"
        </div>
      </div>
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'View All Kudos'}</a>
      ` : ''}
    </div>
  `, 'Kudos Received');

  const text = `
Kudos Received - Meridian

Hi ${ctx.user.name},

${ctx.actor?.name || 'Someone'} sent you kudos:

${ctx.metadata?.emoji || '🎉'} "${ctx.notification.content}"

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}/kudos

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Alert Template
 */
export function alertTemplate(ctx: TemplateContext): { html: string; text: string } {
  const priorityBadge = ctx.notification.priority 
    ? `<span class="badge badge-${ctx.notification.priority}">${ctx.notification.priority}</span>`
    : '';

  const html = baseHTML(`
    <div class="header">
      <h1>🔔 Alert ${priorityBadge}</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.notification.title}</p>
      
      ${ctx.notification.content ? `
        <div class="metadata">
          <p>${ctx.notification.content}</p>
        </div>
      ` : ''}
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'View Details'}</a>
      ` : ''}
    </div>
  `, 'Alert');

  const text = `
Alert [${ctx.notification.priority?.toUpperCase() || 'NORMAL'}] - Meridian

Hi ${ctx.user.name},

${ctx.notification.title}

${ctx.notification.content || ''}

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Generic Template (fallback)
 */
export function genericTemplate(ctx: TemplateContext): { html: string; text: string } {
  const html = baseHTML(`
    <div class="header">
      <h1>🔔 Notification</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.notification.title}</p>
      
      ${ctx.notification.content ? `
        <div class="metadata">
          <p>${ctx.notification.content}</p>
        </div>
      ` : ''}
      
      ${ctx.ctaUrl ? `
        <a href="${ctx.ctaUrl}" class="button">${ctx.ctaText || 'View'}</a>
      ` : ''}
    </div>
  `, ctx.notification.title);

  const text = `
${ctx.notification.title} - Meridian

Hi ${ctx.user.name},

${ctx.notification.title}

${ctx.notification.content || ''}

${ctx.ctaUrl || process.env.APP_URL || 'http://localhost:5173'}

---
Manage preferences: ${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications
© ${new Date().getFullYear()} Meridian
  `;

  return { html, text };
}

/**
 * Template mapper - select template based on notification type
 */
export function getTemplate(type: string, ctx: TemplateContext): { html: string; text: string } {
  switch (type) {
    case 'task_assigned':
      return taskAssignedTemplate(ctx);
    
    case 'mention':
      return mentionTemplate(ctx);
    
    case 'comment':
    case 'new_comment':
      return commentTemplate(ctx);
    
    case 'task_due_soon':
    case 'task_overdue':
      return taskDueSoonTemplate(ctx);
    
    case 'workspace_invite':
      return workspaceInviteTemplate(ctx);
    
    case 'kudos':
      return kudosTemplate(ctx);
    
    case 'alert':
      return alertTemplate(ctx);
    
    default:
      return genericTemplate(ctx);
  }
}


