import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  Settings,
  AlertTriangle,
  Upload,
  Save,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Globe,
  Clock,
  Palette,
  Shield,
  Zap,
  Calendar,
  MessageSquare,
  BarChart3
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/workspace')({
  component: withErrorBoundary(WorkspaceSettings, "Workspace Settings"),
});

interface WorkspaceSettingsData {
  // Basic Info
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  slug: string | null;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  memberCount: number;
  
  // Member Settings
  allowMemberInvites: boolean;
  requireAdminApproval: boolean;
  enableGuestAccess: boolean;
  autoRemoveInactive: boolean;
  inactivityDays: number;
  maxMembers: number | null;
  
  // Project Defaults
  defaultProjectVisibility: 'private' | 'team' | 'workspace';
  defaultTaskPriority: 'low' | 'medium' | 'high' | 'urgent';
  enableTimeTracking: boolean;
  requireTaskApproval: boolean;
  
  // Workspace Preferences
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Feature Flags
  enableAutomation: boolean;
  enableCalendar: boolean;
  enableMessaging: boolean;
  enableAnalytics: boolean;
  
  // Branding
  primaryColor: string;
  accentColor: string;
  customDomain: string | null;
}

function WorkspaceSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace; // Alias for compatibility
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkspaceSettingsData>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Debug: Log current workspace with more details
  useEffect(() => {
    console.log('🔍 WorkspaceSettings Component:', {
      currentWorkspace,
      workspace,
      areEqual: currentWorkspace === workspace,
      currentWorkspaceUndefined: currentWorkspace === undefined,
      workspaceUndefined: workspace === undefined
    });
    console.log('🔍 API Base URL:', API_BASE_URL);
    
    // Check localStorage directly
    const lsData = localStorage.getItem('meridian-workspace');
    console.log('🔍 localStorage meridian-workspace:', lsData ? JSON.parse(lsData) : 'EMPTY');
    
    if (currentWorkspace) {
      console.log('📍 Settings URL:', `${API_BASE_URL}/workspaces/${currentWorkspace.id}/settings`);
    } else {
      console.error('❌ currentWorkspace is UNDEFINED in settings component!');
    }
  }, [currentWorkspace, workspace]);

  // Fetch workspace settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['workspace-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');

      const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspace.id}/settings`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch workspace settings' }));
        throw new Error(errorData.error || 'Failed to fetch workspace settings');
      }

      return response.json() as Promise<WorkspaceSettingsData>;
    },
    enabled: !!currentWorkspace,
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setLogoPreview(settings.logo);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<WorkspaceSettingsData>) => {
      if (!currentWorkspace) throw new Error('No workspace selected');

      const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspace.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update settings' }));
        throw new Error(error.error || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-settings', currentWorkspace?.id] });
      toast.success('Workspace settings updated successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentWorkspace) throw new Error('No workspace selected');

      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspace.id}/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to upload logo' }));
        throw new Error(error.error || 'Failed to upload logo');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-settings', currentWorkspace?.id] });
      toast.success('Logo uploaded successfully');
      setLogoFile(null);
      setLogoPreview(data.logoUrl);
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload logo: ${error.message}`);
    },
  });

  const handleChange = (field: keyof WorkspaceSettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    // Upload logo first if changed
    if (logoFile) {
      await uploadLogoMutation.mutateAsync(logoFile);
    }
    
    // Update settings
    const updates = { ...formData };
    delete updates.id;
    delete updates.ownerId;
    delete updates.ownerEmail;
    delete updates.ownerName;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.memberCount;
    delete updates.logo; // Logo is handled separately
    
    updateSettingsMutation.mutate(updates);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setLogoPreview(settings.logo);
      setLogoFile(null);
      setHasChanges(false);
      toast.info('Changes reset');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspace.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete workspace' }));
        throw new Error(errorData.error || 'Failed to delete workspace');
      }

      toast.success('Workspace deleted successfully');
      navigate({ to: '/dashboard' });
    } catch (error: any) {
      toast.error(`Failed to delete workspace: ${error.message}`);
    }
  };

  // Check if workspace is selected
  if (!workspace) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <div>
              <p className="text-lg font-semibold">No Workspace Selected</p>
              <p className="text-sm text-muted-foreground mt-2">Please select a workspace to view its settings</p>
            </div>
            <Button onClick={() => navigate({ to: '/dashboard' })} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workspace settings...</p>
            <p className="text-xs text-muted-foreground mt-2">Workspace: {currentWorkspace.name}</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (!settings && !isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <p className="text-lg font-semibold">Failed to load workspace settings</p>
              {error && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-destructive">{error.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Workspace ID: {currentWorkspace.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    API: {API_BASE_URL}/workspaces/{currentWorkspace.id}/settings
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate({ to: '/dashboard' })} variant="outline">
                Go to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                Try Again
              </Button>
            </div>
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
                <Building2 className="h-8 w-8" /> Workspace Settings
              </h1>
              <p className="text-muted-foreground">Manage your workspace configuration and preferences</p>
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

        {/* Workspace Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workspace Information
            </CardTitle>
            <CardDescription>Basic information about your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={logoPreview || undefined} />
                <AvatarFallback>
                  <Building2 className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label>Workspace Logo</Label>
                <p className="text-sm text-muted-foreground">Upload a logo for your workspace (max 5MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>

            <Separator />

            {/* Basic Info Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter workspace name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Workspace Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="workspace-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe your workspace"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={`${settings.ownerName} (${settings.ownerEmail})`} disabled />
              </div>
              
              <div className="space-y-2">
                <Label>Members</Label>
                <Input value={`${settings.memberCount} members`} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                value={formData.customDomain || ''}
                onChange={(e) => handleChange('customDomain', e.target.value)}
                placeholder="workspace.example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Member Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Settings
            </CardTitle>
            <CardDescription>Configure how members can join and participate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Member Invites</Label>
                <p className="text-sm text-muted-foreground">Members can invite others to the workspace</p>
              </div>
              <Switch
                checked={formData.allowMemberInvites ?? true}
                onCheckedChange={(checked) => handleChange('allowMemberInvites', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Admin Approval</Label>
                <p className="text-sm text-muted-foreground">New members need admin approval to join</p>
              </div>
              <Switch
                checked={formData.requireAdminApproval ?? false}
                onCheckedChange={(checked) => handleChange('requireAdminApproval', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Guest Access</Label>
                <p className="text-sm text-muted-foreground">Allow guest users with limited permissions</p>
              </div>
              <Switch
                checked={formData.enableGuestAccess ?? true}
                onCheckedChange={(checked) => handleChange('enableGuestAccess', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Remove Inactive Members</Label>
                <p className="text-sm text-muted-foreground">Automatically remove members after inactivity period</p>
              </div>
              <Switch
                checked={formData.autoRemoveInactive ?? false}
                onCheckedChange={(checked) => handleChange('autoRemoveInactive', checked)}
              />
            </div>

            {formData.autoRemoveInactive && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="inactivityDays">Inactivity Period (days)</Label>
                <Input
                  id="inactivityDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.inactivityDays || 90}
                  onChange={(e) => handleChange('inactivityDays', parseInt(e.target.value))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Input
                id="maxMembers"
                type="number"
                min="1"
                value={formData.maxMembers || ''}
                onChange={(e) => handleChange('maxMembers', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
              />
            </div>
          </CardContent>
        </Card>

        {/* Project Defaults Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Project Defaults
            </CardTitle>
            <CardDescription>Default settings for new projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultProjectVisibility">Default Project Visibility</Label>
                <Select
                  value={formData.defaultProjectVisibility || 'team'}
                  onValueChange={(value) => handleChange('defaultProjectVisibility', value)}
                >
                  <SelectTrigger id="defaultProjectVisibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="workspace">Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultTaskPriority">Default Task Priority</Label>
                <Select
                  value={formData.defaultTaskPriority || 'medium'}
                  onValueChange={(value) => handleChange('defaultTaskPriority', value)}
                >
                  <SelectTrigger id="defaultTaskPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Time Tracking</Label>
                <p className="text-sm text-muted-foreground">Track time spent on tasks by default</p>
              </div>
              <Switch
                checked={formData.enableTimeTracking ?? true}
                onCheckedChange={(checked) => handleChange('enableTimeTracking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Task Approval</Label>
                <p className="text-sm text-muted-foreground">Tasks need approval before completion</p>
              </div>
              <Switch
                checked={formData.requireTaskApproval ?? false}
                onCheckedChange={(checked) => handleChange('requireTaskApproval', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Working Hours Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Working Hours
            </CardTitle>
            <CardDescription>Set your workspace's working schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workingHoursStart">Start Time</Label>
                <Input
                  id="workingHoursStart"
                  type="time"
                  value={formData.workingHoursStart || '09:00'}
                  onChange={(e) => handleChange('workingHoursStart', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workingHoursEnd">End Time</Label>
                <Input
                  id="workingHoursEnd"
                  type="time"
                  value={formData.workingHoursEnd || '17:00'}
                  onChange={(e) => handleChange('workingHoursEnd', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone || 'UTC'}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  placeholder="UTC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={formData.timeFormat || '12h'}
                  onValueChange={(value) => handleChange('timeFormat', value)}
                >
                  <SelectTrigger id="timeFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <Badge
                    key={day}
                    variant={formData.workingDays?.includes(day) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = formData.workingDays || [];
                      const updated = current.includes(day)
                        ? current.filter(d => d !== day)
                        : [...current, day];
                      handleChange('workingDays', updated);
                    }}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Features
            </CardTitle>
            <CardDescription>Enable or disable workspace features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Automation</Label>
                    <p className="text-sm text-muted-foreground">Workflow automation and rules</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableAutomation ?? true}
                  onCheckedChange={(checked) => handleChange('enableAutomation', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Calendar</Label>
                    <p className="text-sm text-muted-foreground">Integrated calendar features</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableCalendar ?? true}
                  onCheckedChange={(checked) => handleChange('enableCalendar', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Messaging</Label>
                    <p className="text-sm text-muted-foreground">Team messaging and chat</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableMessaging ?? true}
                  onCheckedChange={(checked) => handleChange('enableMessaging', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">Performance analytics and insights</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableAnalytics ?? true}
                  onCheckedChange={(checked) => handleChange('enableAnalytics', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>Customize your workspace's appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor || '#3B82F6'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.primaryColor || '#3B82F6'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor || '#8B5CF6'}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.accentColor || '#8B5CF6'}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-destructive">Delete Workspace</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this workspace and all its data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Workspace
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the workspace
                        "{settings.name}" and remove all associated data including projects, tasks,
                        and team members.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive text-destructive-foreground">
                        Delete Workspace
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LazyDashboardLayout>
  );
}
