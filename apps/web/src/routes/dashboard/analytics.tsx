"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useCallback, useEffect, lazy, Suspense, useReducer } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Zap,
  PieChart,
  LineChart,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Minus,
  Check,
  Calendar,
  Clock,
  Filter,
  Settings,
  FileText,
  Info,
  Sparkles,
  Save,
  TrendingDown,
  HelpCircle,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { useEnhancedAnalytics } from "@/hooks/queries/analytics/use-enhanced-analytics";
// Lazy load heavy chart component for better performance
const InteractiveChart = lazy(() => import("@/components/dashboard/interactive-chart").then(module => ({ default: module.InteractiveChart })));
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  NoAnalyticsData, 
  NoProjectsData, 
  NoTeamData, 
  NoWorkspaceSelected 
} from "@/components/analytics/empty-states";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalyticsRealtime } from "@/hooks/use-analytics-realtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { KeyboardShortcutsModal } from "@/components/analytics/keyboard-shortcuts-modal";
import { OnboardingTour } from "@/components/analytics/onboarding-tour";
import { FilterPresets, type FilterPreset } from "@/components/analytics/filter-presets";
import { PredictiveInsights } from "@/components/analytics/predictive-insights";
import { ScheduledReports } from "@/components/analytics/scheduled-reports";
import { CustomWidgetsManager } from "@/components/analytics/custom-widgets-manager";
import { logger } from "@/lib/logger";

// @epic-3.1-analytics: Enhanced analytics dashboard with advanced filtering and comparative analytics
// @role-workspace-manager: Executive-level insights with cross-project visibility
// @role-department-head: Department-wide analytics and performance tracking
// @persona-jennifer: Executive dashboard with comparative metrics and health monitoring
// @persona-david: Team lead analytics with productivity insights and resource utilization
// @persona-sarah: PM analytics with project health scoring and risk assessment

// Enhanced metric card component with comparative data support
const EnhancedMetricCard = ({ 
  title, 
  comparativeData, 
  icon: Icon, 
  color,
  subtitle,
  action,
  tooltip
}: {
  title: string;
  comparativeData: {
    current: number;
    comparison: number;
    change: {
      absolute: number;
      percentage: number;
      trend: "up" | "down" | "stable";
    };
  };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
  action?: () => void;
  tooltip?: string;
}) => {
  const getTrendIcon = () => {
    switch (comparativeData.change.trend) {
      case "up": return <ArrowUpRight className="h-3 w-3" />;
      case "down": return <ArrowDownRight className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (comparativeData.change.trend) {
      case "up": return "text-green-600 dark:text-green-400";
      case "down": return "text-red-600 dark:text-red-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getTrendBgColor = () => {
    switch (comparativeData.change.trend) {
      case "up": return "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20";
      case "down": return "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
      default: return "bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20";
    }
  };

  const hasComparison = comparativeData.comparison !== undefined && comparativeData.comparison !== null;
  const hasChange = comparativeData.change.percentage !== 0;

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="h-full"
      role="article"
      aria-label={`${title}: ${comparativeData.current}`}
    >
      <Card className="glass-card border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full bg-gradient-to-br from-background to-background/80 overflow-hidden relative">
        {/* Trend indicator stripe */}
        {hasChange && (
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1",
            comparativeData.change.trend === "up" ? "bg-green-500" : 
            comparativeData.change.trend === "down" ? "bg-red-500" : "bg-gray-500"
          )} />
        )}
        
        <CardContent className="p-6 pt-7">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-medium">{title}</p>
                {tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-baseline space-x-3 mt-2">
                <p className="text-3xl font-bold text-foreground tabular-nums">{comparativeData.current}</p>
                {hasChange && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-md border", 
                    getTrendColor(),
                    getTrendBgColor()
                  )}>
                    {getTrendIcon()}
                    <span className="tabular-nums">{Math.abs(comparativeData.change.percentage)}%</span>
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
              )}
              {hasComparison && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Previous:</span>
                  <span className="font-medium text-foreground tabular-nums">{comparativeData.comparison}</span>
                  {hasChange && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className={cn("font-medium tabular-nums", getTrendColor())}>
                        {comparativeData.change.absolute > 0 ? '+' : ''}{comparativeData.change.absolute}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <motion.div 
              className={cn("p-3 rounded-xl shadow-lg", color)}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </motion.div>
          </div>
          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action}
              className="mt-4 h-8 px-3 text-xs hover:bg-primary/10 w-full transition-colors"
              aria-label={`View details for ${title}`}
            >
              View Details
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return cardContent;
};

