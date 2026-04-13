import React, { useState, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  CheckCircle,
  AlertTriangle,
  Users,
  FolderOpen,
  Calendar,
  RefreshCw,
  Shield,
  Bell,
  Target,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/cn";
import useWorkspaceStore from "@/store/workspace";
import { useDashboardData } from "@/hooks/queries/dashboard/use-dashboard-data";
import { useOptimizedDashboardState } from "@/hooks/use-optimized-dashboard-state";
import { useRiskMonitor } from "@/hooks/queries/risk/use-risk-detection";
import { getNotificationsFromStore } from "@/hooks/mutations/task/use-auto-status-update";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import { 
  OptimizedStatsCard, 
  OptimizedProjectCard, 
  OptimizedChart,
  OptimizedNotificationItem 
} from "@/components/performance/optimized-components";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import UniversalHeader from "@/components/dashboard/universal-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logger } from "../../lib/logger";

/**
 * Optimized Dashboard Overview Component
 * @epic-2.4-performance: Eliminates excessive re-renders and localStorage writes
 * - Replaces 8 separate useEffect hooks with single batched localStorage
 * - Uses React.memo for all child components
 * - Implements proper useCallback and useMemo patterns
 * - Debounces state updates to prevent performance issues
 */

// Memoized sub-components to prevent unnecessary re-renders
const StatsSection = memo<{
  dashboardData: any;
  riskData: any;
  allNotifications: any[];
}>(({ dashboardData, riskData, allNotifications }) => {
  const stats = useMemo(() => [
    {
      title: "Total Tasks",
      value: dashboardData?.stats?.totalTasks || 0,
      icon: CheckCircle,
      description: `${dashboardData?.stats?.completedTasks || 0} completed`,
      colorScheme: "success" as const,
      trend: "up" as const,
      trendValue: 12.5
    },
    {
      title: "Active Projects", 
      value: dashboardData?.projects?.length || 0,
      icon: FolderOpen,
      description: `${dashboardData?.projects?.filter((p: any) => p.status !== 'completed').length || 0} in progress`,
      colorScheme: "info" as const,
      trend: "up" as const,
      trendValue: 8.3
    },
    {
      title: "Risk Score",
      value: riskData.data?.overallRiskScore || 0,
      icon: Shield,
      description: riskData.hasHighRisk ? `${riskData.highPriorityRisks.length} alerts` : 'All good',
      colorScheme: (riskData.data?.overallRiskScore || 0) > 70 ? "danger" : 
                  (riskData.data?.overallRiskScore || 0) > 40 ? "warning" : "success" as const,
      trend: riskData.hasHighRisk ? "down" : "neutral" as const,
      suffix: "/100"
    },
    {
      title: "Notifications",
      value: allNotifications.length,
      icon: Bell,
      description: `${allNotifications.filter(n => !n.isRead).length} unread`,
      colorScheme: "primary" as const,
      trend: "up" as const,
      trendValue: 5
    }
  ], [dashboardData, riskData, allNotifications]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <OptimizedStatsCard
          key={stat.title}
          {...stat}
          className="transition-all duration-200 hover:scale-105"
        />
      ))}
    </div>
  );
});

StatsSection.displayName = 'StatsSection';

const ProjectsSection = memo<{
  dashboardData: any;
  workspace: any;
  onCreateProject: () => void;
  hasPermission: (action: string, context?: any) => boolean;
}>(({ dashboardData, workspace, onCreateProject, hasPermission }) => {
  const projects = useMemo(() => 
    dashboardData?.projects?.slice(0, 5) || [], 
    [dashboardData?.projects]
  );

  const handleNavigate = useCallback((projectId: string) => {
    // Handle navigation - implement based on your routing setup
    logger.info("Navigate to project:");
  }, []);

  if (!projects.length) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Recent Projects
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects yet</p>
            <p className="text-xs">Create your first project to get started</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={onCreateProject}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Recent Projects
          </CardTitle>
          {hasPermission("canCreateProjects", {}) && (
            <Button variant="outline" size="sm" onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project: any) => (
          <OptimizedProjectCard
            key={project.id}
            project={project}
            workspace={workspace}
            onNavigate={handleNavigate}
          />
        ))}
      </CardContent>
    </Card>
  );
});

ProjectsSection.displayName = 'ProjectsSection';

