/**
 * 📊 External Logging Settings Component
 * 
 * Workspace manager interface for configuring external logging:
 * - DataDog integration
 * - Loggly configuration
 * - Log level settings
 * - Retention policies
 * - Test connection
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, CheckCircle, XCircle, Loader2, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface LoggingConfig {
  provider: 'datadog' | 'loggly' | 'custom';
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  includeMetadata: boolean;
  filterSensitiveData: boolean;
}

export function ExternalLoggingSettings() {
  const { toast } = useToast();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();

  // Fetch current logging config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['external-logging-config', workspace?.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/logging/config?workspaceId=${workspace?.id}`);
      return response.json();
    },
    enabled: !!workspace?.id,
  });

  const [config, setConfig] = useState<LoggingConfig>({
    provider: 'datadog',
    enabled: false,
    logLevel: 'info',
    retentionDays: 30,
    includeMetadata: true,
    filterSensitiveData: true,
  });

  // Update from fetched data
  useState(() => {
    if (configData?.config) {
      setConfig(configData.config);
    }
  });

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/logging/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          config,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✓ Configuration Saved',
        description: 'External logging settings updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['external-logging-config'] });
    },
    onError: () => {
      toast({
        title: 'Save Failed',
        description: 'Failed to update logging configuration',
        variant: 'destructive',
      });
    },
  });

  // Test connection
  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/logging/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          config,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: '✓ Connection Successful',
          description: 'Successfully sent test log to external service',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Could not connect to logging service',
          variant: 'destructive',
        });
      }
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            External Logging Configuration
          </CardTitle>
          <CardDescription>
            Configure external logging services for centralized log management
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <Tabs value={config.provider} onValueChange={(v) => setConfig({ ...config, provider: v as any })}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="datadog">DataDog</TabsTrigger>
              <TabsTrigger value="loggly">Loggly</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            {/* DataDog Configuration */}
            <TabsContent value="datadog" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="datadog-api-key">DataDog API Key</Label>
                <Input
                  id="datadog-api-key"
                  type="password"
                  placeholder="Enter your DataDog API key"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from DataDog dashboard → Organization Settings → API Keys
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="datadog-endpoint">DataDog Endpoint (Optional)</Label>
                <Input
                  id="datadog-endpoint"
                  placeholder="https://http-intake.logs.datadoghq.com"
                  value={config.endpoint || ''}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Loggly Configuration */}
            <TabsContent value="loggly" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="loggly-token">Loggly Customer Token</Label>
                <Input
                  id="loggly-token"
                  type="password"
                  placeholder="Enter your Loggly token"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loggly-subdomain">Loggly Subdomain</Label>
                <Input
                  id="loggly-subdomain"
                  placeholder="your-company"
                  value={config.endpoint || ''}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Your logs will be sent to: https://your-company.loggly.com
                </p>
              </div>
            </TabsContent>

            {/* Custom Configuration */}
            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="custom-endpoint">HTTP Endpoint</Label>
                <Input
                  id="custom-endpoint"
                  placeholder="https://logs.yourcompany.com/api/ingest"
                  value={config.endpoint || ''}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-api-key">API Key/Token (Optional)</Label>
                <Input
                  id="custom-api-key"
                  type="password"
                  placeholder="Bearer token or API key"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Common Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">General Settings</h4>

            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable External Logging</Label>
                <p className="text-xs text-muted-foreground">
                  Send logs to external service
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            {/* Log Level */}
            <div className="space-y-2">
              <Label htmlFor="log-level">Minimum Log Level</Label>
              <Select
                value={config.logLevel}
                onValueChange={(v) => setConfig({ ...config, logLevel: v as any })}
              >
                <SelectTrigger id="log-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug (All logs)</SelectItem>
                  <SelectItem value="info">Info (Standard logs)</SelectItem>
                  <SelectItem value="warn">Warning (Issues only)</SelectItem>
                  <SelectItem value="error">Error (Errors only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Retention */}
            <div className="space-y-2">
              <Label htmlFor="retention">Retention Period (Days)</Label>
              <Input
                id="retention"
                type="number"
                min="1"
                max="365"
                value={config.retentionDays}
                onChange={(e) => setConfig({ ...config, retentionDays: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Logs older than this will be automatically deleted
              </p>
            </div>

            {/* Include Metadata */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Request Metadata</Label>
                <p className="text-xs text-muted-foreground">
                  Include user agent, IP, request ID, etc.
                </p>
              </div>
              <Switch
                checked={config.includeMetadata}
                onCheckedChange={(checked) => setConfig({ ...config, includeMetadata: checked })}
              />
            </div>

            {/* Filter Sensitive Data */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Filter Sensitive Data</Label>
                <p className="text-xs text-muted-foreground">
                  Remove passwords, tokens, credit cards from logs
                </p>
              </div>
              <Switch
                checked={config.filterSensitiveData}
                onCheckedChange={(checked) => setConfig({ ...config, filterSensitiveData: checked })}
              />
            </div>
          </div>

          {/* Connection Status */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Connection Status</Label>
                {config.enabled ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !config.enabled}
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                // Reset to fetched config
                if (configData?.config) {
                  setConfig(configData.config);
                }
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">📊 DataDog Setup</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Log in to your DataDog account</li>
              <li>Navigate to Organization Settings → API Keys</li>
              <li>Create a new API key named "Meridian Integration"</li>
              <li>Copy the key and paste it above</li>
              <li>Click "Test Connection" to verify</li>
              <li>Save configuration</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">📈 Loggly Setup</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Log in to your Loggly account</li>
              <li>Go to Source Setup → Customer Tokens</li>
              <li>Copy your customer token</li>
              <li>Enter your subdomain (e.g., "your-company")</li>
              <li>Test and save</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">🔧 Custom Endpoint</h4>
            <p className="text-sm text-muted-foreground">
              For custom logging services, provide an HTTP endpoint that accepts POST requests
              with JSON payloads. Logs will be sent with the following format:
            </p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
{`{
  "timestamp": "2025-10-30T12:00:00Z",
  "level": "info",
  "message": "User logged in",
  "metadata": {
    "userId": "user_123",
    "workspaceId": "ws_456"
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

