import { Hono } from 'hono';
import { getDatabase } from '../../database/connection';
import { integrations, users } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../../utils/logger';
import { formatForSlack } from '../services/message-formatter';

const slack = new Hono();

/**
 * Slack OAuth Configuration
 * Add these to your .env file:
 * SLACK_CLIENT_ID=your-slack-app-client-id
 * SLACK_CLIENT_SECRET=your-slack-app-client-secret
 * SLACK_REDIRECT_URI=http://localhost:3005/api/integrations/slack/callback
 */

/**
 * Step 1: Initiate Slack OAuth flow
 * Redirects user to Slack authorization page
 */
slack.get('/connect', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  const userEmail = c.get('userEmail');
  
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID is required' }, 400);
  }
  
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Slack integration not configured' }, 500);
  }
  
  // Build OAuth URL
  const scopes = [
    'incoming-webhook',
    'chat:write',
    'chat:write.public',
    'channels:read',
  ].join(',');
  
  const state = Buffer.from(JSON.stringify({ userEmail, workspaceId })).toString('base64');
  
  const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&state=${state}&redirect_uri=${process.env.SLACK_REDIRECT_URI}`;
  
  return c.redirect(oauthUrl);
});

/**
 * Step 2: Handle Slack OAuth callback
 * Exchanges code for access token and saves integration
 */
slack.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  
  if (error) {
    logger.error('Slack OAuth error:', error);
    return c.html('<html><body><h1>❌ Slack Integration Failed</h1><p>Error: ' + error + '</p></body></html>');
  }
  
  if (!code || !state) {
    return c.json({ error: 'Invalid OAuth callback' }, 400);
  }
  
  try {
    // Decode state
    const { userEmail, workspaceId } = JSON.parse(Buffer.from(state, 'base64').toString());
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.ok) {
      throw new Error(tokenData.error || 'Failed to get access token');
    }
    
    const db = getDatabase();
    
    // Save integration
    const [integration] = await db
      .insert(integrations)
      .values({
        id: createId(),
        userEmail,
        workspaceId,
        integrationType: 'slack',
        accessToken: tokenData.access_token,
        channelId: tokenData.incoming_webhook?.channel_id,
        channelName: tokenData.incoming_webhook?.channel,
        webhookUrl: tokenData.incoming_webhook?.url,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    logger.info(`Slack integration created for ${userEmail} in workspace ${workspaceId}`);
    
    return c.html(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; }
            .success { color: #22c55e; font-size: 48px; }
            h1 { color: #333; }
            .button { 
              display: inline-block; 
              margin-top: 20px; 
              padding: 12px 24px; 
              background: #667eea; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="success">✅</div>
          <h1>Slack Integration Successful!</h1>
          <p>Notifications will now be sent to <strong>#${tokenData.incoming_webhook?.channel}</strong></p>
          <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard/settings/integrations" class="button">
            Return to Settings
          </a>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Failed to complete Slack OAuth:', error);
    return c.html('<html><body><h1>❌ Failed to connect Slack</h1><p>' + (error instanceof Error ? error.message : 'Unknown error') + '</p></body></html>');
  }
});

/**
 * Disconnect Slack integration
 */
slack.delete('/disconnect', async (c) => {
  const userEmail = c.get('userEmail');
  const workspaceId = c.req.query('workspaceId');
  
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID is required' }, 400);
  }
  
  try {
    const db = getDatabase();
    
    await db
      .delete(integrations)
      .where(
        and(
          eq(integrations.userEmail, userEmail),
          eq(integrations.workspaceId, workspaceId),
          eq(integrations.integrationType, 'slack')
        )
      );
    
    logger.info(`Slack integration disconnected for ${userEmail}`);
    
    return c.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (error) {
    logger.error('Failed to disconnect Slack:', error);
    return c.json({ error: 'Failed to disconnect Slack' }, 500);
  }
});

/**
 * Get Slack integration status
 */
slack.get('/status', async (c) => {
  const userEmail = c.get('userEmail');
  const workspaceId = c.req.query('workspaceId');
  
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID is required' }, 400);
  }
  
  try {
    const db = getDatabase();
    
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userEmail, userEmail),
          eq(integrations.workspaceId, workspaceId),
          eq(integrations.integrationType, 'slack')
        )
      )
      .limit(1);
    
    return c.json({
      connected: !!integration,
      channel: integration?.channelName,
      isActive: integration?.isActive,
    });
  } catch (error) {
    logger.error('Failed to get Slack status:', error);
    return c.json({ error: 'Failed to get status' }, 500);
  }
});

/**
 * Send a test notification to Slack
 */
slack.post('/test', async (c) => {
  const userEmail = c.get('userEmail');
  const body = await c.req.json();
  const { workspaceId } = body;
  
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID is required' }, 400);
  }
  
  try {
    const db = getDatabase();
    
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userEmail, userEmail),
          eq(integrations.workspaceId, workspaceId),
          eq(integrations.integrationType, 'slack')
        )
      )
      .limit(1);
    
    if (!integration || !integration.webhookUrl) {
      return c.json({ error: 'Slack not connected' }, 400);
    }
    
    // Get user name
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    // Format test message
    const message = formatForSlack({
      title: '✅ Meridian Test Notification',
      content: `This is a test notification from Meridian. Sent by ${user?.name || userEmail}.`,
      type: 'test',
      priority: 'normal',
      createdAt: new Date(),
    });
    
    // Send to Slack
    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }
    
    logger.info(`Test notification sent to Slack for ${userEmail}`);
    
    return c.json({ success: true, message: 'Test notification sent!' });
  } catch (error) {
    logger.error('Failed to send test notification:', error);
    return c.json({ error: 'Failed to send test notification' }, 500);
  }
});

export default slack;


