import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertCircle, Plus, Edit, Trash2, Play, Bell } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  conditionType: string;
  conditionConfig: any;
  notificationChannels: string[];
  isActive: boolean;
  createdAt: Date;
}

const CONDITION_TYPES = [
  { value: 'project_progress', label: 'Project Progress' },
  { value: 'task_overdue', label: 'Task Overdue' },
  { value: 'task_count', label: 'Task Count' },
  { value: 'no_activity', label: 'No Activity' },
  { value: 'mention', label: 'Mention' },
  { value: 'keyword', label: 'Keyword' },
];

const NOTIFICATION_CHANNELS = [
  { id: 'in_app', label: 'In-App' },
  { id: 'email', label: 'Email' },
  { id: 'slack', label: 'Slack' },
  { id: 'teams', label: 'Microsoft Teams' },
];

export function AlertRulesSettings() {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [conditionType, setConditionType] = useState('task_overdue');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [isActive, setIsActive] = useState(true);
  
  // Condition config state
  const [threshold, setThreshold] = useState('50');
  const [operator, setOperator] = useState('below');
  const [daysOverdue, setDaysOverdue] = useState('1');
  const [taskStatus, setTaskStatus] = useState('pending');
  const [countThreshold, setCountThreshold] = useState('10');
  const [countOperator, setCountOperator] = useState('above');
  const [inactivityDays, setInactivityDays] = useState('7');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notification/alert-rules`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      toast.error('Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setConditionType(rule.conditionType);
    setChannels(rule.notificationChannels);
    setIsActive(rule.isActive);
    
    // Load condition config
    const config = rule.conditionConfig;
    if (config.threshold) setThreshold(String(config.threshold));
    if (config.operator) setOperator(config.operator);
    if (config.daysOverdue) setDaysOverdue(String(config.daysOverdue));
    if (config.status) setTaskStatus(config.status);
    if (config.countThreshold) setCountThreshold(String(config.countThreshold));
    if (config.countOperator) setCountOperator(config.countOperator);
    if (config.inactivityDays) setInactivityDays(String(config.inactivityDays));
    
    setShowDialog(true);
  };

  const resetForm = () => {
    setRuleName('');
    setConditionType('task_overdue');
    setChannels(['in_app']);
    setIsActive(true);
    setThreshold('50');
    setOperator('below');
    setDaysOverdue('1');
    setTaskStatus('pending');
    setCountThreshold('10');
    setCountOperator('above');
    setInactivityDays('7');
  };

  const buildConditionConfig = () => {
    const config: any = {};
    
    switch (conditionType) {
      case 'project_progress':
        config.threshold = parseInt(threshold);
        config.operator = operator;
        break;
      case 'task_overdue':
        config.daysOverdue = parseInt(daysOverdue);
        break;
      case 'task_count':
        config.status = taskStatus;
        config.countThreshold = parseInt(countThreshold);
        config.countOperator = countOperator;
        break;
      case 'no_activity':
        config.inactivityDays = parseInt(inactivityDays);
        break;
    }
    
    return config;
  };

  const saveRule = async () => {
    if (!ruleName) {
      toast.error('Rule name is required');
      return;
    }

    const ruleData = {
      name: ruleName,
      conditionType,
      conditionConfig: buildConditionConfig(),
      notificationChannels: channels,
      isActive,
    };

    try {
      if (editingRule) {
        // Update
        const res = await fetch(`${API_BASE_URL}/notification/alert-rules/${editingRule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(ruleData),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Rule updated!');
          setShowDialog(false);
          fetchRules();
        }
      } else {
        // Create
        const res = await fetch(`${API_BASE_URL}/notification/alert-rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(ruleData),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Rule created!');
          setShowDialog(false);
          fetchRules();
        }
      }
    } catch (error) {
      toast.error('Failed to save rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/notification/alert-rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Rule deleted!');
        fetchRules();
      }
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const testRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notification/alert-rules/${ruleId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId: currentWorkspace?.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.triggered) {
          toast.success(data.data.message);
        } else {
          toast.info(data.data.message);
        }
      }
    } catch (error) {
      toast.error('Failed to test rule');
    }
  };

  const toggleChannel = (channelId: string) => {
    setChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const getConditionSummary = (rule: AlertRule) => {
    const config = rule.conditionConfig;
    switch (rule.conditionType) {
      case 'project_progress':
        return `Progress ${config.operator} ${config.threshold}%`;
      case 'task_overdue':
        return `Overdue by ${config.daysOverdue} days`;
      case 'task_count':
        return `${config.status} tasks ${config.countOperator} ${config.countThreshold}`;
      case 'no_activity':
        return `No activity for ${config.inactivityDays} days`;
      default:
        return rule.conditionType;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Custom Alert Rules
              </CardTitle>
              <CardDescription>
                Create rules to get notified when specific conditions are met
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No alert rules yet</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                Create your first rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{rule.name}</h4>
                      {!rule.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getConditionSummary(rule)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {rule.notificationChannels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => testRule(rule.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit' : 'Create'} Alert Rule</DialogTitle>
            <DialogDescription>
              Configure when and how you want to be notified
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Rule Name */}
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., High priority task overdue"
              />
            </div>

            {/* Condition Type */}
            <div className="space-y-2">
              <Label>Condition Type</Label>
              <Select value={conditionType} onValueChange={setConditionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition Config */}
            {conditionType === 'project_progress' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Threshold (%)</Label>
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {conditionType === 'task_overdue' && (
              <div className="space-y-2">
                <Label>Days Overdue</Label>
                <Input
                  type="number"
                  value={daysOverdue}
                  onChange={(e) => setDaysOverdue(e.target.value)}
                />
              </div>
            )}

            {conditionType === 'task_count' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select value={countOperator} onValueChange={setCountOperator}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Count</Label>
                  <Input
                    type="number"
                    value={countThreshold}
                    onChange={(e) => setCountThreshold(e.target.value)}
                  />
                </div>
              </div>
            )}

            {conditionType === 'no_activity' && (
              <div className="space-y-2">
                <Label>Inactivity Days</Label>
                <Input
                  type="number"
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(e.target.value)}
                />
              </div>
            )}

            {/* Notification Channels */}
            <div className="space-y-2">
              <Label>Notification Channels</Label>
              <div className="grid grid-cols-2 gap-3">
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={channel.id}
                      checked={channels.includes(channel.id)}
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                    <Label htmlFor={channel.id} className="cursor-pointer">
                      {channel.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveRule}>
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