const NotificationsSection = memo<{ 
  notifications: any[];
}>(({ notifications }) => {
  const recentNotifications = useMemo(() => 
    notifications.slice(0, 5), 
    [notifications]
  );
  
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
    [notifications]
  );

  const handleMarkRead = useCallback((id: string) => {
    // Implement mark as read functionality
    logger.info("Mark notification as read:");
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Recent Activity
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentNotifications.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <OptimizedNotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
});

NotificationsSection.displayName = 'NotificationsSection';

const ChartsSection = memo<{
  dashboardData: any;
  productivityChartType: any;
  workspaceHealthChartType: any;
  onProductivityChartTypeChange: (type: any) => void;
  onWorkspaceHealthChartTypeChange: (type: any) => void;
  onExport: (name: string, data: any) => void;
}>(({ 
  dashboardData, 
  productivityChartType, 
  workspaceHealthChartType,
  onProductivityChartTypeChange,
  onWorkspaceHealthChartTypeChange,
  onExport
}) => {
  const productivityData = useMemo(() => {
    if (!dashboardData) return [];
    
    // Generate mock productivity data
    return Array.from({ length: 7 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 100)
    }));
  }, [dashboardData]);

  const workspaceHealthData = useMemo(() => {
    if (!dashboardData) return [];
    
    const { stats } = dashboardData;
    return [
      { label: 'Completed', value: stats?.completedTasks || 0 },
      { label: 'In Progress', value: (stats?.totalTasks || 0) - (stats?.completedTasks || 0) - (stats?.overdueTasks || 0) },
      { label: 'Overdue', value: stats?.overdueTasks || 0 }
    ].filter(item => item.value > 0);
  }, [dashboardData]);

  const handleProductivityExport = useCallback(() => {
    onExport('productivity', productivityData);
  }, [onExport, productivityData]);

  const handleWorkspaceExport = useCallback(() => {
    onExport('workspace-health', workspaceHealthData);
  }, [onExport, workspaceHealthData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <OptimizedChart
        title="Productivity Trends"
        data={productivityData}
        chartType={productivityChartType}
        onChartTypeChange={onProductivityChartTypeChange}
        onExport={handleProductivityExport}
        height={300}
      />
      <OptimizedChart
        title="Workspace Health"
        data={workspaceHealthData}
        chartType={workspaceHealthChartType}
        onChartTypeChange={onWorkspaceHealthChartTypeChange}
        onExport={handleWorkspaceExport}
        height={300}
      />
    </div>
  );
});

ChartsSection.displayName = 'ChartsSection';

export const OptimizedDashboardOverview = memo(() => {
  const { workspace } = useWorkspaceStore();
  
  // Single optimized state hook replaces 8 separate useEffect hooks
  const {
    viewMode,
    isEditMode,
    productivityChartType,
    workspaceHealthChartType,
    filters,
    setProductivityChartType,
    setWorkspaceHealthChartType,
    setFilters,
    isLoading: stateLoading
  } = useOptimizedDashboardState();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const riskData = useRiskMonitor(workspace?.id || '', "30d");

  // Optimized notifications with useMemo
  const allNotifications = useMemo(() => {
    const autoNotifications = getNotificationsFromStore();
    const notifications = Array.isArray(autoNotifications) ? autoNotifications : [];
    return [...notifications].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  // Memoized permission check (mock implementation)
  const hasPermission = useCallback((action: string, context?: any) => {
    // Implement actual permission logic
    return true;
  }, []);

  // Optimized event handlers with useCallback
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleChartExport = useCallback((chartName: string, data: any) => {
    try {
      const csvContent = data.map((item: any) => 
        `${item.label},${item.value}`
      ).join('\n');
      
      const blob = new Blob([`Label,Value\n${csvContent}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const handleCreateProject = useCallback(() => {
    setIsCreateProjectOpen(true);
  }, []);

  const handleCloseCreateProject = useCallback(() => {
    setIsCreateProjectOpen(false);
  }, []);

  // Early returns with loading states
  if (!workspace) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-muted rounded glass-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertTriangle className="h-12 w-12 text-orange-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Unable to load dashboard</h3>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LazyDashboardLayout>
      <UniversalHeader 
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with your projects."
        variant="default"
        customActions={
          <div className="flex items-center space-x-3">
            <ThemeToggle showLabels={false} />
            
            {riskData.hasHighRisk && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg glass-card">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Risks Detected</span>
                <Badge variant="secondary" className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                  {riskData.highPriorityRisks.length}
                </Badge>
              </div>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />
      
      <div className="space-y-6">
        {/* Optimized Stats Section */}
        <StatsSection 
          dashboardData={dashboardData}
          riskData={riskData}
          allNotifications={allNotifications}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Projects */}
          <div className="lg:col-span-3 space-y-6">
            <ProjectsSection
              dashboardData={dashboardData}
              workspace={workspace}
              onCreateProject={handleCreateProject}
              hasPermission={hasPermission}
            />
            
            {/* Charts Section */}
            <ChartsSection
              dashboardData={dashboardData}
              productivityChartType={productivityChartType}
              workspaceHealthChartType={workspaceHealthChartType}
              onProductivityChartTypeChange={setProductivityChartType}
              onWorkspaceHealthChartTypeChange={setWorkspaceHealthChartType}
              onExport={handleChartExport}
            />
          </div>

          {/* Right Column: Notifications */}
          <div className="lg:col-span-2">
            <NotificationsSection notifications={allNotifications} />
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={handleCloseCreateProject}
      />
    </LazyDashboardLayout>
  );
});

OptimizedDashboardOverview.displayName = 'OptimizedDashboardOverview';