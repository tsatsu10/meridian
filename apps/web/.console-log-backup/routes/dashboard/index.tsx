import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGamificationNotifications } from "@/hooks/use-gamification-notifications";
import {
  Plus,
  CheckCircle,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Bell,
  Target,
  Shield,
  AlertTriangle,
  Users,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useRBACAuth } from "@/lib/permissions";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useWorkspaceStore from "@/store/workspace";
import { useDashboardData } from "@/hooks/queries/dashboard/use-dashboard-data";
import { useRiskMonitor } from "@/hooks/queries/risk/use-risk-detection";
import { getNotificationsFromStore } from "@/hooks/mutations/task/use-auto-status-update";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import UniversalHeader from "@/components/dashboard/universal-header";

// Lazy load heavy components with better chunking
const CreateProjectModal = lazy(() => import("@/components/shared/modals/create-project-modal"));
const MilestoneDashboard = lazy(() => import("@/components/dashboard/milestone-dashboard"));
const AnimatedStatsCard = lazy(() => import("@/components/dashboard/animated-stats-card"));
const BlurFade = lazy(() => import("@/components/magicui/blur-fade").then(m => ({ default: m.BlurFade })));
const LazyDashboardLayout = lazy(() => import("@/components/performance/lazy-dashboard-layout"));
const InteractiveChart = lazy(() => import("@/components/dashboard/interactive-chart").then(m => ({ default: m.InteractiveChart })));
const OKRWidget = lazy(() => import("@/components/goals/okr-widget").then(m => ({ default: m.OKRWidget })));
const ProgressRings = lazy(() => import("@/components/gamification/progress-rings").then(m => ({ default: m.ProgressRings })));
const DailyChallengesWidget = lazy(() => import("@/components/gamification/daily-challenges-widget").then(m => ({ default: m.DailyChallengesWidget })));
const CelebrationFeed = lazy(() => import("@/components/gamification/celebration-feed").then(m => ({ default: m.CelebrationFeed })));
const TeamGoalsWidget = lazy(() => import("@/components/goals/team-goals-widget").then(m => ({ default: m.TeamGoalsWidget })));
const MilestoneCountdown = lazy(() => import("@/components/goals/milestone-countdown").then(m => ({ default: m.MilestoneCountdown })));
const AchievementBadgeWidget = lazy(() => import("@/components/gamification/achievement-badge-widget").then(m => ({ default: m.AchievementBadgeWidget })));
const StreakWidget = lazy(() => import("@/components/gamification/streak-widget").then(m => ({ default: m.StreakWidget })));
const LeaderboardWidget = lazy(() => import("@/components/gamification/leaderboard-widget").then(m => ({ default: m.LeaderboardWidget })));

// Import loading skeleton
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";

import { SmartFilters } from "@/components/dashboard/smart-filters";
import { QuickCaptureFAB } from "@/components/mobile/quick-capture-fab";

// Import types only (no runtime cost)
import type { ChartType } from "@/components/dashboard/interactive-chart";
import type { DashboardFilters } from "@/components/dashboard/advanced-filters";
import type { DashboardWidget } from "@/components/dashboard/customizable-dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverviewPage,
});

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const activityIcons = {
  task_completed: CheckCircle,
  task_created: Plus,
  project_created: FolderOpen,
  team_joined: Users,
};

type TimeRange = "7d" | "30d" | "90d" | "1y";

