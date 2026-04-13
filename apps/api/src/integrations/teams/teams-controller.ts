import { Hono } from 'hono';
import { getDatabase } from '../../database/connection';
import { integrations, users } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../../utils/logger';
import { formatForTeams } from '../services/message-formatter';

const teams = new Hono();

/**
 * Microsoft Teams OAuth Configuration
 * Add these to your .env file:
 * TEAMS_CLIENT_ID=your-teams-app-client-id
 * TEAMS_CLIENT_SECRET=your-teams-app-client-secret
 * TEAMS_TENANT_ID=your-azure-tenant-id
 * TEAMS_REDIRECT_URI=http://localhost:3005/api/integrations/teams/callback
 */

/**
 * Step 1: Initiate Teams OAuth flow
 * Redirects user to Microsoft authorization page
 */
teams.get('/connect', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  const userEmail = c.get('userEmail');
  
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID is required' }, 400);
  }
  
  const clientId = process.env.TEAMS_CLIENT_ID;
  const tenantId = process.env.TEAMS_TENANT_ID || 'common';
  
  if (!clientId) {
    return c.json({ error: 'Teams integration not configured' }, 500);
  }
  
  // Build OAuth URL
  const scopes = [
    'https://graph.microsoft.com/ChannelMessage.Send',
    'https://graph.microsoft.com/User.Read',
  ].join(' ');
  
  const state = Buffer.from(JSON.stringify({ userEmail, workspaceId })).toString('base64');
  
  const oauthUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(process.env.TEAMS_REDIRECT_URI!)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;
  
  return c.redirect(oauthUrl);
});

/**
 * Step 2: Handle Teams OAuth callback
 * Exchanges code for access token and saves integration
 */
teams.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const error_description = c.req.query('error_description');
  
  if (error) {
    logger.error('Teams OAuth error:', error, error_description);
    return c.html('<html><body><h1>❌ Teams Integration Failed</h1><p>Error: ' + error + '</p></body></html>');
  }
  
  if (!code || !state) {
    return c.json({ error: 'Invalid OAuth callback' }, 400);
  }
  
  try {
    // Decode state
    const { userEmail, workspaceId } = JSON.parse(Buffer.from(state, 'base64').toString());
    
    const tenantId = process.env.TEAMS_TENANT_ID || 'common';
    
    // Exchange code for access token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TEAMS_CLIENT_ID!,
        client_secret: process.env.TEAMS_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.TEAMS_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    const db = getDatabase();
    
    // Save integration
    const [integration] = await db
      .insert(integrations)
      .values({
        id: createId(),
        userEmail,
        workspaceId,
        integrationType: 'teams',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    logger.info(`Teams integration created for ${userEmail} in workspace ${workspaceId}`);
    
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
          <h1>Microsoft Teams Integration Successful!</h1>
          <p>Notifications will now be sent to your Teams channels</p>
          <p class="info">Configure webhook URL in settings to complete setup</p>
          <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard/settings/integrations" class="button">
            Return to Settings
          </a>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Failed to complete Teams OAuth:', error);
    return c.html('<html><body><h1>❌ Failed to connect Teams</h1><p>' + (error instanceof Error ? error.message : 'Unknown error') + '</p></body></html>');
  }
});

/**
 * Update Teams webhook URL
 * Teams requires manual webhook URL configuration
 */
teams.post('/webhook', async (c) => {
  const userEmail = c.get('userEmail');
  const body = await c.req.json();
  const { workspaceId, webhookUrl, channelName } = body;
  
  if (!workspaceId || !webhookUrl) {
    return c.json({ error: 'Workspace ID and webhook URL are required' }, 400);
  }
  
  try {
    const db = getDatabase();
    
    // Check if integration exists
    const [existing] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userEmail, userEmail),
          eq(integrations.workspaceId, workspaceId),
          eq(integrations.integrationType, 'teams')
        )
      )
      .limit(1);
    
    if (existing) {
      // Update existing
      await db
        .update(integrations)
        .set({
          webhookUrl,
          channelName: channelName || null,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
    } else {
      // Create new
      await db
        .insert(integrations)
        .values({
          id: createId(),
          userEmail,
          workspaceId,
          integrationType: 'teams',
          webhookUrl,
          channelName: channelName || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }
    
    logger.info(`Teams webhook configured for ${userEmail}`);
    
    return c.json({ success: true, message: 'Teams webhook configured successfully' });
  } catch (error) {
    logger.error('Failed to configure Teams webhook:', error);
    return c.json({ error: 'Failed to configure webhook' }, 500);
  }
});

/**
 * Disconnect Teams integration
 */
teams.delete('/disconnect', async (c) => {
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
          eq(integrations.integrationType, 'teams')
        )
      );
    
    logger.info(`Teams integration disconnected for ${userEmail}`);
    
    return c.json({ success: true, message: 'Teams disconnected successfully' });
  } catch (error) {
    logger.error('Failed to disconnect Teams:', error);
    return c.json({ error: 'Failed to disconnect Teams' }, 500);
  }
});

/**
 * Get Teams integration status
 */
teams.get('/status', async (c) => {
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
          eq(integrations.integrationType, 'teams')
        )
      )
      .limit(1);
    
    return c.json({
      connected: !!integration,
      hasWebhook: !!integration?.webhookUrl,
      channel: integration?.channelName,
      isActive: integration?.isActive,
    });
  } catch (error) {
    logger.error('Failed to get Teams status:', error);
    return c.json({ error: 'Failed to get status' }, 500);
  }
});

/**
 * Send a test notification to Teams
 */
teams.post('/test', async (c) => {
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
          eq(integrations.integrationType, 'teams')
        )
      )
      .limit(1);
    
    if (!integration || !integration.webhookUrl) {
      return c.json({ error: 'Teams not connected or webhook not configured' }, 400);
    }
    
    // Get user name
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    // Format test message
    const message = formatForTeams({
      title: '✅ Meridian Test Notification',
      content: `This is a test notification from Meridian. Sent by ${user?.name || userEmail}.`,
      type: 'test',
      priority: 'normal',
      createdAt: new Date(),
    });
    
    // Send to Teams
    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }
    
    logger.info(`Test notification sent to Teams for ${userEmail}`);
    
    return c.json({ success: true, message: 'Test notification sent!' });
  } catch (error) {
    logger.error('Failed to send test notification:', error);
    return c.json({ error: 'Failed to send test notification' }, 500);
  }
});

export default teams;


