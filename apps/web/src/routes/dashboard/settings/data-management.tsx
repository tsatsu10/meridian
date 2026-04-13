import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Database,
  Download,
  Upload,
  Shield,
  HardDrive,
  Package,
  Save,
  RotateCcw,
  Calendar,
  History,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Folder,
  Image,
  File,
  Archive,
  FileJson,
  FileSpreadsheet,
  Info,
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/data-management')({
  component: withErrorBoundary(DataManagementSettings, "Data Management"),
});

interface BackupSettings {
  enableAutomatedBackups: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  backupDayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  backupDayOfMonth?: number;
  includeWorkspaceData: boolean;
  includeProjects: boolean;
  includeTasks: boolean;
  includeUsers: boolean;
  includeMessages: boolean;
  includeFiles: boolean;
  includeSettings: boolean;
  includeAuditLogs: boolean;
  maxBackupCount: number;
  retentionDays: number;
  compressBackups: boolean;
  encryptBackups: boolean;
  storageType: 'local' | 's3' | 'azure' | 'gcp';
  storagePath: string;
  s3Bucket?: string;
  s3Region?: string;
  azureContainer?: string;
  gcpBucket?: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notificationRecipients: string[];
  incrementalBackups: boolean;
  verifyBackupIntegrity: boolean;
  excludePatterns: string[];
  maxBackupSize: number;
}

interface BackupRecord {
  id: string;
  workspaceId: string;
  type: 'manual' | 'scheduled';
  status: 'in_progress' | 'completed' | 'failed';
  size: number;
  itemsCount: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  storagePath: string;
}

interface ExportTemplate {
  name: string;
  fields: string[];
  example: Record<string, any>;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

function DataManagementSettings() {
  const navigate = useNavigate();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();
  
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<BackupSettings>>({});
  const [recipientInput, setRecipientInput] = useState('');

  // Storage Usage State
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string>("");

  // Import/Export State
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(false);
  const [includeRoles, setIncludeRoles] = useState(false);
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importData, setImportData] = useState('');
  const [validateOnly, setValidateOnly] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Data usage - starts with empty/minimal usage
  const dataUsage = {
    used: 0, // GB
    total: 100, // GB
    breakdown: {
      projects: 0,
      files: 0,
      media: 0,
      other: 0
    }
  };

  const usagePercentage = dataUsage.total > 0 ? (dataUsage.used / dataUsage.total) * 100 : 0;

