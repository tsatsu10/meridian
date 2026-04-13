import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Link,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  Zap,
  Calendar, 
  Mail,
  Github,
  Slack,
  Figma,
  Cloud,
  Sparkles,
  Webhook,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/constants/urls";
import useWorkspaceStore from "@/store/workspace";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/integrations")({
  component: withErrorBoundary(IntegrationsSettings, "Integrations Settings"),
});

const INTEGRATION_ICONS: Record<string, any> = {
  slack: Slack,
  github: Github,
  figma: Figma,
  gmail: Mail,
  'google-calendar': Calendar,
  'google-drive': Cloud,
  jira: Settings,
  zoom: Zap,
  dropbox: Cloud,
  zapier: Sparkles,
};

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  status: 'connected' | 'available';
  connectionId?: string | null;
  connectedAt?: string | null;
  setupUrl: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
}

function IntegrationsSettings() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();
  
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [deleteWebhookDialogOpen, setDeleteWebhookDialogOpen] = useState(false);
  const [targetIntegration, setTargetIntegration] = useState<string>("");
  const [targetWebhook, setTargetWebhook] = useState<string>("");
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  // Fetch integrations
  const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
    queryKey: ["integrations", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/integrations?workspaceId=${currentWorkspace?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch integrations");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const integrations: Integration[] = integrationsData?.data || [];

  // Fetch webhooks
  const { data: webhooksData, isLoading: webhooksLoading } = useQuery({
    queryKey: ["webhooks", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/integrations/webhooks?workspaceId=${currentWorkspace?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch webhooks");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const webhooks: WebhookConfig[] = webhooksData?.data || [];

  // Connect integration mutation
  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`${API_BASE_URL}/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to connect integration");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(data.data.message || "Integration connected successfully");
    },
    onError: () => {
      toast.error("Failed to connect integration");
    },
  });

  // Disconnect integration mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`${API_BASE_URL}/integrations/${connectionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to disconnect integration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration disconnected successfully");
      setDisconnectDialogOpen(false);
      setTargetIntegration("");
    },
    onError: () => {
      toast.error("Failed to disconnect integration");
    },
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/integrations/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          name: newWebhookName,
          url: newWebhookUrl,
          events: ["task.created", "task.updated", "project.created"],
        }),
      });
      if (!response.ok) throw new Error("Failed to create webhook");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created successfully");
      setShowWebhookDialog(false);
      setNewWebhookName("");
      setNewWebhookUrl("");
    },
    onError: () => {
      toast.error("Failed to create webhook");
    },
  });

  // Toggle webhook mutation
  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ webhookId, isActive }: { webhookId: string; isActive: boolean }) => {
      const response = await fetch(`${API_BASE_URL}/integrations/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update webhook");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to update webhook");
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const response = await fetch(`${API_BASE_URL}/integrations/webhooks/${webhookId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete webhook");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted successfully");
      setDeleteWebhookDialogOpen(false);
      setTargetWebhook("");
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });

  const handleConnect = (integrationId: string) => {
    connectMutation.mutate(integrationId);
  };

  const handleDisconnect = (integration: Integration) => {
    setTargetIntegration(integration.connectionId || "");
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = () => {
    if (targetIntegration) {
      disconnectMutation.mutate(targetIntegration);
    }
  };

  const handleDeleteWebhook = (webhookId: string) => {
    setTargetWebhook(webhookId);
    setDeleteWebhookDialogOpen(true);
  };

  const confirmDeleteWebhook = () => {
    if (targetWebhook) {
      deleteWebhookMutation.mutate(targetWebhook);
    }
  };

  if (!currentWorkspace) {
    return (
      <LazyDashboardLayout>
        <div className="p-8">
          <div className="text-center">
            <p className="text-muted-foreground">No workspace selected</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  const connectedIntegrations = integrations.filter((i) => i.status === "connected");
  const availableIntegrations = integrations.filter((i) => i.status === "available");

  return (
    <LazyDashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect Meridian with your favorite tools and services
          </p>
        </div>

        {/* Connected Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Integrations</CardTitle>
            <CardDescription>
              Manage your active integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {integrationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : connectedIntegrations.length === 0 ? (
              <div className="text-center py-8">
                <Link className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No integrations connected yet. Browse available integrations below.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {connectedIntegrations.map((integration) => {
                  const Icon = INTEGRATION_ICONS[integration.id] || Settings;
                  return (
                    <div key={integration.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3 flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{integration.name}</h3>
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Connected
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {integration.description}
                            </p>
                            <div className="flex gap-1 flex-wrap mt-2">
                              {integration.features.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Available Integrations</CardTitle>
            <CardDescription>
              Connect new tools and services to Meridian
            </CardDescription>
          </CardHeader>
          <CardContent>
            {integrationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : availableIntegrations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  All available integrations are already connected!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableIntegrations.map((integration) => {
                  const Icon = INTEGRATION_ICONS[integration.id] || Settings;
                  return (
                    <div key={integration.id} className="border rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="p-2 bg-muted rounded-lg h-fit">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{integration.name}</h3>
                            <Badge variant="outline">{integration.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {integration.description}
                          </p>
                          <div className="flex gap-1 flex-wrap mt-2">
                            {integration.features.map((feature, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => handleConnect(integration.id)}
                            disabled={connectMutation.isPending}
                          >
                            {connectMutation.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 mr-2" />
                                Connect
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  Outgoing Webhooks
                </CardTitle>
                <CardDescription>
                  Send real-time events to external services
                </CardDescription>
              </div>
              <Button onClick={() => setShowWebhookDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {webhooksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8">
                <Webhook className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No webhooks configured. Add a webhook to send events to external services.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{webhook.name}</h4>
                          <Badge variant={webhook.isActive ? "default" : "secondary"}>
                            {webhook.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 font-mono break-all">
                          {webhook.url}
                        </p>
                        <div className="flex gap-1 flex-wrap mt-2">
                          {webhook.events.map((event, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={(checked) =>
                            toggleWebhookMutation.mutate({ webhookId: webhook.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disconnect Integration Dialog */}
        <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Integration?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the integration and stop all data syncing. You can reconnect anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDisconnect}>
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Webhook Dialog */}
        <AlertDialog open={deleteWebhookDialogOpen} onOpenChange={setDeleteWebhookDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
              <AlertDialogDescription>
                This webhook will be permanently deleted and stop receiving events.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteWebhook} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Webhook Dialog */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Configure a new outgoing webhook to receive real-time events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Webhook Name</Label>
                <Input
                  id="webhook-name"
                  placeholder="Production Webhook"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-app.com/webhooks/meridian"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createWebhookMutation.mutate()}
                disabled={!newWebhookName.trim() || !newWebhookUrl.trim() || createWebhookMutation.isPending}
              >
                {createWebhookMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Webhook"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LazyDashboardLayout>
  );
}
