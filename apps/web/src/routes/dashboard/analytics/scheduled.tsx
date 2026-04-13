import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Calendar, Clock, Mail, Play, Pause, Settings, Download, Eye, Plus, Filter, Search, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useRBACAuth } from '@/lib/permissions';
import useWorkspaceStore from '@/store/workspace';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/analytics/scheduled')({
  component: withErrorBoundary(ScheduledReportsPage, "Scheduled Reports"),
});

interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  nextRun: string;
  lastRun?: string;
  status: 'active' | 'paused' | 'error';
  deliveryMethod: 'email' | 'slack' | 'teams' | 'webhook';
  recipients: number;
  successRate: number;
  executionCount: number;
  avgExecutionTime: number;
  tags: string[];
}

interface ReportExecution {
  id: string;
  reportId: string;
  reportName: string;
  executedAt: string;
  status: 'completed' | 'failed' | 'running' | 'cancelled';
  executionTime: number;
  recordCount: number;
  deliveryStatus: 'sent' | 'failed' | 'pending';
  size: string;
}

function ScheduledReportsPage() {
  const { hasPermission } = useRBACAuth();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const navigate = useNavigate();
  
  // Check for authentication and workspace access
  if (!hasPermission("canViewAnalytics")) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view scheduled reports.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard/analytics" })}>
              Return to Analytics
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Check for workspace availability
  if (!currentWorkspace) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Workspace Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select a workspace to view scheduled reports.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard" })}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState('reports');

  // Sample data - replace with actual API calls
  const scheduledReports: ScheduledReport[] = [
    {
      id: '1',
      name: 'Weekly Project Status Report',
      description: 'Comprehensive project progress and team performance metrics',
      frequency: 'weekly',
      nextRun: '2024-01-15T09:00:00Z',
      lastRun: '2024-01-08T09:00:00Z',
      status: 'active',
      deliveryMethod: 'email',
      recipients: 5,
      successRate: 95,
      executionCount: 48,
      avgExecutionTime: 12000,
      tags: ['project', 'weekly', 'management']
    },
    {
      id: '2',
      name: 'Daily Task Completion Dashboard',
      description: 'Real-time task completion rates and team productivity',
      frequency: 'daily',
      nextRun: '2024-01-09T08:00:00Z',
      lastRun: '2024-01-08T08:00:00Z',
      status: 'active',
      deliveryMethod: 'slack',
      recipients: 12,
      successRate: 98,
      executionCount: 365,
      avgExecutionTime: 5000,
      tags: ['daily', 'tasks', 'productivity']
    },
    {
      id: '3',
      name: 'Monthly Financial Summary',
      description: 'Budget utilization and cost analysis across all projects',
      frequency: 'monthly',
      nextRun: '2024-02-01T00:00:00Z',
      lastRun: '2024-01-01T00:00:00Z',
      status: 'error',
      deliveryMethod: 'email',
      recipients: 3,
      successRate: 87,
      executionCount: 12,
      avgExecutionTime: 25000,
      tags: ['monthly', 'finance', 'budget']
    }
  ];

  const recentExecutions: ReportExecution[] = [
    {
      id: '1',
      reportId: '1',
      reportName: 'Weekly Project Status Report',
      executedAt: '2024-01-08T09:00:00Z',
      status: 'completed',
      executionTime: 11500,
      recordCount: 1245,
      deliveryStatus: 'sent',
      size: '2.1 MB'
    },
    {
      id: '2',
      reportId: '2',
      reportName: 'Daily Task Completion Dashboard',
      executedAt: '2024-01-08T08:00:00Z',
      status: 'completed',
      executionTime: 4800,
      recordCount: 892,
      deliveryStatus: 'sent',
      size: '450 KB'
    },
    {
      id: '3',
      reportId: '3',
      reportName: 'Monthly Financial Summary',
      executedAt: '2024-01-01T00:00:00Z',
      status: 'failed',
      executionTime: 0,
      recordCount: 0,
      deliveryStatus: 'failed',
      size: '0 KB'
    }
  ];

  const filteredReports = scheduledReports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesFrequency = frequencyFilter === 'all' || report.frequency === frequencyFilter;
    
    return matchesSearch && matchesStatus && matchesFrequency;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatNextRun = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'soon';
  };

  return (
    <LazyDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scheduled Reports</h1>
            <p className="text-muted-foreground">Manage automated report generation and delivery</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Config
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Reports</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+2 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">94%</p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+3% from last week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Executions</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">On track with target</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Recipients</p>
                  <p className="text-2xl font-bold">47</p>
                </div>
                <Mail className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Across all reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
            <TabsTrigger value="executions">Execution History</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Scheduled Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reports, descriptions, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Frequencies</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <div className="grid gap-6">
              {filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{report.name}</h3>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                          <Badge variant="outline">
                            {report.frequency}
                          </Badge>
                        </div>
                        
                        {report.description && (
                          <p className="text-muted-foreground mb-3">{report.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                          {report.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Next Run</p>
                            <p className="font-medium">{formatNextRun(report.nextRun)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Recipients</p>
                            <p className="font-medium">{report.recipients} {report.deliveryMethod}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                            <div className="flex items-center gap-2">
                              <Progress value={report.successRate} className="flex-1 h-2" />
                              <span className="text-sm font-medium">{report.successRate}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Executions</p>
                            <p className="font-medium">{report.executionCount} total</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Run Now
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 mr-2" />
                              Edit Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Delete Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Execution History Tab */}
          <TabsContent value="executions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>
                  Track report generation and delivery status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentExecutions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">{execution.reportName}</h4>
                          <Badge className={getExecutionStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Executed {new Date(execution.executedAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-6 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">{formatDuration(execution.executionTime)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Records</p>
                          <p className="font-medium">{execution.recordCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className="font-medium">{execution.size}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Delivery</p>
                          <Badge variant={execution.deliveryStatus === 'sent' ? 'default' : 'secondary'}>
                            {execution.deliveryStatus}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-6">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>
                  Pre-configured report templates for quick scheduling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Template management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Settings</CardTitle>
                <CardDescription>
                  Configure email templates, notification preferences, and delivery methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Settings panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LazyDashboardLayout>
  );
} 