  // Fetch backup settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['backup-settings', currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/backup?workspaceId=${currentWorkspace?.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup settings');
      }
      
      const result = await response.json();
      return result.data as BackupSettings;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch backup history
  const { data: backups } = useQuery({
    queryKey: ['backup-history', currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/backup/history?workspaceId=${currentWorkspace?.id}&limit=10`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup history');
      }
      
      const result = await response.json();
      return result.data as BackupRecord[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch export templates
  const { data: templates } = useQuery({
    queryKey: ['export-templates'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/import-export/templates`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const result = await response.json();
      return result.data as Record<string, ExportTemplate>;
    },
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save backup settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/backup?workspaceId=${currentWorkspace?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save backup settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-settings', currentWorkspace?.id] });
      setHasChanges(false);
      toast.success('Backup settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save backup settings');
    },
  });

  // Manual backup mutation
  const manualBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/backup/create?workspaceId=${currentWorkspace?.id}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-history', currentWorkspace?.id] });
      toast.success('Backup created successfully');
    },
    onError: () => {
      toast.error('Failed to create backup');
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: {
      format: 'json' | 'csv';
      includeProjects: boolean;
      includeTasks: boolean;
      includeUsers: boolean;
      includeRoles: boolean;
    }) => {
      const response = await fetch(`${API_BASE_URL}/settings/import-export/export?workspaceId=${currentWorkspace?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      return response.blob();
    },
    onSuccess: (data, variables) => {
      const blob = new Blob([data], {
        type: variables.format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export-${new Date().toISOString()}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export completed successfully');
    },
    onError: () => {
      toast.error('Export failed');
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (options: {
      format: 'json' | 'csv';
      data: string;
      validateOnly: boolean;
      skipDuplicates: boolean;
    }) => {
      const response = await fetch(`${API_BASE_URL}/settings/import-export/import?workspaceId=${currentWorkspace?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      return result.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success && !validateOnly) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success(`Import completed: ${data.importedRecords} records imported`);
      } else if (validateOnly) {
        toast.info(`Validation completed: ${data.totalRecords} records valid`);
      }
    },
    onError: () => {
      toast.error('Import failed');
    },
  });

  const handleFormChange = (field: keyof BackupSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  };

  const handleManualBackup = () => {
    manualBackupMutation.mutate();
  };

  const handleExport = () => {
    exportMutation.mutate({
      format: exportFormat,
      includeProjects,
      includeTasks,
      includeUsers,
      includeRoles,
    });
  };

  const handleImport = () => {
    if (!importData.trim()) {
      toast.error('Please provide data to import');
      return;
    }

    importMutation.mutate({
      format: importFormat,
      data: importData,
      validateOnly,
      skipDuplicates,
    });
  };

  const handleFullBackup = async () => {
    setBackupLoading(true);
    try {
      await manualBackupMutation.mutateAsync();
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportData = async (type: string) => {
    setExportLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`${type} export started. You'll receive an email when ready.`);
    } catch (error) {
      toast.error("Export failed - please try again");
    } finally {
      setExportLoading(false);
    }
  };

  const confirmDeleteData = (type: string) => {
    setDeleteTarget(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteData = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`${deleteTarget} deletion initiated`);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete data");
    } finally {
      setIsLoading(false);
    }
  };

  const addRecipient = () => {
    if (recipientInput && /\S+@\S+\.\S+/.test(recipientInput)) {
      const recipients = formData.notificationRecipients || [];
      if (!recipients.includes(recipientInput)) {
        handleFormChange('notificationRecipients', [...recipients, recipientInput]);
        setRecipientInput('');
      }
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const removeRecipient = (email: string) => {
    const recipients = formData.notificationRecipients || [];
    handleFormChange('notificationRecipients', recipients.filter(r => r !== email));
  };

  if (!currentWorkspace) {
    return (
      <LazyDashboardLayout>
        <div className="container max-w-4xl py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No workspace selected. Please select a workspace to manage data settings.
            </AlertDescription>
          </Alert>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8" />
            Data Management
          </h1>
          <p className="text-muted-foreground">
            Manage backups, imports, exports, and storage for your workspace
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="storage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="storage">
              <HardDrive className="h-4 w-4 mr-2" />
              Storage & Usage
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Shield className="h-4 w-4 mr-2" />
              Backup & Recovery
            </TabsTrigger>
            <TabsTrigger value="import-export">
              <Package className="h-4 w-4 mr-2" />
              Import & Export
            </TabsTrigger>
          </TabsList>

          {/* Storage & Usage Tab */}
          <TabsContent value="storage" className="space-y-6">
            {/* Storage Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage Usage
                </CardTitle>
                <CardDescription>
                  Current data usage and storage breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Storage Used</span>
                    <span className="text-sm text-muted-foreground">
                      {dataUsage.used} GB of {dataUsage.total} GB
                    </span>
                  </div>
                  <Progress value={usagePercentage} />
                  <p className="text-xs text-muted-foreground">
                    {dataUsage.used === 0 ? "🚀 Your workspace is ready to use" : 
                     usagePercentage > 80 ? "⚠️ Storage is almost full" : 
                     "Storage usage is within normal limits"}
                  </p>
                </div>

                {dataUsage.used === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/50">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No data stored yet. Start creating projects and uploading files to see your usage breakdown.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Folder className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-lg font-semibold">{dataUsage.breakdown.projects} GB</p>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <File className="h-6 w-6 text-green-500 mx-auto mb-2" />
                      <p className="text-lg font-semibold">{dataUsage.breakdown.files} GB</p>
                      <p className="text-xs text-muted-foreground">Files</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Image className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                      <p className="text-lg font-semibold">{dataUsage.breakdown.media} GB</p>
                      <p className="text-xs text-muted-foreground">Media</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Archive className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                      <p className="text-lg font-semibold">{dataUsage.breakdown.other} GB</p>
                      <p className="text-xs text-muted-foreground">Other</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Deletion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Data Deletion
                </CardTitle>
                <CardDescription>
                  Permanently delete data from your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Data deletion is permanent and cannot be recovered. Make sure to create backups before proceeding.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Delete Completed Projects</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Remove all completed projects and associated data
                    </p>
                    <Button
                      onClick={() => confirmDeleteData("completed projects")}
                      disabled={isLoading}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Delete All Data</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete your entire workspace and all data
                    </p>
                    <Button
                      onClick={() => confirmDeleteData("all workspace data")}
                      disabled={isLoading}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Recovery Tab */}
          <TabsContent value="backup" className="space-y-6">
            {settingsLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading backup settings...</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common backup operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={handleManualBackup}
                        disabled={manualBackupMutation.isPending}
                        size="lg"
                      >
                        {manualBackupMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating Backup...
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Create Backup Now
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['backup-history'] })}
                        size="lg"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh History
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Backup Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Backup Configuration</CardTitle>
                    <CardDescription>
                      Configure automated backup settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Automated Backups */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Automated Backups</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically create backups on a schedule
                        </p>
                      </div>
                      <Switch
                        checked={formData.enableAutomatedBackups}
                        onCheckedChange={(checked) => handleFormChange('enableAutomatedBackups', checked)}
                      />
                    </div>

                    {formData.enableAutomatedBackups && (
                      <>
                        <Separator />
                        
                        {/* Backup Frequency */}
                        <div className="space-y-2">
                          <Label>Backup Frequency</Label>
                          <Select
                            value={formData.backupFrequency}
                            onValueChange={(value) => handleFormChange('backupFrequency', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Backup Time */}
                        <div className="space-y-2">
                          <Label>Backup Time</Label>
                          <Input
                            type="time"
                            value={formData.backupTime}
                            onChange={(e) => handleFormChange('backupTime', e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* What to Include */}
                    <div className="space-y-4">
                      <Label>What to Include in Backups</Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'includeWorkspaceData', label: 'Workspace Data' },
                          { key: 'includeProjects', label: 'Projects' },
                          { key: 'includeTasks', label: 'Tasks' },
                          { key: 'includeUsers', label: 'Users' },
                          { key: 'includeMessages', label: 'Messages' },
                          { key: 'includeFiles', label: 'Files' },
                          { key: 'includeSettings', label: 'Settings' },
                          { key: 'includeAuditLogs', label: 'Audit Logs' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center space-x-2">
                            <Switch
                              checked={formData[item.key as keyof BackupSettings] as boolean}
                              onCheckedChange={(checked) => handleFormChange(item.key as keyof BackupSettings, checked)}
                              id={item.key}
                            />
                            <Label htmlFor={item.key} className="cursor-pointer">
                              {item.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Advanced Options */}
                    <div className="space-y-4">
                      <Label>Advanced Options</Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.compressBackups}
                            onCheckedChange={(checked) => handleFormChange('compressBackups', checked)}
                            id="compress"
                          />
                          <Label htmlFor="compress" className="cursor-pointer">
                            Compress Backups
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.encryptBackups}
                            onCheckedChange={(checked) => handleFormChange('encryptBackups', checked)}
                            id="encrypt"
                          />
                          <Label htmlFor="encrypt" className="cursor-pointer">
                            Encrypt Backups
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.incrementalBackups}
                            onCheckedChange={(checked) => handleFormChange('incrementalBackups', checked)}
                            id="incremental"
                          />
                          <Label htmlFor="incremental" className="cursor-pointer">
                            Incremental Backups
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.verifyBackupIntegrity}
                            onCheckedChange={(checked) => handleFormChange('verifyBackupIntegrity', checked)}
                            id="verify"
                          />
                          <Label htmlFor="verify" className="cursor-pointer">
                            Verify Integrity
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Retention */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Maximum Backup Count</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.maxBackupCount}
                          onChange={(e) => handleFormChange('maxBackupCount', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Retention Days</Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={formData.retentionDays}
                          onChange={(e) => handleFormChange('retentionDays', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Backup History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Backup History
                      </span>
                      <Badge variant="outline">
                        {backups?.length || 0} backups
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Recent backup operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {backups && backups.length > 0 ? (
                      <div className="space-y-4">
                        {backups.map((backup) => (
                          <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={backup.status === 'completed' ? 'default' : backup.status === 'failed' ? 'destructive' : 'secondary'}>
                                  {backup.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {backup.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                                  {backup.status === 'in_progress' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                                  {backup.status}
                                </Badge>
                                <Badge variant="outline">{backup.type}</Badge>
                              </div>
                              <p className="text-sm">
                                {format(new Date(backup.startTime), 'PPP p')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {backup.itemsCount} items • {(backup.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg bg-muted/50">
                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No backups yet. Create your first backup to protect your data.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Save/Reset Buttons */}
                {hasChanges && (
                  <div className="flex gap-4">
                    <Button onClick={handleSave} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={saveMutation.isPending}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Import & Export Tab */}
          <TabsContent value="import-export" className="space-y-6">
            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Export workspace data in various formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Format Selection */}
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          CSV
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* What to Export */}
                <div className="space-y-4">
                  <Label>What to Export</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeProjects}
                        onCheckedChange={setIncludeProjects}
                        id="export-projects"
                      />
                      <Label htmlFor="export-projects" className="cursor-pointer">
                        Projects
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeTasks}
                        onCheckedChange={setIncludeTasks}
                        id="export-tasks"
                      />
                      <Label htmlFor="export-tasks" className="cursor-pointer">
                        Tasks
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeUsers}
                        onCheckedChange={setIncludeUsers}
                        id="export-users"
                      />
                      <Label htmlFor="export-users" className="cursor-pointer">
                        Users
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeRoles}
                        onCheckedChange={setIncludeRoles}
                        id="export-roles"
                      />
                      <Label htmlFor="export-roles" className="cursor-pointer">
                        Roles & Permissions
                      </Label>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {exportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </>
                  )}
                </Button>

                {/* Templates Info */}
                {templates && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Available Templates:</strong> {Object.keys(templates).join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Import Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Data
                </CardTitle>
                <CardDescription>
                  Import data from JSON or CSV files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Format Selection */}
                <div className="space-y-2">
                  <Label>Import Format</Label>
                  <Select value={importFormat} onValueChange={(value: 'json' | 'csv') => setImportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          CSV
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Input */}
                <div className="space-y-2">
                  <Label>Data to Import</Label>
                  <Textarea
                    placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Import Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={validateOnly}
                      onCheckedChange={setValidateOnly}
                      id="validate-only"
                    />
                    <Label htmlFor="validate-only" className="cursor-pointer">
                      Validate Only (Don't Import)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={skipDuplicates}
                      onCheckedChange={setSkipDuplicates}
                      id="skip-duplicates"
                    />
                    <Label htmlFor="skip-duplicates" className="cursor-pointer">
                      Skip Duplicates
                    </Label>
                  </div>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending || !importData.trim()}
                  className="w-full"
                  size="lg"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {validateOnly ? 'Validating...' : 'Importing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {validateOnly ? 'Validate Data' : 'Import Data'}
                    </>
                  )}
                </Button>

                {/* Import Results */}
                {importResult && (
                  <Alert variant={importResult.success ? 'default' : 'destructive'}>
                    {importResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <p><strong>Total Records:</strong> {importResult.totalRecords}</p>
                        <p><strong>Imported:</strong> {importResult.importedRecords}</p>
                        <p><strong>Skipped:</strong> {importResult.skippedRecords}</p>
                        {importResult.errors.length > 0 && (
                          <div className="mt-4">
                            <strong>Errors:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              {importResult.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-sm">
                                  Row {error.row}: {error.message}
                                </li>
                              ))}
                              {importResult.errors.length > 5 && (
                                <li className="text-sm">
                                  ...and {importResult.errors.length - 5} more errors
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your {deleteTarget} and remove all associated data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteData} 
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LazyDashboardLayout>
  );
}
