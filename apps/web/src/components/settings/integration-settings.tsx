import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ExternalLink, Check, X, Send, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Integration {
  id: string;
  integrationType: string;
  channelName?: string;
  isActive: boolean;
  createdAt: Date;
}

interface IntegrationStatus {
  connected: boolean;
  channel?: string;
  isActive?: boolean;
  hasWebhook?: boolean;
}

export function IntegrationSettings() {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [slackStatus, setSlackStatus] = useState<IntegrationStatus | null>(null);
  const [teamsStatus, setTeamsStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTeamsDialog, setShowTeamsDialog] = useState(false);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [teamsChannelName, setTeamsChannelName] = useState('');

  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    if (workspaceId) {
      fetchIntegrations();
      fetchSlackStatus();
      fetchTeamsStatus();
    }
  }, [workspaceId]);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations?workspaceId=${workspaceId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlackStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/slack/status?workspaceId=${workspaceId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setSlackStatus(data);
    } catch (error) {
      console.error('Failed to fetch Slack status:', error);
    }
  };

  const fetchTeamsStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/teams/status?workspaceId=${workspaceId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setTeamsStatus(data);
    } catch (error) {
      console.error('Failed to fetch Teams status:', error);
    }
  };

  const connectSlack = () => {
    const connectUrl = `${API_BASE_URL}/integrations/slack/connect?workspaceId=${workspaceId}`;
    window.open(connectUrl, 'slack-connect', 'width=600,height=700');
    
    // Poll for status update
    const pollInterval = setInterval(async () => {
      await fetchSlackStatus();
      await fetchIntegrations();
      if (slackStatus?.connected) {
        clearInterval(pollInterval);
      }
    }, 2000);
    
    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const disconnectSlack = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/slack/disconnect?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Slack disconnected');
        fetchSlackStatus();
        fetchIntegrations();
      }
    } catch (error) {
      toast.error('Failed to disconnect Slack');
    }
  };

  const testSlack = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/slack/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Test notification sent to Slack!');
      } else {
        toast.error(data.error || 'Failed to send test notification');
      }
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const connectTeams = () => {
    setShowTeamsDialog(true);
  };

  const saveTeamsWebhook = async () => {
    if (!teamsWebhookUrl) {
      toast.error('Webhook URL is required');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/integrations/teams/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId,
          webhookUrl: teamsWebhookUrl,
          channelName: teamsChannelName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Teams webhook configured!');
        setShowTeamsDialog(false);
        setTeamsWebhookUrl('');
        setTeamsChannelName('');
        fetchTeamsStatus();
        fetchIntegrations();
      } else {
        toast.error(data.error || 'Failed to configure webhook');
      }
    } catch (error) {
      toast.error('Failed to configure Teams webhook');
    }
  };

  const disconnectTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/teams/disconnect?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Teams disconnected');
        fetchTeamsStatus();
        fetchIntegrations();
      }
    } catch (error) {
      toast.error('Failed to disconnect Teams');
    }
  };

  const testTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/teams/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Test notification sent to Teams!');
      } else {
        toast.error(data.error || 'Failed to send test notification');
      }
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>External Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            External Integrations
          </CardTitle>
          <CardDescription>
            Connect external platforms to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slack Integration */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <div>
                <h3 className="font-semibold">Slack</h3>
                <p className="text-sm text-muted-foreground">
                  {slackStatus?.connected
                    ? `Connected to #${slackStatus.channel}`
                    : 'Receive notifications in Slack'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {slackStatus?.connected ? (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Connected
                  </Badge>
                  <Button size="sm" variant="outline" onClick={testSlack}>
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                  <Button size="sm" variant="ghost" onClick={disconnectSlack}>
                    <X className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={connectSlack}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Teams Integration */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                T
              </div>
              <div>
                <h3 className="font-semibold">Microsoft Teams</h3>
                <p className="text-sm text-muted-foreground">
                  {teamsStatus?.connected && teamsStatus?.hasWebhook
                    ? teamsStatus.channel
                      ? `Connected to ${teamsStatus.channel}`
                      : 'Connected'
                    : 'Receive notifications in Teams'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {teamsStatus?.connected && teamsStatus?.hasWebhook ? (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Connected
                  </Badge>
                  <Button size="sm" variant="outline" onClick={testTeams}>
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                  <Button size="sm" variant="ghost" onClick={disconnectTeams}>
                    <X className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={connectTeams}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">📌 How Integrations Work</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Connect once per workspace</li>
              <li>Notifications sent automatically based on your preferences</li>
              <li>Test notifications anytime to verify connection</li>
              <li>Disconnect anytime from this page</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Teams Webhook Dialog */}
      <Dialog open={showTeamsDialog} onOpenChange={setShowTeamsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Microsoft Teams</DialogTitle>
            <DialogDescription>
              Add an Incoming Webhook to your Teams channel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://outlook.office.com/webhook/..."
                value={teamsWebhookUrl}
                onChange={(e) => setTeamsWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Create an Incoming Webhook in your Teams channel settings
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name (optional)</Label>
              <Input
                id="channel-name"
                placeholder="General"
                value={teamsChannelName}
                onChange={(e) => setTeamsChannelName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowTeamsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTeamsWebhook}>
              Save Webhook
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