// Project health card component
const ProjectHealthCard = ({ 
  project,
  onClick 
}: { 
  project: {
    id: string;
    name: string;
    slug: string;
    health: "excellent" | "good" | "warning" | "critical" | "at_risk";
    healthScore: number;
    completion: number;
    velocity: number;
    riskFactors: string[];
  };
  onClick?: () => void;
}) => {
  const getHealthColor = (health: string) => {
    switch (health) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-blue-500";
      case "warning": return "bg-yellow-500";
      case "critical": return "bg-red-500";
      case "at_risk": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "excellent": return CheckCircle2;
      case "good": return Target;
      case "warning": return AlertTriangle;
      case "critical": return AlertTriangle;
      case "at_risk": return AlertTriangle;
      default: return Activity;
    }
  };

  const HealthIcon = getHealthIcon(project.health);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn("cursor-pointer", onClick && "group")}
    >
      <Card className="glass-card border-border/50 hover:border-primary/40 hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {project.name}
              </h4>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          <div className={cn("p-1 rounded-full", getHealthColor(project.health))}>
            <HealthIcon className="h-3 w-3 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Health Score</span>
              <span className="font-medium tabular-nums">{project.healthScore}/100</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Completion</span>
              <span className="font-medium tabular-nums">{project.completion}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Velocity</span>
              <span className="font-medium tabular-nums">{project.velocity.toFixed(2)}</span>
          </div>
          {project.riskFactors.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Risk Factors:</p>
              <div className="flex flex-wrap gap-1">
                {project.riskFactors.slice(0, 2).map((risk, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                    {risk}
                  </Badge>
                ))}
                {project.riskFactors.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{project.riskFactors.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
};

// Enhanced insights panel with alert levels
const EnhancedInsightsPanel = ({ 
  insights,
  alerts,
  onInsightAction 
}: { 
  insights: any[];
  alerts: Array<{
    type: "warning" | "critical" | "info";
    message: string;
    actionRequired: boolean;
  }>;
  onInsightAction: (insight: any) => void;
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success": return CheckCircle2;
      case "warning": return AlertTriangle;
      case "critical": return AlertTriangle;
      default: return Activity;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical": return AlertTriangle;
      case "warning": return AlertTriangle;
      default: return Activity;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical": return "border-red-200 bg-red-50 text-red-800";
      case "warning": return "border-yellow-200 bg-yellow-50 text-yellow-800";
      default: return "border-blue-200 bg-blue-50 text-blue-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">System Alerts</h4>
          {alerts.map((alert, index) => {
            const AlertIcon = getAlertIcon(alert.type);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border",
                  getAlertColor(alert.type)
                )}
              >
                <AlertIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.type.toUpperCase()}</p>
                  <p className="text-xs opacity-90">{alert.message}</p>
                  {alert.actionRequired && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Action Required
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">AI Insights</h4>
          {insights.map((insight, index) => {
            const InsightIcon = getInsightIcon(insight.type);
            return (
              <div
                key={insight.id || index}
                className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <InsightIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onInsightAction(insight)}
                    className="mt-2 h-6 px-2 text-xs"
                  >
                    {insight.action}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Skeleton components
const MetricCardSkeleton = () => (
  <Card className="glass-card border-border/50">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-baseline space-x-2 mt-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => (
  <Card className="glass-card border-border/50">
    <CardHeader>
      <Skeleton className="h-5 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className={cn("w-full", height)} />
    </CardContent>
  </Card>
);

// Export functions
const exportToCSV = (data: any, filename: string) => {
  if (!data) {
    toast.error("No data available to export");
    return;
  }
  
  try {
    // Convert data to CSV format
    const headers = Object.keys(data).join(",");
    const values = Object.values(data).map(v => 
      typeof v === 'object' ? JSON.stringify(v) : v
    ).join(",");
    
    const csv = `${headers}\n${values}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Data exported successfully");
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export data");
  }
};

const exportToPDF = async (_elementId: string, _filename: string) => {
  toast.info("PDF export will be available soon");
  // TODO: Implement PDF export using html2canvas + jsPDF
};

// Analytics Dashboard Component with Enhanced Features
// Analytics state reducer for better performance
type AnalyticsState = {
  activeTab: string;
  timeRange: "7d" | "30d" | "90d";
  isRefreshing: boolean;
  showExportDialog: boolean;
  showFilterPanel: boolean;
  showSettingsDialog: boolean;
  showComparisonDialog: boolean;
  showKeyboardShortcuts: boolean;
  showOnboardingTour: boolean;
  showScheduledReports: boolean;
  showCustomWidgets: boolean;
  exportFormat: "csv" | "pdf" | "excel";
  customDateRange: { start: string; end: string };
  selectedProjects: string[];
  selectedUsers: string[];
  comparisonMode: boolean;
  comparisonTimeRange: "7d" | "30d" | "90d";
};

type AnalyticsAction =
  | { type: "SET_TAB"; payload: string }
  | { type: "SET_TIME_RANGE"; payload: "7d" | "30d" | "90d" }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "TOGGLE_EXPORT_DIALOG"; payload?: boolean }
  | { type: "TOGGLE_FILTER_PANEL"; payload?: boolean }
  | { type: "TOGGLE_SETTINGS_DIALOG"; payload?: boolean }
  | { type: "TOGGLE_COMPARISON_DIALOG"; payload?: boolean }
  | { type: "TOGGLE_KEYBOARD_SHORTCUTS"; payload?: boolean }
  | { type: "TOGGLE_ONBOARDING_TOUR"; payload?: boolean }
  | { type: "TOGGLE_SCHEDULED_REPORTS"; payload?: boolean }
  | { type: "TOGGLE_CUSTOM_WIDGETS"; payload?: boolean }
  | { type: "SET_EXPORT_FORMAT"; payload: "csv" | "pdf" | "excel" }
  | { type: "SET_CUSTOM_DATE_RANGE"; payload: { start: string; end: string } }
  | { type: "SET_SELECTED_PROJECTS"; payload: string[] }
  | { type: "SET_SELECTED_USERS"; payload: string[] }
  | { type: "TOGGLE_COMPARISON_MODE"; payload?: boolean }
  | { type: "SET_COMPARISON_TIME_RANGE"; payload: "7d" | "30d" | "90d" }
  | { type: "CLEAR_FILTERS" };

const analyticsReducer = (state: AnalyticsState, action: AnalyticsAction): AnalyticsState => {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_TIME_RANGE":
      return { ...state, timeRange: action.payload };
    case "SET_REFRESHING":
      return { ...state, isRefreshing: action.payload };
    case "TOGGLE_EXPORT_DIALOG":
      return { ...state, showExportDialog: action.payload ?? !state.showExportDialog };
    case "TOGGLE_FILTER_PANEL":
      return { ...state, showFilterPanel: action.payload ?? !state.showFilterPanel };
    case "TOGGLE_SETTINGS_DIALOG":
      return { ...state, showSettingsDialog: action.payload ?? !state.showSettingsDialog };
    case "TOGGLE_COMPARISON_DIALOG":
      return { ...state, showComparisonDialog: action.payload ?? !state.showComparisonDialog };
    case "TOGGLE_KEYBOARD_SHORTCUTS":
      return { ...state, showKeyboardShortcuts: action.payload ?? !state.showKeyboardShortcuts };
    case "TOGGLE_ONBOARDING_TOUR":
      return { ...state, showOnboardingTour: action.payload ?? !state.showOnboardingTour };
    case "TOGGLE_SCHEDULED_REPORTS":
      return { ...state, showScheduledReports: action.payload ?? !state.showScheduledReports };
    case "TOGGLE_CUSTOM_WIDGETS":
      return { ...state, showCustomWidgets: action.payload ?? !state.showCustomWidgets };
    case "SET_EXPORT_FORMAT":
      return { ...state, exportFormat: action.payload };
    case "SET_CUSTOM_DATE_RANGE":
      return { ...state, customDateRange: action.payload };
    case "SET_SELECTED_PROJECTS":
      return { ...state, selectedProjects: action.payload };
    case "SET_SELECTED_USERS":
      return { ...state, selectedUsers: action.payload };
    case "TOGGLE_COMPARISON_MODE":
      return { ...state, comparisonMode: action.payload ?? !state.comparisonMode };
    case "SET_COMPARISON_TIME_RANGE":
      return { ...state, comparisonTimeRange: action.payload };
    case "CLEAR_FILTERS":
      return {
        ...state,
        selectedProjects: [],
        selectedUsers: [],
        customDateRange: { start: "", end: "" },
        comparisonMode: false,
      };
    default:
      return state;
  }
};

const initialAnalyticsState: AnalyticsState = {
  activeTab: "overview",
  timeRange: "30d",
  isRefreshing: false,
  showExportDialog: false,
  showFilterPanel: false,
  showSettingsDialog: false,
  showComparisonDialog: false,
  showKeyboardShortcuts: false,
  showOnboardingTour: false,
  showScheduledReports: false,
  showCustomWidgets: false,
  exportFormat: "csv",
  customDateRange: { start: "", end: "" },
  selectedProjects: [],
  selectedUsers: [],
  comparisonMode: false,
  comparisonTimeRange: "30d",
};

function AnalyticsPage() {
  const { hasPermission } = useRBACAuth();
  const navigate = useNavigate();
  
  // Consolidated state management with useReducer for better performance
  const [state, dispatch] = useReducer(analyticsReducer, initialAnalyticsState);
  
  // Get workspace data
  const { workspace } = useWorkspaceStore();
  
  // Enhanced analytics query with error handling
  const { 
    data: enhancedAnalytics, 
    isLoading, 
    error, 
    refetch 
  } = useEnhancedAnalytics({
    timeRange: state.timeRange,
    enabled: !!workspace?.id,
    projectIds: state.selectedProjects,
    userEmails: state.selectedUsers,
  });

  // Comparison analytics query (only when comparison mode is enabled)
  const { 
    data: _comparisonAnalytics, // TODO: Use for period-over-period comparison
    isLoading: isComparisonLoading 
  } = useEnhancedAnalytics({
    timeRange: state.comparisonTimeRange,
    enabled: !!workspace?.id && state.comparisonMode,
    projectIds: state.selectedProjects,
    userEmails: state.selectedUsers,
  });

  // RBAC permissions (future use for feature gating)
  const { hasPermission: _hasPermission } = useRBACAuth();

  // Generate options for filters from analytics data
  const projectOptions: MultiSelectOption[] = useMemo(() => {
    if (!enhancedAnalytics?.projectHealth) return [];
    return enhancedAnalytics.projectHealth.map(project => ({
      label: project.name,
      value: project.id,
      icon: Target,
    }));
  }, [enhancedAnalytics?.projectHealth]);

  const userOptions: MultiSelectOption[] = useMemo(() => {
    if (!enhancedAnalytics?.resourceUtilization) return [];
    return enhancedAnalytics.resourceUtilization.map(user => ({
      label: user.userName,
      value: user.userEmail,
      icon: Users,
    }));
  }, [enhancedAnalytics?.resourceUtilization]);

  // Real-time WebSocket connection for live updates
  // TODO: Enable when backend WebSocket analytics support is implemented
  const {
    connectionStatus: _connectionStatus, // TODO: Display in UI
    liveUpdates,
    isConnected,
    isReconnecting,
    reconnect: reconnectWebSocket,
    requestRefresh: _requestRealtimeRefresh, // TODO: Wire to refresh button
  } = useAnalyticsRealtime({
    workspaceId: workspace?.id || '',
    enabled: false, // Disabled until backend analytics WebSocket handlers are implemented
    onUpdate: (data) => {
      // Handle real-time analytics updates
      logger.debug('Real-time analytics update:', data);
      // Optionally refetch to get latest data
      if (data.type === 'metric-changed') {
        refetch();
      }
    },
    onConnect: () => {
      toast.success('Connected to live analytics');
    },
    onDisconnect: () => {
      toast.info('Disconnected from live analytics');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });
  
  // Refresh handler with toast feedback
  const handleRefresh = useCallback(async () => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    toast.info("Refreshing analytics data...");
    try {
      await refetch();
      toast.success("Analytics data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh analytics data");
    } finally {
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, [refetch]);

  // Export handlers
  const handleExport = useCallback(async (format: "csv" | "pdf" | "excel") => {
    if (!enhancedAnalytics) {
      toast.error("No data available to export");
      return;
    }
    
    switch (format) {
      case "csv":
        exportToCSV(enhancedAnalytics, "analytics-data");
        toast.success("Analytics exported as CSV");
        break;
      case "pdf":
        exportToPDF("analytics-dashboard", "analytics-report");
        toast.success("Analytics exported as PDF");
        break;
      case "excel":
        try {
          const { exportToExcel } = await import("@/utils/export-utils");
          await exportToExcel(enhancedAnalytics, "analytics-report");
          toast.success("Analytics exported as Excel");
        } catch (error) {
          console.error("Excel export error:", error);
          toast.error("Failed to export as Excel");
        }
        break;
    }
  }, [enhancedAnalytics]);

  // Note: Filters auto-apply on change via state.selectedProjects/selectedUsers
  // Manual apply handler removed - no longer needed with real-time filtering

  const handleClearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
    toast.info("Filters cleared");
  }, []);

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    dispatch({ type: "SET_TIME_RANGE", payload: preset.timeRange });
    dispatch({ type: "SET_SELECTED_PROJECTS", payload: preset.selectedProjects });
    dispatch({ type: "SET_SELECTED_USERS", payload: preset.selectedUsers });
    dispatch({ type: "TOGGLE_COMPARISON_MODE", payload: preset.comparisonMode });
    if (preset.comparisonTimeRange) {
      dispatch({ type: "SET_COMPARISON_TIME_RANGE", payload: preset.comparisonTimeRange });
    }
    toast.success(`Applied preset "${preset.name}"`);
  }, []);

  // Handle analytics errors
  useEffect(() => {
    if (error) {
      console.error("Analytics error:", error);
      toast.error("Failed to load analytics data");
    }
  }, [error]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + / or ? - Show keyboard shortcuts
      if (cmdOrCtrl && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        dispatch({ type: "TOGGLE_KEYBOARD_SHORTCUTS", payload: true });
        return;
      }

      // Ctrl/Cmd + R - Refresh
      if (cmdOrCtrl && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }

      // Ctrl/Cmd + E - Export dialog
      if (cmdOrCtrl && e.key === 'e') {
        e.preventDefault();
        dispatch({ type: "TOGGLE_EXPORT_DIALOG", payload: true });
        return;
      }

      // Ctrl/Cmd + F - Open filters
      if (cmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        dispatch({ type: "TOGGLE_FILTER_PANEL", payload: true });
        return;
      }

      // Ctrl/Cmd + P - Toggle comparison mode
      if (cmdOrCtrl && e.key === 'p') {
        e.preventDefault();
        dispatch({ type: "TOGGLE_COMPARISON_MODE" });
        toast.info(state.comparisonMode ? "Comparison mode disabled" : "Comparison mode enabled");
        return;
      }

      // Number keys 1-4 for tabs (when no modifiers)
      if (!cmdOrCtrl && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          dispatch({ type: "SET_TAB", payload: "overview" });
          return;
        }
        if (e.key === '2') {
          dispatch({ type: "SET_TAB", payload: "projects" });
          return;
        }
        if (e.key === '3') {
          dispatch({ type: "SET_TAB", payload: "teams" });
          return;
        }
        if (e.key === '4') {
          dispatch({ type: "SET_TAB", payload: "insights" });
          return;
        }

        // D, W, M for time ranges
        if (e.key.toLowerCase() === 'd') {
          dispatch({ type: "SET_TIME_RANGE", payload: "7d" });
          return;
        }
        if (e.key.toLowerCase() === 'w') {
          dispatch({ type: "SET_TIME_RANGE", payload: "30d" });
          return;
        }
        if (e.key.toLowerCase() === 'm') {
          dispatch({ type: "SET_TIME_RANGE", payload: "90d" });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh, state.comparisonMode, dispatch]); // ✅ Fixed: Added dispatch to dependencies

  // Onboarding tour - show on first visit
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('analytics-onboarding-completed');
    if (!hasCompletedOnboarding && workspace?.id) {
      // Show tour after a short delay for better UX
      const timer = setTimeout(() => {
        dispatch({ type: "TOGGLE_ONBOARDING_TOUR", payload: true });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [workspace?.id, dispatch]); // ✅ Fixed: Added dispatch to dependencies

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('analytics-onboarding-completed', 'true');
    toast.success("Onboarding complete! Welcome to Analytics");
  }, []);

  // Check for authentication errors
  if (!hasPermission("canViewAnalytics")) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view workspace analytics.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard" })}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Check for workspace availability
  if (!workspace) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <NoWorkspaceSelected />
        </div>
      </LazyDashboardLayout>
    );
  }

  // Show error state if API call failed
  if (error) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Failed to Load Analytics</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An error occurred while fetching analytics data."}
            </p>
            <div className="space-x-2">
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="space-y-6 md:space-y-8 p-4 md:p-6">
        {/* Simplified Header with Essential Controls */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track performance and insights across your workspace
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Time Range Selector */}
            <Select value={state.timeRange} onValueChange={(value: any) => dispatch({ type: "SET_TIME_RANGE", payload: value })}>
              <SelectTrigger className="w-[110px] sm:w-[130px] h-9">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                      </SelectContent>
                    </Select>

            {/* Filter Button - Opens Slide-out Panel */}
                  <Button
              onClick={() => dispatch({ type: "TOGGLE_FILTER_PANEL", payload: true })}
                    variant="outline"
                    size="sm"
              className="gap-2 h-9"
                  >
                    <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {(state.selectedProjects.length > 0 || state.selectedUsers.length > 0 || state.comparisonMode) && (
                <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {state.selectedProjects.length + state.selectedUsers.length + (state.comparisonMode ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>

            {/* Export Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                  className="gap-2 h-9"
                    disabled={isLoading || !enhancedAnalytics}
                  >
                    <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Scheduled Reports Button */}
            <Button
              onClick={() => dispatch({ type: "TOGGLE_SCHEDULED_REPORTS", payload: true })}
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>

            {/* Custom Widgets Button */}
            <Button
              onClick={() => dispatch({ type: "TOGGLE_CUSTOM_WIDGETS", payload: true })}
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Customize</span>
            </Button>

            {/* Refresh Button */}
                  <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    size="sm"
              className="h-9"
                    disabled={state.isRefreshing}
                  >
                    <RefreshCw className={cn("h-4 w-4", state.isRefreshing && "animate-spin")} />
              <span className="sr-only">Refresh</span>
                  </Button>

            {/* Help Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Help</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Get Help</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => dispatch({ type: "TOGGLE_ONBOARDING_TOUR", payload: true })}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Tour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => dispatch({ type: "TOGGLE_KEYBOARD_SHORTCUTS", payload: true })}>
                  <kbd className="text-xs mr-2 px-1.5 py-0.5 rounded bg-muted">?</kbd>
                  Keyboard Shortcuts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Comparison Mode Indicator */}
        {state.comparisonMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Comparison Mode Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Primary: {state.timeRange === "7d" ? "7 Days" : state.timeRange === "30d" ? "30 Days" : "90 Days"}
                    </Badge>
                    <span className="text-muted-foreground">vs</span>
                    <Badge variant="outline" className="text-xs">
                      Compare: {state.comparisonTimeRange === "7d" ? "7 Days" : state.comparisonTimeRange === "30d" ? "30 Days" : "90 Days"}
                    </Badge>
                    {isComparisonLoading && (
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        dispatch({ type: "TOGGLE_COMPARISON_MODE", payload: false });
                        toast.info("Comparison mode disabled");
                      }}
                      className="h-6 px-2"
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Real-Time Connection Status - TODO: Enable when backend WebSocket support is added */}
        {false && (
          <Card className={cn(
            "border-border/50 transition-colors duration-300",
            isConnected ? "border-green-500/30 bg-green-500/5" : 
            isReconnecting ? "border-yellow-500/30 bg-yellow-500/5" :
            "border-red-500/30 bg-red-500/5"
          )}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    isConnected ? "bg-green-500" :
                    isReconnecting ? "bg-yellow-500" :
                    "bg-red-500"
                  )} />
                  <span className="text-sm font-medium">
                    {isConnected ? "Live Updates Active" :
                     isReconnecting ? "Reconnecting..." :
                     "Live Updates Unavailable"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {liveUpdates.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {liveUpdates.length} Recent Updates
                    </Badge>
                  )}
                  {!isConnected && !isReconnecting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reconnectWebSocket}
                      className="h-6 px-2"
                    >
                      Reconnect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Quality Indicator */}
        {enhancedAnalytics?.summary?.dataQuality && (
          <Card className="border-border/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Data Quality Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-20 h-2 bg-muted rounded-full">
                      <div 
                        className="h-2 bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${enhancedAnalytics?.summary?.dataQuality || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{enhancedAnalytics?.summary?.dataQuality || 0}/100</span>
                  </div>
                  <Badge variant={(enhancedAnalytics?.summary?.dataQuality || 0) >= 80 ? "default" : "secondary"}>
                    {(enhancedAnalytics?.summary?.dataQuality || 0) >= 80 ? "High" : "Medium"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={state.activeTab} onValueChange={(tab) => dispatch({ type: "SET_TAB", payload: tab })} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4" role="tablist" aria-label="Analytics sections">
            <TabsTrigger value="overview" aria-controls="overview-panel">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="projects" aria-controls="projects-panel">
              <Target className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="teams" aria-controls="teams-panel">
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="insights" aria-controls="insights-panel">
              <Sparkles className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Enhanced Metrics */}
          <TabsContent value="overview" id="overview-panel" role="tabpanel" aria-labelledby="overview-tab" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <MetricCardSkeleton key={i} />
                ))}
              </div>
            ) : enhancedAnalytics ? (
              <>
                {/* Enhanced Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <EnhancedMetricCard
                    title="Total Projects"
                    comparativeData={enhancedAnalytics.projectMetrics.totalProjects}
                    icon={Target}
                    color="bg-blue-500"
                    subtitle="Active and completed projects"
                    tooltip="Total number of projects in your workspace, including active, completed, and archived projects"
                    action={() => dispatch({ type: "SET_TAB", payload: "projects" })}
                  />
                  <EnhancedMetricCard
                    title="Completed Tasks"
                    comparativeData={enhancedAnalytics.taskMetrics.completedTasks}
                    icon={CheckCircle2}
                    color="bg-green-500"
                    subtitle="Successfully finished tasks"
                    tooltip="Number of tasks marked as complete within the selected time period"
                    action={() => navigate({ to: "/dashboard/projects" })}
                  />
                  <EnhancedMetricCard
                    title="Team Productivity"
                    comparativeData={enhancedAnalytics.teamMetrics.avgProductivity}
                    icon={TrendingUp}
                    color="bg-purple-500"
                    subtitle="Average team efficiency score"
                    tooltip="Calculated based on task completion rate, time efficiency, and quality metrics"
                    action={() => dispatch({ type: "SET_TAB", payload: "teams" })}
                  />
                  <EnhancedMetricCard
                    title="Active Members"
                    comparativeData={enhancedAnalytics.teamMetrics.activeMembers}
                    icon={Users}
                    color="bg-orange-500"
                    subtitle="Currently active team members"
                    tooltip="Team members who have logged activity within the last 7 days"
                    action={() => dispatch({ type: "SET_TAB", payload: "teams" })}
                  />
                  <EnhancedMetricCard
                    title="Total Hours"
                    comparativeData={enhancedAnalytics.timeMetrics.totalHours}
                    icon={Clock}
                    color="bg-cyan-500"
                    subtitle="Time logged across projects"
                    tooltip="Sum of all time tracked across projects and tasks in the selected period"
                    action={() => dispatch({ type: "SET_TAB", payload: "teams" })}
                  />
                  <EnhancedMetricCard
                    title="Time Utilization"
                    comparativeData={enhancedAnalytics.timeMetrics.timeUtilization}
                    icon={Activity}
                    color="bg-pink-500"
                    subtitle="Efficiency of time usage"
                    tooltip="Percentage of time spent on productive tasks vs. total available time"
                    action={() => dispatch({ type: "SET_TAB", payload: "teams" })}
                  />
                  <EnhancedMetricCard
                    title="Projects At Risk"
                    comparativeData={enhancedAnalytics.projectMetrics.projectsAtRisk}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    subtitle="Projects requiring attention"
                    tooltip="Projects with health scores below 60 or critical risk factors that need immediate attention"
                    action={() => {
                      dispatch({ type: "SET_TAB", payload: "projects" });
                      toast.info("Showing projects at risk");
                    }}
                  />
                  <EnhancedMetricCard
                    title="Avg Health Score"
                    comparativeData={enhancedAnalytics.projectMetrics.avgHealthScore}
                    icon={Zap}
                    color="bg-emerald-500"
                    subtitle="Overall project health rating"
                    tooltip="Average health score across all projects, calculated from completion rate, velocity, and risk factors"
                    action={() => dispatch({ type: "SET_TAB", payload: "projects" })}
                  />
                </div>

                {/* Time Series Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="glass-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5" />
                        Performance Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {enhancedAnalytics.timeSeriesData?.length > 0 ? (
                        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                          <InteractiveChart
                            title="Performance Trends"
                            data={enhancedAnalytics.timeSeriesData.map(point => ({
                              label: new Date(point.date).toLocaleDateString(),
                              value: Number(point.productivity) || 0
                            }))}
                            chartType="line"
                            height={256}
                          />
                        </Suspense>
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                            <p className="text-sm text-muted-foreground">
                              Not enough historical data yet
                            </p>
                            <p className="text-xs text-muted-foreground/75">
                              Complete tasks over the next few days to see trends
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Resource Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {enhancedAnalytics.resourceUtilization?.length > 0 ? (
                        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                          <InteractiveChart
                            title="Resource Distribution"
                            data={enhancedAnalytics.resourceUtilization.slice(0, 5).map(resource => ({
                              label: resource.userName,
                              value: Number(resource.utilization) || 0
                            }))}
                            chartType="pie"
                            height={256}
                          />
                        </Suspense>
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                            <p className="text-sm text-muted-foreground">
                              No team activity data
                            </p>
                            <p className="text-xs text-muted-foreground/75">
                              Assign team members to tasks to see resource distribution
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <NoAnalyticsData />
            )}
          </TabsContent>

          {/* Projects Tab - Project Health */}
          <TabsContent value="projects" id="projects-panel" role="tabpanel" aria-labelledby="projects-tab" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ChartSkeleton key={i} height="h-48" />
                ))}
              </div>
            ) : enhancedAnalytics?.projectHealth?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enhancedAnalytics.projectHealth.map((project) => (
                  <ProjectHealthCard 
                    key={project.id} 
                    project={project}
                    onClick={() => {
                      // Navigate to project details
                      navigate({ 
                        to: `/dashboard/workspace/${workspace.id}/project/${project.id}/analytics`
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <NoProjectsData />
            )}
          </TabsContent>

          {/* Teams Tab - Resource Utilization */}
          <TabsContent value="teams" id="teams-panel" role="tabpanel" aria-labelledby="teams-tab" className="space-y-6">
            {isLoading ? (
              <ChartSkeleton height="h-96" />
            ) : enhancedAnalytics?.resourceUtilization?.length > 0 ? (
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle>Team Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enhancedAnalytics.resourceUtilization.map((resource, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <h4 className="font-medium">{resource.userName}</h4>
                          <p className="text-sm text-muted-foreground">{resource.role}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span>Projects: {resource.projectCount}</span>
                            <span>Tasks: {resource.taskCount}</span>
                            <span>Hours: {resource.totalHours}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{resource.utilization}%</span>
                            <Badge variant={
                              resource.workloadBalance === "optimal" ? "default" :
                              resource.workloadBalance === "overloaded" ? "secondary" :
                              resource.workloadBalance === "critical" ? "secondary" :
                              "secondary"
                            }>
                              {resource.workloadBalance}
                            </Badge>
                          </div>
                          <div className="w-32 h-2 bg-muted rounded-full">
                            <div 
                              className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                resource.workloadBalance === "optimal" ? "bg-green-500" :
                                resource.workloadBalance === "overloaded" ? "bg-red-500" :
                                resource.workloadBalance === "critical" ? "bg-red-600" :
                                "bg-blue-500"
                              )}
                              style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <NoTeamData />
            )}
          </TabsContent>

          {/* Insights Tab - AI Insights and Alerts */}
          <TabsContent value="insights" id="insights-panel" role="tabpanel" aria-labelledby="insights-tab" className="space-y-6">
            {isLoading ? (
              <ChartSkeleton height="h-96" />
            ) : (
              <>
                {/* Predictive Analytics */}
                {enhancedAnalytics?.timeSeriesData && enhancedAnalytics.timeSeriesData.length > 0 && (
                  <PredictiveInsights
                    timeSeriesData={enhancedAnalytics.timeSeriesData as any}
                  />
                )}

                {/* AI Insights and Recommendations */}
                <EnhancedInsightsPanel
                  insights={enhancedAnalytics?.summary.recommendations || []}
                  alerts={enhancedAnalytics?.summary.alerts || []}
                  onInsightAction={() => {}}
                />
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Export Dialog */}
        <Dialog open={state.showExportDialog} onOpenChange={(open) => dispatch({ type: "TOGGLE_EXPORT_DIALOG", payload: open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Analytics Data
              </DialogTitle>
              <DialogDescription>
                Download your analytics data in your preferred format
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="export-format">Export Format</Label>
                <Select value={state.exportFormat} onValueChange={(value: any) => dispatch({ type: "SET_EXPORT_FORMAT", payload: value })}>
                  <SelectTrigger id="export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                    <SelectItem value="pdf">PDF (Portable Document)</SelectItem>
                    <SelectItem value="excel">Excel Workbook (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>
                    {state.exportFormat === "csv" && "CSV format is ideal for data analysis in spreadsheet applications."}
                    {state.exportFormat === "pdf" && "PDF format creates a printable report with visualizations."}
                    {state.exportFormat === "excel" && "Excel format includes multiple sheets with formatted tables for comprehensive analysis."}
                  </span>
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => dispatch({ type: "TOGGLE_EXPORT_DIALOG", payload: false })}>
                Cancel
              </Button>
              <Button onClick={() => handleExport(state.exportFormat)} className="gap-2">
                <Download className="h-4 w-4" />
                Export {state.exportFormat.toUpperCase()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modern Filter Slide-out Panel */}
        <Sheet open={state.showFilterPanel} onOpenChange={(open) => dispatch({ type: "TOGGLE_FILTER_PANEL", payload: open })}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters & Settings
              </SheetTitle>
              <SheetDescription>
                Customize your analytics view with filters and comparison options
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-6">
              {/* Filter Presets */}
              <FilterPresets
                currentFilters={{
                  timeRange: state.timeRange,
                  selectedProjects: state.selectedProjects,
                  selectedUsers: state.selectedUsers,
                  comparisonMode: state.comparisonMode,
                  comparisonTimeRange: state.comparisonTimeRange,
                }}
                onApplyPreset={handleApplyPreset}
              />

              <Separator />

              {/* Comparison Mode Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Comparison Mode</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Compare multiple time periods
                    </p>
                  </div>
                  <Button
                    variant={state.comparisonMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => dispatch({ type: "TOGGLE_COMPARISON_MODE" })}
                    className="gap-2"
                  >
                    <TrendingDown className="h-4 w-4" />
                    {state.comparisonMode ? "On" : "Off"}
                  </Button>
                </div>
                {state.comparisonMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="comparison-period" className="text-sm">
                      Compare With
                    </Label>
                    <Select value={state.comparisonTimeRange} onValueChange={(value: any) => dispatch({ type: "SET_COMPARISON_TIME_RANGE", payload: value })}>
                      <SelectTrigger id="comparison-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Previous 7 Days</SelectItem>
                        <SelectItem value="30d">Previous 30 Days</SelectItem>
                        <SelectItem value="90d">Previous 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </div>

              <Separator />

              {/* Custom Date Range */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Custom Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={state.customDateRange.start}
                      onChange={(e) => dispatch({ type: "SET_CUSTOM_DATE_RANGE", payload: { ...state.customDateRange, start: e.target.value } })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={state.customDateRange.end}
                      onChange={(e) => dispatch({ type: "SET_CUSTOM_DATE_RANGE", payload: { ...state.customDateRange, end: e.target.value } })}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Project Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Filter by Projects</Label>
                <MultiSelect
                  options={projectOptions}
                  selected={state.selectedProjects}
                  onChange={(projects) => dispatch({ type: "SET_SELECTED_PROJECTS", payload: projects })}
                  placeholder="Select projects..."
                  emptyMessage="No projects found"
                  maxDisplay={3}
                />
                {projectOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No projects available. Create a project to start filtering.
                  </p>
                )}
              </div>

              <Separator />

              {/* User Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Filter by Team Members</Label>
                <MultiSelect
                  options={userOptions}
                  selected={state.selectedUsers}
                  onChange={(users) => dispatch({ type: "SET_SELECTED_USERS", payload: users })}
                  placeholder="Select team members..."
                  emptyMessage="No team members found"
                  maxDisplay={3}
                />
                {userOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No team members active. Invite team members to start filtering.
                  </p>
                )}
              </div>

              {/* Active Filters Summary */}
              {(state.selectedProjects.length > 0 || state.selectedUsers.length > 0 || state.customDateRange.start || state.comparisonMode) && (
                <>
                  <Separator />
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Active Filters
                    </p>
                  <div className="flex flex-wrap gap-2">
                      {state.comparisonMode && (
                        <Badge variant="secondary" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Comparison
                        </Badge>
                      )}
                      {state.selectedProjects.length > 0 && (
                        <Badge variant="secondary">{state.selectedProjects.length} Projects</Badge>
                      )}
                      {state.selectedUsers.length > 0 && (
                        <Badge variant="secondary">{state.selectedUsers.length} Users</Badge>
                      )}
                      {state.customDateRange.start && (
                        <Badge variant="secondary">Custom Range</Badge>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                Clear All
              </Button>
                <Button onClick={() => dispatch({ type: "TOGGLE_FILTER_PANEL", payload: false })} className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Comparison Mode Dialog */}
        <Dialog open={state.showComparisonDialog} onOpenChange={(open) => dispatch({ type: "TOGGLE_COMPARISON_DIALOG", payload: open })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Compare Time Periods
              </DialogTitle>
              <DialogDescription>
                Compare analytics across different time periods to identify trends and patterns
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Comparison Mode Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Enable Comparison Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    View side-by-side analytics for different time periods
                  </p>
                </div>
                <Button
                  variant={state.comparisonMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => dispatch({ type: "TOGGLE_COMPARISON_MODE" })}
                >
                  {state.comparisonMode ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {state.comparisonMode && (
                <>
                  <Separator />

                  {/* Primary Period */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Primary Period</Label>
                    <Select value={state.timeRange} onValueChange={(value: any) => dispatch({ type: "SET_TIME_RANGE", payload: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Comparison Period */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Compare With</Label>
                    <Select value={state.comparisonTimeRange} onValueChange={(value: any) => dispatch({ type: "SET_COMPARISON_TIME_RANGE", payload: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <span>
                        Comparison mode will display metrics side-by-side with percentage changes highlighted
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => dispatch({ type: "TOGGLE_COMPARISON_DIALOG", payload: false })}>
                Cancel
              </Button>
              <Button onClick={() => {
                dispatch({ type: "TOGGLE_COMPARISON_DIALOG", payload: false });
                if (state.comparisonMode) {
                  toast.success("Comparison mode enabled");
                } else {
                  toast.info("Comparison mode disabled");
                }
              }} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={state.showSettingsDialog} onOpenChange={(open) => dispatch({ type: "TOGGLE_SETTINGS_DIALOG", payload: open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Analytics Settings
              </DialogTitle>
              <DialogDescription>
                Customize your analytics experience
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Auto-refresh */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-refresh Data</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically refresh analytics every 5 minutes
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Coming Soon
                </Button>
              </div>

              <Separator />

              {/* Default Time Range */}
              <div className="space-y-2">
                <Label>Default Time Range</Label>
                <Select defaultValue="30d">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Data Quality Threshold */}
              <div className="space-y-2">
                <Label>Data Quality Threshold</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Show warning when data quality falls below this threshold
                </p>
                <Select defaultValue="80">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60%</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="80">80% (Recommended)</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => dispatch({ type: "TOGGLE_SETTINGS_DIALOG", payload: false })}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast.success("Settings saved successfully");
                dispatch({ type: "TOGGLE_SETTINGS_DIALOG", payload: false });
              }} className="gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          open={state.showKeyboardShortcuts}
          onOpenChange={(open) => dispatch({ type: "TOGGLE_KEYBOARD_SHORTCUTS", payload: open })}
        />

        {/* Onboarding Tour */}
        <OnboardingTour
          open={state.showOnboardingTour}
          onOpenChange={(open) => dispatch({ type: "TOGGLE_ONBOARDING_TOUR", payload: open })}
          onComplete={handleOnboardingComplete}
        />

        {/* Scheduled Reports Modal */}
        <ScheduledReports
          isOpen={state.showScheduledReports}
          onClose={() => dispatch({ type: "TOGGLE_SCHEDULED_REPORTS", payload: false })}
        />

        {/* Custom Widgets Manager */}
        <CustomWidgetsManager
          isOpen={state.showCustomWidgets}
          onClose={() => dispatch({ type: "TOGGLE_CUSTOM_WIDGETS", payload: false })}
          onLayoutChange={(widgets) => {
            logger.debug('Dashboard widgets updated:', widgets);
            // TODO: Apply widget layout to dashboard
          }}
        />
      </div>
    </LazyDashboardLayout>
  );
}

import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/analytics")({
  component: withErrorBoundary(AnalyticsPage, "Analytics Dashboard"),
});