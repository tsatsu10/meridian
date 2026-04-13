import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Zap,
  Settings,
  Bell,
  Clock,
  TrendingUp,
  Shield,
  ArrowLeft,
  Save,
  RotateCcw,
  Plus,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/automation')({
  component: withErrorBoundary(AutomationSettings, "Automation Settings"),
});

interface AutomationSettingsData {
  automationEnabled: boolean;
  allowUserAutomation: boolean;
  maxRulesPerUser: number;
  maxActionsPerRule: number;
  workflowExecutionTimeout: number;
  maxConcurrentWorkflows: number;
  retryFailedWorkflows: boolean;
  maxRetryAttempts: number;
  retryDelayMinutes: number;
  notifyOnWorkflowStart: boolean;
  notifyOnWorkflowComplete: boolean;
  notifyOnWorkflowError: boolean;
  errorNotificationRecipients: string[];
  dailyExecutionLimit: number | null;
  monthlyExecutionLimit: number | null;
  executionHistoryRetentionDays: number;
  allowRulePriorities: boolean;
  defaultRulePriority: number;
  enableDebugMode: boolean;
  logExecutionDetails: boolean;
  allowExternalWebhooks: boolean;
  webhookTimeout: number;
  allowAPIIntegrations: boolean;
  requireApprovalForDestructive: boolean;
}

function AutomationSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<AutomationSettingsData>>({});
  const [newRecipient, setNewRecipient] = useState('');

  // Fetch automation settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['automation-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/automation/${currentWorkspace.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch automation settings');
      }
      
      const result = await response.json();
      return result.data as AutomationSettingsData;
    },
    enabled: !!currentWorkspace,
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AutomationSettingsData>) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/automation/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings', currentWorkspace?.id] });
      toast.success('Automation settings updated successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const handleChange = (field: keyof AutomationSettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
      toast.info('Changes reset');
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipient) {
      toast.error('Please enter an email address');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipient)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const current = formData.errorNotificationRecipients || [];
    if (current.includes(newRecipient)) {
      toast.error('Email already in recipients list');
      return;
    }

    handleChange('errorNotificationRecipients', [...current, newRecipient]);
    setNewRecipient('');
    toast.success('Recipient added');
  };

  const handleRemoveRecipient = (email: string) => {
    const current = formData.errorNotificationRecipients || [];
    handleChange('errorNotificationRecipients', current.filter(e => e !== email));
  };

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading automation settings...</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate({ to: '/dashboard/settings' })} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Zap className="h-8 w-8" /> Automation Settings
              </h1>
              <p className="text-muted-foreground">Configure workflow automation and execution rules</p>
            </div>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
              <Button onClick={handleSave} size="sm" disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Global Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Global Automation Settings
            </CardTitle>
            <CardDescription>Enable and configure workspace-wide automation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Automation</Label>
                <p className="text-sm text-muted-foreground">Allow automated workflows in this workspace</p>
              </div>
              <Switch
                checked={formData.automationEnabled ?? true}
                onCheckedChange={(checked) => handleChange('automationEnabled', checked)}
              />
            </div>

            {formData.automationEnabled && (
              <>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow User Automation</Label>
                    <p className="text-sm text-muted-foreground">Members can create their own automation rules</p>
                  </div>
                  <Switch
                    checked={formData.allowUserAutomation ?? true}
                    onCheckedChange={(checked) => handleChange('allowUserAutomation', checked)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxRulesPerUser">Max Rules Per User</Label>
                    <Input
                      id="maxRulesPerUser"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.maxRulesPerUser || 50}
                      onChange={(e) => handleChange('maxRulesPerUser', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxActionsPerRule">Max Actions Per Rule</Label>
                    <Input
                      id="maxActionsPerRule"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxActionsPerRule || 10}
                      onChange={(e) => handleChange('maxActionsPerRule', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Workflow Execution Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Workflow Execution
            </CardTitle>
            <CardDescription>Configure how workflows are executed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workflowExecutionTimeout">Execution Timeout (seconds)</Label>
                <Input
                  id="workflowExecutionTimeout"
                  type="number"
                  min="10"
                  max="3600"
                  value={formData.workflowExecutionTimeout || 300}
                  onChange={(e) => handleChange('workflowExecutionTimeout', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">Maximum time for a workflow to complete</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConcurrentWorkflows">Max Concurrent Workflows</Label>
                <Input
                  id="maxConcurrentWorkflows"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxConcurrentWorkflows || 10}
                  onChange={(e) => handleChange('maxConcurrentWorkflows', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">Maximum workflows running at once</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Retry Failed Workflows</Label>
                <p className="text-sm text-muted-foreground">Automatically retry workflows that fail</p>
              </div>
              <Switch
                checked={formData.retryFailedWorkflows ?? true}
                onCheckedChange={(checked) => handleChange('retryFailedWorkflows', checked)}
              />
            </div>

            {formData.retryFailedWorkflows && (
              <div className="grid gap-4 md:grid-cols-2 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="maxRetryAttempts">Max Retry Attempts</Label>
                  <Input
                    id="maxRetryAttempts"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetryAttempts || 3}
                    onChange={(e) => handleChange('maxRetryAttempts', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryDelayMinutes">Retry Delay (minutes)</Label>
                  <Input
                    id="retryDelayMinutes"
                    type="number"
                    min="1"
                    max="1440"
                    value={formData.retryDelayMinutes || 5}
                    onChange={(e) => handleChange('retryDelayMinutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Workflow Notifications
            </CardTitle>
            <CardDescription>Control when to send workflow notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Notify on Workflow Start</Label>
              <Switch
                checked={formData.notifyOnWorkflowStart ?? false}
                onCheckedChange={(checked) => handleChange('notifyOnWorkflowStart', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Notify on Workflow Complete</Label>
              <Switch
                checked={formData.notifyOnWorkflowComplete ?? true}
                onCheckedChange={(checked) => handleChange('notifyOnWorkflowComplete', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Notify on Workflow Error</Label>
              <Switch
                checked={formData.notifyOnWorkflowError ?? true}
                onCheckedChange={(checked) => handleChange('notifyOnWorkflowError', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Error Notification Recipients</Label>
              <p className="text-sm text-muted-foreground">Email addresses to notify when workflows fail</p>
              
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="email@example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                />
                <Button onClick={handleAddRecipient} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {(formData.errorNotificationRecipients || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(formData.errorNotificationRecipients || []).map((email) => (
                    <Badge key={email} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveRecipient(email)}>
                      {email} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Execution Limits Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Execution Limits
            </CardTitle>
            <CardDescription>Set limits on workflow executions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dailyExecutionLimit">Daily Execution Limit</Label>
                <Input
                  id="dailyExecutionLimit"
                  type="number"
                  min="1"
                  value={formData.dailyExecutionLimit || ''}
                  onChange={(e) => handleChange('dailyExecutionLimit', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Unlimited"
                />
                <p className="text-sm text-muted-foreground">Leave empty for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyExecutionLimit">Monthly Execution Limit</Label>
                <Input
                  id="monthlyExecutionLimit"
                  type="number"
                  min="1"
                  value={formData.monthlyExecutionLimit || ''}
                  onChange={(e) => handleChange('monthlyExecutionLimit', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Unlimited"
                />
                <p className="text-sm text-muted-foreground">Leave empty for unlimited</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="executionHistoryRetentionDays">Execution History Retention (days)</Label>
              <Input
                id="executionHistoryRetentionDays"
                type="number"
                min="1"
                max="365"
                value={formData.executionHistoryRetentionDays || 90}
                onChange={(e) => handleChange('executionHistoryRetentionDays', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">How long to keep workflow execution logs</p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Advanced Settings
            </CardTitle>
            <CardDescription>Configure advanced automation features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Rule Priorities</Label>
                <p className="text-sm text-muted-foreground">Rules can have different priority levels</p>
              </div>
              <Switch
                checked={formData.allowRulePriorities ?? true}
                onCheckedChange={(checked) => handleChange('allowRulePriorities', checked)}
              />
            </div>

            {formData.allowRulePriorities && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="defaultRulePriority">Default Rule Priority (1-10)</Label>
                <Input
                  id="defaultRulePriority"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.defaultRulePriority || 5}
                  onChange={(e) => handleChange('defaultRulePriority', parseInt(e.target.value))}
                />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Debug Mode</Label>
                <p className="text-sm text-muted-foreground">Show detailed execution information</p>
              </div>
              <Switch
                checked={formData.enableDebugMode ?? false}
                onCheckedChange={(checked) => handleChange('enableDebugMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Log Execution Details</Label>
                <p className="text-sm text-muted-foreground">Store detailed execution logs</p>
              </div>
              <Switch
                checked={formData.logExecutionDetails ?? true}
                onCheckedChange={(checked) => handleChange('logExecutionDetails', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow External Webhooks</Label>
                <p className="text-sm text-muted-foreground">Workflows can call external URLs</p>
              </div>
              <Switch
                checked={formData.allowExternalWebhooks ?? true}
                onCheckedChange={(checked) => handleChange('allowExternalWebhooks', checked)}
              />
            </div>

            {formData.allowExternalWebhooks && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="webhookTimeout">Webhook Timeout (seconds)</Label>
                <Input
                  id="webhookTimeout"
                  type="number"
                  min="5"
                  max="300"
                  value={formData.webhookTimeout || 30}
                  onChange={(e) => handleChange('webhookTimeout', parseInt(e.target.value))}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow API Integrations</Label>
                <p className="text-sm text-muted-foreground">Workflows can use external APIs</p>
              </div>
              <Switch
                checked={formData.allowAPIIntegrations ?? true}
                onCheckedChange={(checked) => handleChange('allowAPIIntegrations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval for Destructive Actions</Label>
                <p className="text-sm text-muted-foreground">Destructive workflows need manual approval</p>
              </div>
              <Switch
                checked={formData.requireApprovalForDestructive ?? true}
                onCheckedChange={(checked) => handleChange('requireApprovalForDestructive', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Warning Card */}
        {formData.automationEnabled && !formData.requireApprovalForDestructive && (
          <Card className="border-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Destructive actions can be executed automatically without approval. This could result in unintended data loss.
                Consider enabling "Require Approval for Destructive Actions" for better safety.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </LazyDashboardLayout>
  );
}
