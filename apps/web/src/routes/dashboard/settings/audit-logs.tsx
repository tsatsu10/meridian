import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  TrendingUp,
  Settings,
  ArrowLeft,
  Save,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { format } from 'date-fns';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/audit-logs')({
  component: withErrorBoundary(AuditLogsSettings, "Audit Logs Settings"),
});

interface AuditLog {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  changes: any;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

interface AuditLogSettings {
  enableAuditLogs: boolean;
  logUserActions: boolean;
  logSystemActions: boolean;
  logAPIRequests: boolean;
  logSecurityEvents: boolean;
  retentionDays: number;
  autoArchiveEnabled: boolean;
  archiveAfterDays: number;
  autoDeleteEnabled: boolean;
  deleteAfterDays: number;
  logIPAddresses: boolean;
  logUserAgents: boolean;
  logMetadata: boolean;
  logChanges: boolean;
  excludeActions: string[];
  excludeEntityTypes: string[];
  anonymizeUserData: boolean;
  anonymizeAfterDays: number;
  immutableLogs: boolean;
  requireApprovalForDeletion: boolean;
  notifyOnCriticalActions: boolean;
  criticalActions: string[];
  allowLogExport: boolean;
  exportFormat: 'json' | 'csv' | 'both';
  includeMetadataInExport: boolean;
}

function AuditLogsSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<AuditLogSettings>>({});
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedEntityType, setSelectedEntityType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Fetch audit log settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['audit-log-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/audit/${currentWorkspace.id}/settings`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit log settings');
      }
      
      const result = await response.json();
      return result.data as AuditLogSettings;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', currentWorkspace?.id, startDate, endDate, selectedUser, selectedAction, selectedEntityType, searchTerm, currentPage],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedUser && selectedUser !== 'all') params.append('userEmail', selectedUser);
      if (selectedAction && selectedAction !== 'all') params.append('action', selectedAction);
      if (selectedEntityType && selectedEntityType !== 'all') params.append('entityType', selectedEntityType);
      if (searchTerm) params.append('searchTerm', searchTerm);
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      
      const response = await fetch(`${API_BASE_URL}/settings/audit/${currentWorkspace.id}/logs?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      const result = await response.json();
      return result.data;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['audit-filter-options', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/audit/${currentWorkspace.id}/filters`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      
      const result = await response.json();
      return result.data;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['audit-stats', currentWorkspace?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`${API_BASE_URL}/settings/audit/${currentWorkspace.id}/stats?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit stats');
      }
      
      const result = await response.json();
      return result.data;
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
    mutationFn: async (updates: Partial<AuditLogSettings>) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/audit/${currentWorkspace.id}/settings`, {
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
      queryClient.invalidateQueries({ queryKey: ['audit-log-settings', currentWorkspace?.id] });
      toast.success('Audit log settings updated successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const handleChange = (field: keyof AuditLogSettings, value: any) => {
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

  const handleExport = async (format: 'json' | 'csv') => {
    if (!currentWorkspace) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings/audit/${currentWorkspace.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ format, startDate, endDate }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to export logs');
      }
      
      const result = await response.json();
      const { data, filename, mimeType } = result.data;
      
      // Create download
      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Audit logs exported successfully');
    } catch (error: any) {
      toast.error(`Failed to export logs: ${error.message}`);
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUser('all');
    setSelectedAction('all');
    setSelectedEntityType('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (settingsLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate({ to: '/dashboard/settings' })} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8" /> Audit Logs & Activity
              </h1>
              <p className="text-muted-foreground">View workspace activity and configure audit logging</p>
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

        <Tabs defaultValue="logs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="logs">
              <Activity className="h-4 w-4 mr-2" />
              Activity Logs
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="h-4 w-4 mr-2" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Activity Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            {/* Filters Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {filterOptions?.users.map((user: any) => (
                          <SelectItem key={user.email} value={user.email}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="action">Action</Label>
                    <Select value={selectedAction} onValueChange={setSelectedAction}>
                      <SelectTrigger id="action">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        {filterOptions?.actions.map((action: string) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entityType">Entity Type</Label>
                    <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                      <SelectTrigger id="entityType">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {filterOptions?.entityTypes.map((type: string) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search logs..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleClearFilters} variant="outline" size="sm">
                    Clear Filters
                  </Button>
                  <Button onClick={() => handleExport('json')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>
                  Showing {logsData?.logs.length || 0} of {logsData?.total || 0} activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading activities...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logsData?.logs.map((log: AuditLog) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className="flex-shrink-0">
                          <Activity className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.userName || log.userEmail}</span>
                              <Badge variant="secondary">{log.action}</Badge>
                              <Badge variant="outline">{log.entityType}</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {log.entityName && (
                            <p className="text-sm text-muted-foreground">
                              {log.entityName}
                            </p>
                          )}
                          {log.ipAddress && (
                            <p className="text-xs text-muted-foreground">
                              IP: {log.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {logsData?.logs.length === 0 && (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No activity logs found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {logsData && logsData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {logsData.page} of {logsData.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={logsData.page === 1}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(p => Math.min(logsData.totalPages, p + 1))}
                        disabled={logsData.page === logsData.totalPages}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalActions || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.actionsByUser ? Object.keys(stats.actionsByUser).length : 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Action Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.actionsByType ? Object.keys(stats.actionsByType).length : 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.actionsByEntity ? Object.keys(stats.actionsByEntity).length : 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Actions by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.actionsByType && Object.entries(stats.actionsByType)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between">
                        <span className="text-sm">{action}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Logging Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Logging Configuration</CardTitle>
                <CardDescription>Control what gets logged</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Audit Logs</Label>
                  <Switch
                    checked={formData.enableAuditLogs ?? true}
                    onCheckedChange={(checked) => handleChange('enableAuditLogs', checked)}
                  />
                </div>

                {formData.enableAuditLogs && (
                  <>
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <Label>Log User Actions</Label>
                      <Switch
                        checked={formData.logUserActions ?? true}
                        onCheckedChange={(checked) => handleChange('logUserActions', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Log System Actions</Label>
                      <Switch
                        checked={formData.logSystemActions ?? true}
                        onCheckedChange={(checked) => handleChange('logSystemActions', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Log API Requests</Label>
                      <Switch
                        checked={formData.logAPIRequests ?? false}
                        onCheckedChange={(checked) => handleChange('logAPIRequests', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Log Security Events</Label>
                      <Switch
                        checked={formData.logSecurityEvents ?? true}
                        onCheckedChange={(checked) => handleChange('logSecurityEvents', checked)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Retention Policies */}
            <Card>
              <CardHeader>
                <CardTitle>Retention Policies</CardTitle>
                <CardDescription>Configure how long logs are kept</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="retentionDays">Retention Period (days)</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min="1"
                    max="3650"
                    value={formData.retentionDays || 90}
                    onChange={(e) => handleChange('retentionDays', parseInt(e.target.value))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Archive</Label>
                    <p className="text-sm text-muted-foreground">Archive old logs automatically</p>
                  </div>
                  <Switch
                    checked={formData.autoArchiveEnabled ?? false}
                    onCheckedChange={(checked) => handleChange('autoArchiveEnabled', checked)}
                  />
                </div>

                {formData.autoArchiveEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="archiveAfterDays">Archive After (days)</Label>
                    <Input
                      id="archiveAfterDays"
                      type="number"
                      min="1"
                      max="3650"
                      value={formData.archiveAfterDays || 365}
                      onChange={(e) => handleChange('archiveAfterDays', parseInt(e.target.value))}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Delete</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete old logs</p>
                  </div>
                  <Switch
                    checked={formData.autoDeleteEnabled ?? false}
                    onCheckedChange={(checked) => handleChange('autoDeleteEnabled', checked)}
                  />
                </div>

                {formData.autoDeleteEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="deleteAfterDays">Delete After (days)</Label>
                    <Input
                      id="deleteAfterDays"
                      type="number"
                      min="1"
                      max="3650"
                      value={formData.deleteAfterDays || 730}
                      onChange={(e) => handleChange('deleteAfterDays', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance & Security</CardTitle>
                <CardDescription>Configure compliance and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Immutable Logs</Label>
                    <p className="text-sm text-muted-foreground">Prevent log modification</p>
                  </div>
                  <Switch
                    checked={formData.immutableLogs ?? true}
                    onCheckedChange={(checked) => handleChange('immutableLogs', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval for Deletion</Label>
                    <p className="text-sm text-muted-foreground">Admin approval required to delete logs</p>
                  </div>
                  <Switch
                    checked={formData.requireApprovalForDeletion ?? true}
                    onCheckedChange={(checked) => handleChange('requireApprovalForDeletion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notify on Critical Actions</Label>
                    <p className="text-sm text-muted-foreground">Send alerts for critical activities</p>
                  </div>
                  <Switch
                    checked={formData.notifyOnCriticalActions ?? true}
                    onCheckedChange={(checked) => handleChange('notifyOnCriticalActions', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Allow Log Export</Label>
                  <Switch
                    checked={formData.allowLogExport ?? true}
                    onCheckedChange={(checked) => handleChange('allowLogExport', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LazyDashboardLayout>
  );
}
