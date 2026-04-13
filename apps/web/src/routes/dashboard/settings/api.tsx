import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus,
  Calendar,
  Activity,
  Globe,
  Code,
  Shield,
  Webhook,
  Loader2,
  AlertTriangle
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

export const Route = createFileRoute("/dashboard/settings/api")({
  component: withErrorBoundary(ApiAccessSettings, "API Access Settings"),
});

interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only present immediately after creation
  provider: string | null;
  scopes: string[];
  lastUsed: string;
  status: "active" | "inactive";
  expiresAt: string | null;
  createdAt: string;
}

function ApiAccessSettings() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();
  
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);

  // Fetch API keys
  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ["api-keys", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api-keys?workspaceId=${currentWorkspace?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch API keys");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const apiKeys: ApiKey[] = apiKeysData?.data || [];

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`${API_BASE_URL}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          name,
          scopes: ["read", "write"],
        }),
      });
      if (!response.ok) throw new Error("Failed to create API key");
      return response.json();
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.data.key);
      setShowNewKeyDialog(true);
      setNewKeyName("");
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created successfully");
    },
    onError: () => {
      toast.error("Failed to create API key");
      setIsCreating(false);
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`${API_BASE_URL}/api-keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete API key");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete API key");
    },
  });

  // Toggle key active status mutation
  const toggleKeyMutation = useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      const response = await fetch(`${API_BASE_URL}/api-keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update API key");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key updated successfully");
    },
    onError: () => {
      toast.error("Failed to update API key");
    },
  });

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    setIsCreating(true);
    createKeyMutation.mutate(newKeyName);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
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

  return (
    <LazyDashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">API Access</h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys and webhooks for programmatic access to Meridian
          </p>
        </div>

        {/* API Documentation Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              API Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Access our comprehensive API documentation to integrate Meridian with your applications.
            </p>
            <Button variant="outline" className="gap-2">
              <Globe className="w-4 h-4" />
              View API Docs
            </Button>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Generate and manage API keys for authentication
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Create New Key */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter API key name (e.g., Production API)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateKey()}
                />
              </div>
              <Button onClick={handleGenerateKey} disabled={isCreating || !newKeyName.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Key
                  </>
                )}
              </Button>
            </div>

            {/* API Keys List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No API keys yet. Generate your first key to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{key.name}</h4>
                          <Badge variant={key.status === "active" ? "default" : "secondary"}>
                            {key.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created {new Date(key.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Last used: {key.lastUsed}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.status === "active"}
                          onCheckedChange={(checked) =>
                            toggleKeyMutation.mutate({ keyId: key.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteKeyMutation.mutate(key.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-muted px-3 py-2 rounded-md font-mono text-sm">
                        <span className="flex-1 truncate">
                          {showKeys[key.id] ? key.key || "••••••••••••••••••••••••" : "••••••••••••••••••••••••"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleKeyVisibility(key.id)}
                        title={showKeys[key.id] ? "Hide key" : "Show key"}
                      >
                        {showKeys[key.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {key.scopes && key.scopes.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {key.scopes.map((scope: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• Never share your API keys publicly or commit them to version control</p>
            <p>• Rotate keys regularly and delete unused keys</p>
            <p>• Use separate keys for development and production environments</p>
            <p>• Monitor API key usage in the activity logs</p>
            <p>• Revoke keys immediately if you suspect they've been compromised</p>
          </CardContent>
        </Card>

        {/* New Key Dialog */}
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Save Your API Key
              </DialogTitle>
              <DialogDescription>
                This is the only time you'll see this key. Copy it now and store it securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm break-all">{newlyCreatedKey}</code>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (newlyCreatedKey) copyToClipboard(newlyCreatedKey);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewKeyDialog(false);
                  setNewlyCreatedKey(null);
                }}
              >
                I've Saved My Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LazyDashboardLayout>
  );
}