function DashboardOverviewPage() {
  const { workspace } = useWorkspaceStore();
  const { user } = useAuth();
  const userRole = user?.role;
  
  // 🎮 Enable gamification notifications
  useGamificationNotifications();
  
  // Safe RBAC hook usage with fallback
  let rbacAuth;
  let hasPermission = (action: string, context?: any) => false;
  
  try {
    rbacAuth = useRBACAuth();
    hasPermission = rbacAuth?.hasPermission || ((action: string, context?: any) => false);
  } catch (error) {
    console.warn("RBAC context not available, using fallback permissions");
    rbacAuth = null;
    hasPermission = (action: string, context?: any) => false;
  }
  
  // Early return if RBAC is still loading
  if (rbacAuth?.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50 dark:bg-gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }
  // Get user preferences with database persistence
  const { 
    dashboardLayout = {},
    updateDashboardLayout,
    isLoading: preferencesLoading 
  } = useUserPreferences();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [taskChartType, setTaskChartType] = useState<ChartType>(dashboardLayout.taskChartType || 'bar');
  const [projectHealthChartType, setProjectHealthChartType] = useState<ChartType>(dashboardLayout.healthChartType || 'pie');
  
  // Dashboard Filters State
  const [activeDashboardFilters, setActiveDashboardFilters] = useState<DashboardFilters>({
    timeRange: '30d',
    projectIds: [],
    userIds: [],
    priorities: [],
    status: [],
    tags: []
  });

  // Enhanced Dashboard State with database Persistence
  const [viewMode, setViewMode] = useState<'standard' | 'custom'>(dashboardLayout.viewMode || 'standard');
  const [isEditMode, setIsEditMode] = useState(dashboardLayout.isEditMode ?? false);
  const [productivityChartType, setProductivityChartType] = useState<ChartType>(dashboardLayout.productivityChartType || 'line');
  const [workspaceHealthChartType, setWorkspaceHealthChartType] = useState<ChartType>(dashboardLayout.workspaceHealthChartType || 'pie');
  
  // Advanced Filters State with database Persistence
  const [filters, setFilters] = useState<DashboardFilters>(dashboardLayout.filters || {
    timeRange: '30d',
    projectIds: [],
    userIds: [],
    priorities: [],
    status: [],
    tags: []
  });

  // Customizable Dashboard Widgets with database Persistence
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>(dashboardLayout.widgets || [
    {
      id: 'productivity-chart',
      type: 'chart',
      title: 'Team Productivity',
      size: 'large',
      position: { row: 0, col: 0 },
      settings: { chartType: 'line', color: '#8b5cf6' }
    },
    {
      id: 'project-health',
      type: 'chart', 
      title: 'Project Health',
      size: 'medium',
      position: { row: 0, col: 1 },
      settings: { chartType: 'pie' }
    },
    {
      id: 'task-completion',
      type: 'chart',
      title: 'Task Completion',
      size: 'large', 
      position: { row: 1, col: 0 },
      settings: { chartType: 'bar', color: '#10b981' }
    },
    {
      id: 'team-activity',
      type: 'activity',
      title: 'Team Activity', 
      size: 'medium',
      position: { row: 1, col: 1 }
    }
  ]);

  // Risk monitoring integration - optimized for memory efficiency
  const allTasks = useMemo(() => {
    if (!dashboardData?.projects) return [];
    
    // Use optimized flatMap to reduce memory pressure
    const projects = dashboardData.projects;
    const result: any[] = [];
    
    for (const project of projects) {
      // Check for tasks in columns (Kanban structure)
      if (project.columns) {
        for (const col of project.columns) {
          if (col.tasks && Array.isArray(col.tasks)) {
            result.push(...col.tasks);
          }
        }
      }
      // Also check for tasks array directly on project
      if (project.tasks && Array.isArray(project.tasks)) {
        result.push(...project.tasks);
      }
    }
    
    // Limit to prevent memory issues
    return result.length > 2000 ? result.slice(0, 2000) : result;
  }, [dashboardData]);

  const riskData = useRiskMonitor(allTasks, dashboardData?.projects || []);

  // Enhanced notifications including auto-status updates, risk alerts, and generated activities
  const autoNotifications = getNotificationsFromStore();
  const allNotifications = useMemo(() => {
    // Ensure autoNotifications is always an array
    const notifications = Array.isArray(autoNotifications) ? autoNotifications : [];
    
    // Convert dashboard activities to notification format
    const activityNotifications = (dashboardData?.activities || []).map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.description,
      message: activity.project ? `Project: ${activity.project}` : '',
      data: {},
      timestamp: new Date().toISOString(), // Use current time as base
      isRead: false,
      priority: 'medium' as const
    }));
    
    // Combine all notifications and activities
    return [...notifications, ...activityNotifications].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [autoNotifications, dashboardData?.activities]);

  // Persistence Effect - Save all dashboard settings to database
  useEffect(() => {
    if (!preferencesLoading && updateDashboardLayout) {
      updateDashboardLayout({
        viewMode,
        isEditMode,
        productivityChartType,
        taskChartType,
        healthChartType: projectHealthChartType,
        workspaceHealthChartType,
        filters,
        widgets: dashboardWidgets
      });
    }
  }, [
    viewMode,
    isEditMode,
    productivityChartType,
    taskChartType,
    projectHealthChartType,
    workspaceHealthChartType,
    filters,
    dashboardWidgets,
    updateDashboardLayout,
    preferencesLoading
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleChartExport = (chartName: string, data: any) => {
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
  };

  const handleDrillDown = (dataPoint: any) => {
    // Enhanced drill-down with navigation and actual functionality
    // Show detailed information in a toast or modal
    const message = `Viewing details for ${dataPoint.label}: ${dataPoint.value}`;
    // Navigate to relevant page based on data point
    if (dataPoint.category === 'project') {
      // Could navigate to project details
    } else if (dataPoint.category === 'status') {
      // Could navigate to tasks with this status
    }
  };

  const handleFiltersChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);

    // Trigger data refetch if needed
    if (newFilters.timeRange !== filters.timeRange) {
      setTimeRange(newFilters.timeRange as TimeRange);
    }
  };

  // Enhanced chart data generation with error handling
  const getProductivityData = () => {
    if (!dashboardData) return [];
    
    try {
      const { stats, activities } = dashboardData;
      
      // Generate realistic time-series data based on current stats
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const data = [];
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const productivity = Math.max(0, stats.productivity + (Math.random() - 0.5) * 20);
        
        data.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Math.round(productivity),
          timestamp: date.toISOString()
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error generating productivity data:', error);
      return [];
    }
  };

  const getTaskCompletionData = () => {
    if (!dashboardData) return [];
    
    try {
      const { projects } = dashboardData;
      
      return projects.slice(0, 5).map(project => ({
        label: project.name,
        value: project.progress || 0,
        category: 'project'
      }));
    } catch (error) {
      console.error('Error generating task completion data:', error);
      return [];
    }
  };

  const getProjectHealthData = () => {
    if (!dashboardData) return [];
    
    try {
      const { stats } = dashboardData;
      
      return [
        { label: 'Completed', value: stats.completedTasks, category: 'status' },
        { label: 'In Progress', value: stats.totalTasks - stats.completedTasks - stats.overdueTasks, category: 'status' },
        { label: 'Overdue', value: stats.overdueTasks, category: 'status' }
      ].filter(item => item.value > 0);
    } catch (error) {
      console.error('Error generating project health data:', error);
      return [];
    }
  };

  const getWorkspaceHealthData = () => {
    if (!dashboardData) return [];
    
    try {
      const { stats } = dashboardData;
      
      return [
        { label: 'Completed', value: stats.completedTasks, category: 'status' },
        { label: 'In Progress', value: stats.totalTasks - stats.completedTasks - stats.overdueTasks, category: 'status' },
        { label: 'Overdue', value: stats.overdueTasks, category: 'status' }
      ].filter(item => item.value > 0);
    } catch (error) {
      console.error('Error generating workspace health data:', error);
      return [];
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportData = () => {
    if (!dashboardData) return;
    
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        workspace: workspace?.name,
        stats: dashboardData.stats,
        activities: dashboardData.activities,
        projects: dashboardData.projects,
        deadlines: dashboardData.deadlines
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meridian-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleResetDashboard = () => {
    if (confirm('Are you sure you want to reset the dashboard to default settings? This will clear all customizations.')) {
      // Clear all localStorage
      localStorage.removeItem('meridian-dashboard-view-mode');
      localStorage.removeItem('meridian-dashboard-edit-mode');
      localStorage.removeItem('meridian-productivity-chart-type');
      localStorage.removeItem('meridian-task-chart-type');
      localStorage.removeItem('meridian-health-chart-type');
      localStorage.removeItem('meridian-workspace-health-chart-type');
      localStorage.removeItem('meridian-dashboard-filters');
      localStorage.removeItem('meridian-dashboard-widgets');
      
      // Reset state
      setViewMode('standard');
      setIsEditMode(false);
      setProductivityChartType('line');
      setTaskChartType('bar');
      setProjectHealthChartType('pie');
      setWorkspaceHealthChartType('pie');
      setFilters({
        timeRange: '30d',
        projectIds: [],
        userIds: [],
        priorities: [],
        status: [],
        tags: []
      });
      setDashboardWidgets([
        {
          id: 'productivity-chart',
          type: 'chart',
          title: 'Team Productivity',
          size: 'large',
          position: { row: 0, col: 0 },
          settings: { chartType: 'line', color: '#8b5cf6' }
        },
        {
          id: 'project-health',
          type: 'chart', 
          title: 'Project Health',
          size: 'medium',
          position: { row: 0, col: 1 },
          settings: { chartType: 'pie' }
        },
        {
          id: 'task-completion',
          type: 'chart',
          title: 'Task Completion',
          size: 'large', 
          position: { row: 1, col: 0 },
          settings: { chartType: 'bar', color: '#10b981' }
        },
        {
          id: 'team-activity',
          type: 'activity',
          title: 'Team Activity', 
          size: 'medium',
          position: { row: 1, col: 1 }
        }
      ]);
      // Refresh the page to ensure clean state
      window.location.reload();
    }
  };

  // Risk Alert Section
  const RiskAlertSection = () => {
    if (!riskData.hasHighRisk) return null;

    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Risk Alerts
            </CardTitle>
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
              {riskData.highPriorityRisks.length} alerts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {riskData.highPriorityRisks.slice(0, 3).map((risk) => (
            <div key={risk.id} className="flex items-start gap-3 p-3 bg-white border border-red-200 rounded-lg">
              <Shield className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-red-800">{risk.title}</h4>
                <p className="text-xs text-red-600 mt-1">{risk.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {risk.severity}
                  </Badge>
                  <span className="text-xs text-red-500">
                    {risk.affectedTasks.length} tasks affected
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  // Enhanced notification section
  const NotificationSection = () => {
    const recentNotifications = allNotifications.slice(0, 5);
    const unreadCount = allNotifications.filter(n => !n.isRead).length;

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
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  notification.isRead ? "bg-muted/30" : "bg-blue-50 border-blue-200"
                )}
              >
                <div className="mt-0.5">
                  {notification.title.includes('🚨') ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Target className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {notification.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  if (!workspace) {
    return null; // This will show the workspace selection state from parent
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-3 h-64 bg-gray-200 dark:bg-muted rounded glass-card"></div>
            <div className="col-span-2 h-64 bg-gray-200 dark:bg-muted rounded glass-card"></div>
            <div className="col-span-2 h-64 bg-gray-200 dark:bg-muted rounded glass-card"></div>
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
            <h3 className="text-lg font-medium text-foreground">Unable to load dashboard</h3>
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

  if (!dashboardData) {
    return <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark text-muted-foreground">No dashboard data available</div>;
  }

  // Only destructure what we actually use
  const { projects } = dashboardData;

  return (
    <Suspense fallback={
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
    }>
      <LazyDashboardLayout>
        <UniversalHeader 
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with your projects."
        variant="default"
        customActions={
          <div className="flex items-center space-x-3">
            {/* Risk Indicator - Only show if there are actual risks */}
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
        {/* Executive Dashboard Banner - Only for authorized roles */}
        {user?.role && ["workspace-manager", "department-head", "admin"].includes(user.role) && (
          <Link to="/dashboard/executive" className="block">
            <div className="glass-card p-6 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-indigo-500/10 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Executive Dashboard
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Portfolio health, budget tracking, team capacity & strategic insights
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                    {user.role.replace("-", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </Badge>
                  <ArrowRight className="h-5 w-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Quick Access Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Security Dashboard Card - For admins and workspace managers */}
          {user?.role && ["workspace-manager", "admin"].includes(user.role) && (
            <Link to="/dashboard/security" className="block">
              <div className="glass-card p-4 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                    <Shield className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Security Dashboard</h3>
                    <p className="text-xs text-muted-foreground">Access control, compliance & security monitoring</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}

          {/* Automation Dashboard Card - For admins and workspace managers */}
          {(userRole === "admin" || userRole === "workspace-manager") && (
            <Link to="/dashboard/automation" className="block">
              <div className="glass-card p-4 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Automation Hub</h3>
                    <p className="text-xs text-muted-foreground">API usage, scheduled reports & automation rules</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}

          {/* Settings/Accessibility Card - For all users */}
          <Link to="/settings" className="block">
            <div className="glass-card p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Settings & Preferences</h3>
                  <p className="text-xs text-muted-foreground">Accessibility, notifications & workspace settings</p>
                </div>
                <ArrowRight className="h-4 w-4 text-green-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats Overview - Enhanced with Animations */}
        <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-muted rounded animate-pulse"></div>)}</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Tasks */}
            <AnimatedStatsCard
            title="Total Tasks"
            value={dashboardData?.stats?.totalTasks || 0}
            icon={CheckCircle}
            description={`${dashboardData?.stats?.completedTasks || 0} completed`}
            delay={0.1}
            colorScheme="success"
            trend="up"
            trendValue={12.5}
          />

          {/* Active Projects */}
          <AnimatedStatsCard
            title="Active Projects"
            value={dashboardData?.projects?.length || 0}
            icon={FolderOpen}
            description={`${dashboardData?.projects?.filter((p: any) => p.status !== 'completed').length || 0} in progress`}
            delay={0.2}
            colorScheme="info"
            trend="up"
            trendValue={8.3}
          />

          {/* Risk Analysis */}
          <AnimatedStatsCard
            title="Risk Score"
            value={riskData.data?.overallRiskScore || 0}
            icon={Shield}
            description={riskData.hasHighRisk ? `${riskData.highPriorityRisks.length} alerts` : 'All good'}
            delay={0.3}
            colorScheme={
              (riskData.data?.overallRiskScore || 0) > 70 ? "danger" :
              (riskData.data?.overallRiskScore || 0) > 40 ? "warning" : "success"
            }
            trend={riskData.hasHighRisk ? "down" : "neutral"}
            suffix="/100"
          />

          {/* Notifications */}
          <AnimatedStatsCard
            title="Notifications"
            value={allNotifications.length}
            icon={Bell}
            description={`${allNotifications.filter(n => !n.isRead).length} unread`}
            delay={0.4}
            colorScheme="primary"
            trend="up"
            trendValue={5}
          />
          </div>
        </Suspense>

        {/* Smart Filters */}
        <SmartFilters 
          onFiltersChange={(filters) => {
            setActiveDashboardFilters(filters);
            // Filters are applied - you can use activeDashboardFilters to filter dashboard data
            console.log('Dashboard filters updated:', filters);
          }}
        />

        {/* Risk Alerts Section - Only show if there are actual risks */}
        {riskData.data?.alerts && riskData.data.alerts.length > 0 && (
        <Suspense fallback={null}>
          <BlurFade delay={0.5} inView>
          <Card className="border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10 glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Detection System
                </CardTitle>
                <Badge variant="secondary" className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                  {riskData.data.summary?.totalRisks} risks
                </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskData.data.alerts.slice(0, 3).map((risk) => (
                <div key={risk.id} className="flex items-start gap-3 p-3 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg glass-card">
                  <Shield className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-red-800 dark:text-red-200">{risk.title}</h4>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">{risk.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {risk.severity}
                      </Badge>
                      <span className="text-xs text-red-500 dark:text-red-400">
                        {risk.affectedTasks.length} tasks affected
                      </span>
                    </div>
                </div>
              </div>
              ))}
            </CardContent>
          </Card>
          </BlurFade>
        </Suspense>
        )}





        {/* Main Content Grid - Better proportioned */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Primary Content (3/5 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Milestone Dashboard */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-48 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Project Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MilestoneDashboard
                    variant="compact"
                    showProjectFilter={false}
                  />
                </CardContent>
              </Card>
            </Suspense>

            {/* Personal OKRs Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <OKRWidget 
                workspaceId={workspace?.id || ''}
                userId={user?.id || ''}
                className="glass-card"
              />
            </Suspense>

            {/* Recent Projects */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Recent Projects
                  </CardTitle>
                  {(hasPermission && hasPermission("canCreateProjects", {})) && (
                    <Button variant="outline" size="sm" onClick={() => setIsCreateProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!dashboardData?.projects || dashboardData.projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No projects yet</p>
                    <p className="text-xs">Create your first project to get started</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setIsCreateProjectOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Project
                </Button>
              </div>
                ) : (
                  dashboardData.projects.slice(0, 5).map((project: any) => {
                    const allProjectTasks = project.tasks || [];
                    const completedTasks = allProjectTasks.filter((task: any) => task.status === 'done').length;
                    const progressPercentage = allProjectTasks.length > 0 
                      ? Math.round((completedTasks / allProjectTasks.length) * 100)
                      : 0;
                    
                    return (
                      <Link
                        key={project.id}
                        to="/dashboard/workspace/$workspaceId/project/$projectId"
                        params={{ workspaceId: workspace?.id || '', projectId: project.id }}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 dark:hover:bg-secondary-hover transition-colors cursor-pointer glass-card">
                      <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                              <span className="text-primary font-medium text-sm">
                                {project.icon || project.name?.charAt(0)?.toUpperCase() || 'P'}
                              </span>
                        </div>
                            <div>
                              <h3 className="font-medium text-sm">{project.name}</h3>
                          <p className="text-xs text-muted-foreground">
                                {allProjectTasks.length} tasks • {completedTasks} completed
                          </p>
                        </div>
                      </div>
                          <div className="flex items-center space-x-3">
                      <div className="text-right">
                              <div className="text-sm font-medium">{progressPercentage}%</div>
                              <div className="w-16 bg-secondary dark:bg-secondary-hover rounded-full h-2">
                          <div
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
              </div>

          {/* Right Column: Secondary Content (2/5 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Challenges Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <DailyChallengesWidget 
                userId={user?.id || ''}
                workspaceId={workspace?.id || ''}
                className="glass-card"
              />
            </Suspense>
            
            {/* Progress Rings Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <ProgressRings 
                userId={user?.id || ''}
                className="glass-card"
              />
            </Suspense>
            
            {/* Achievement Badge Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-48 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <AchievementBadgeWidget 
                userId={user?.id || ''}
                className="glass-card"
              />
            </Suspense>
            
            {/* Streak Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-48 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <StreakWidget 
                userId={user?.id || ''}
                className="glass-card"
              />
            </Suspense>
            
            {/* Milestone Countdown */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-48 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <MilestoneCountdown 
                userId={user?.id || ''}
                className="glass-card"
              />
            </Suspense>
            
            {/* Leaderboard Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <LeaderboardWidget 
                workspaceId={workspace?.id || ''}
                currentUserId={user?.id}
                className="glass-card"
                limit={10}
              />
            </Suspense>
            
            {/* Celebration Feed Widget */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <CelebrationFeed 
                workspaceId={workspace?.id || ''}
                className="glass-card"
                limit={5}
              />
            </Suspense>
            
            {/* System Health Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <Badge variant="outline" className="text-xs">
                      {riskData.data?.riskLevel || 'low'}
                    </Badge>
            </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Risks</span>
                    <span className="font-medium">{riskData.data?.summary?.totalRisks || 0}</span>
                </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <span className={cn(
                      "font-medium",
                      (riskData.data?.overallRiskScore || 0) > 70 ? "text-red-600" :
                      (riskData.data?.overallRiskScore || 0) > 40 ? "text-yellow-600" : "text-green-600"
                    )}>
                      {riskData.data?.overallRiskScore || 0}/100
                    </span>
              </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Notifications</span>
                    <span className="font-medium">{allNotifications.length}</span>
                        </div>
                        </div>
              </CardContent>
            </Card>

            {/* Recent Activity/Notifications */}
            <NotificationSection />

            {/* Workspace Performance Chart */}
            <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Workspace Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveChart
                    title=""
                    data={getWorkspaceHealthData()}
                    chartType={workspaceHealthChartType}
                    onChartTypeChange={setWorkspaceHealthChartType}
                    onExport={() => handleChartExport('workspace-health', getWorkspaceHealthData())}
                    color="#8b5cf6"
                    height={250}
                    drillDownEnabled={true}
                    onDrillDown={handleDrillDown}
                  />
                </CardContent>
              </Card>
            </Suspense>
                      </div>
                    </div>

        {/* Create Project Modal */}
        <Suspense fallback={null}>
          <CreateProjectModal
            open={isCreateProjectOpen}
            onClose={() => setIsCreateProjectOpen(false)}
          />
        </Suspense>

        {/* Quick Capture FAB - Mobile Only */}
        <QuickCaptureFAB />
      </div>
      </LazyDashboardLayout>
    </Suspense>
  );
} 