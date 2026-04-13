"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Users,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Filter,
  Settings,
  Plus,
  Trash2,
  Copy,
  Download,
  Save,
  Eye,
  Layout,
  Grid,
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
  Gauge,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Grid3x3,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { MetricSelector, type Metric, type MetricCategory } from "@/components/analytics/metric-selector";
import { VisualizationSelector, type VisualizationType } from "@/components/analytics/visualization-selector";
import { VisualizationPreview } from "@/components/analytics/visualization-preview";
import { useReportBuilder } from "@/hooks/use-report-builder";

// @epic-3.1-analytics: Custom report builder with drag-and-drop interface
// @role-workspace-manager: Executive report creation capabilities
// @role-department-head: Department-specific custom reports
// @role-project-manager: Project analytics customization

// Type definitions for report builder
interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: "project" | "task" | "team" | "time" | "finance" | "quality";
  dataType: "number" | "percentage" | "currency" | "duration" | "count";
  icon: React.ComponentType<{ className?: string }>;
  formula?: string;
  dependencies?: string[];
  permissions?: string[];
}

interface FilterDefinition {
  id: string;
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "between" | "in";
  value: any;
  dataType: "string" | "number" | "date" | "boolean" | "array";
  label: string;
}

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  visualizations: {
    type: string;
    metrics: string[];
    config: any;
    position: { x: number; y: number; w: number; h: number };
  }[];
  filters: FilterDefinition[];
  timeRange: {
    type: "7d" | "30d" | "90d" | "1y" | "custom";
    start?: string;
    end?: string;
  };
  groupBy?: string;
  sortBy?: { field: string; direction: "asc" | "desc" };
  createdAt: string;
  updatedAt: string;
}

// Available metrics for report building
const AVAILABLE_METRICS: MetricDefinition[] = [
  // Project Metrics
  {
    id: "totalProjects",
    name: "Total Projects",
    description: "Total number of projects in workspace",
    category: "project",
    dataType: "count",
    icon: Target,
  },
  {
    id: "activeProjects",
    name: "Active Projects",
    description: "Currently active projects",
    category: "project",
    dataType: "count",
    icon: Activity,
  },
  {
    id: "completedProjects",
    name: "Completed Projects",
    description: "Successfully completed projects",
    category: "project",
    dataType: "count",
    icon: CheckCircle2,
  },
  {
    id: "projectsAtRisk",
    name: "Projects at Risk",
    description: "Projects requiring attention",
    category: "project",
    dataType: "count",
    icon: AlertTriangle,
  },
  {
    id: "avgProjectHealth",
    name: "Average Project Health",
    description: "Average health score across projects",
    category: "project",
    dataType: "percentage",
    icon: Gauge,
  },
  
  // Task Metrics
  {
    id: "totalTasks",
    name: "Total Tasks",
    description: "Total number of tasks",
    category: "task",
    dataType: "count",
    icon: BarChart3,
  },
  {
    id: "completedTasks",
    name: "Completed Tasks",
    description: "Successfully completed tasks",
    category: "task",
    dataType: "count",
    icon: CheckCircle2,
  },
  {
    id: "inProgressTasks",
    name: "In Progress Tasks",
    description: "Currently active tasks",
    category: "task",
    dataType: "count",
    icon: Activity,
  },
  {
    id: "overdueTasks",
    name: "Overdue Tasks",
    description: "Tasks past their due date",
    category: "task",
    dataType: "count",
    icon: AlertTriangle,
  },
  {
    id: "avgTaskCycleTime",
    name: "Average Task Cycle Time",
    description: "Average time to complete tasks",
    category: "task",
    dataType: "duration",
    icon: Clock,
  },
  {
    id: "taskThroughput",
    name: "Task Throughput",
    description: "Tasks completed per time period",
    category: "task",
    dataType: "count",
    icon: TrendingUp,
  },

  // Team Metrics
  {
    id: "totalMembers",
    name: "Total Team Members",
    description: "Total number of team members",
    category: "team",
    dataType: "count",
    icon: Users,
  },
  {
    id: "activeMembers",
    name: "Active Members",
    description: "Currently active team members",
    category: "team",
    dataType: "count",
    icon: Users,
  },
  {
    id: "avgProductivity",
    name: "Average Productivity",
    description: "Average team productivity score",
    category: "team",
    dataType: "percentage",
    icon: TrendingUp,
  },
  {
    id: "teamEfficiency",
    name: "Team Efficiency",
    description: "Overall team efficiency rating",
    category: "team",
    dataType: "percentage",
    icon: Zap,
  },
  {
    id: "collaborationScore",
    name: "Collaboration Score",
    description: "Team collaboration effectiveness",
    category: "team",
    dataType: "percentage",
    icon: Users,
  },

  // Time Metrics
  {
    id: "totalHours",
    name: "Total Hours Logged",
    description: "Total time logged across projects",
    category: "time",
    dataType: "duration",
    icon: Clock,
  },
  {
    id: "billableHours",
    name: "Billable Hours",
    description: "Billable time logged",
    category: "time",
    dataType: "duration",
    icon: Clock,
  },
  {
    id: "timeUtilization",
    name: "Time Utilization",
    description: "Efficiency of time usage",
    category: "time",
    dataType: "percentage",
    icon: Activity,
  },
  {
    id: "avgTimePerTask",
    name: "Average Time per Task",
    description: "Average time spent per task",
    category: "time",
    dataType: "duration",
    icon: Clock,
  },
];

// Available visualization types
const VISUALIZATION_TYPES: VisualizationType[] = [
  {
    id: "metric-card",
    name: "Metric Card",
    description: "Single metric display with trend",
    icon: BarChart3,
    supportedDataTypes: ["number", "percentage", "currency", "duration", "count"],
    maxMetrics: 1,
  },
  {
    id: "bar-chart",
    name: "Bar Chart",
    description: "Compare values across categories",
    icon: BarChart3,
    supportedDataTypes: ["number", "count"],
    maxMetrics: 5,
    requiresGrouping: true,
  },
  {
    id: "line-chart",
    name: "Line Chart",
    description: "Show trends over time",
    icon: LineChart,
    supportedDataTypes: ["number", "percentage", "count"],
    maxMetrics: 3,
  },
  {
    id: "pie-chart",
    name: "Pie Chart",
    description: "Show parts of a whole",
    icon: PieChart,
    supportedDataTypes: ["number", "percentage", "count"],
    maxMetrics: 1,
    requiresGrouping: true,
  },
  {
    id: "gauge",
    name: "Gauge",
    description: "Progress toward a goal",
    icon: Gauge,
    supportedDataTypes: ["percentage"],
    maxMetrics: 1,
  },
  {
    id: "heatmap",
    name: "Heatmap",
    description: "Intensity across dimensions",
    icon: Grid,
    supportedDataTypes: ["number", "count"],
    maxMetrics: 1,
    requiresGrouping: true,
  },
];

// Draggable metric item component
const DraggableMetric = ({ metric, isSelected }: { metric: MetricDefinition; isSelected: boolean }) => {
  const IconComponent = metric.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-background hover:border-primary/50 hover:shadow-sm"
      )}
    >
      <div className={cn(
        "p-2 rounded-md",
        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <IconComponent className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{metric.name}</p>
        <p className="text-xs text-muted-foreground truncate">{metric.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {metric.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {metric.dataType}
          </Badge>
        </div>
      </div>
    </div>
  );
};

// Report preview component
const ReportPreview = ({ config }: { config: ReportConfig }) => {
  if (!config.metrics.length) {
    return (
      <div className="h-96 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
        <div className="text-center space-y-2">
          <Layout className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Select metrics and visualizations to preview your report</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Report Preview</h3>
        <Badge variant="outline">{config.metrics.length} metric{config.metrics.length > 1 ? 's' : ''}</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {config.visualizations.map((viz, index) => (
          <Card key={index} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {(() => {
                  const vizType = VISUALIZATION_TYPES.find((v: VisualizationType) => v.id === viz.type);
                  if (vizType?.icon) {
                    const IconComponent = vizType.icon;
                    return <IconComponent className="h-4 w-4" />;
                  }
                  return null;
                })()}
                {VISUALIZATION_TYPES.find((v: VisualizationType) => v.id === viz.type)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted/30 rounded-md flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">
                  {viz.metrics.map(metricId => 
                    AVAILABLE_METRICS.find(m => m.id === metricId)?.name
                  ).join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Main report builder component
function ReportBuilderPage() {
  const navigate = useNavigate();
  const { hasPermission, user, permissions } = useRBACAuth();
  const { workspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState("metrics");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    id: "",
    name: "",
    description: "",
    metrics: [],
    visualizations: [],
    filters: [],
    timeRange: { type: "30d" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  // Debugging// Check for authentication and workspace access
  if (!hasPermission("canCreateReports")) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to create reports.
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
  if (!workspace) {
    return (
      <LazyDashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Workspace Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select a workspace to create reports.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard" })}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  const handleConfigUpdate = (config: Partial<ReportConfig>) => {
    setReportConfig(prev => ({ ...prev, ...config }));
  };

  const {
    reportName,
    reportDescription,
    selectedMetrics,
    selectedVisualization,
    metricCategories,
    visualizationTypes,
    reportData,
    selectedMetricObjects,
    selectedMetricTypes,
    isLoading,
    isSaving,
    setReportName,
    setReportDescription,
    handleMetricSelect,
    handleVisualizationSelect,
    handleSave
  } = useReportBuilder({
    onSaveSuccess: () => {
      toast.success("Report configuration saved successfully");
      navigate({ to: "/dashboard/analytics" });
    },
    onSaveError: (error) => {
      toast.error(error.message || "Failed to save report configuration");
    }
  });

  const handleSaveClick = () => {
    try {
      handleSave();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save report configuration");
      }
    }
  };

  return (
    <LazyDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Custom Report Builder</h1>
            <p className="text-muted-foreground">
              Create and customize analytics reports with drag-and-drop simplicity
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/analytics" })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setActiveTab("preview")}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSaveClick}>
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>

        {/* Report Configuration */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeRange">Time Range</Label>
                <Select
                  value={reportConfig.timeRange.type}
                  onValueChange={(value) => setReportConfig(config => ({
                    ...config,
                    timeRange: { type: value as any },
                    updatedAt: new Date().toISOString(),
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDescription">Description (Optional)</Label>
              <Textarea
                id="reportDescription"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe what this report shows"
                rows={2}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Builder Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Builder Tools */}
          <div className="lg:col-span-1 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="visualizations">Charts</TabsTrigger>
                <TabsTrigger value="filters">Filters</TabsTrigger>
              </TabsList>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Available Metrics</CardTitle>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search metrics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {Object.entries(groupedMetrics).map(([category, metrics]) => (
                          <div key={category}>
                            <button
                              onClick={() => toggleCategory(category)}
                              className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
                            >
                              {expandedCategories.includes(category) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium capitalize">{category}</span>
                              <Badge variant="secondary" className="ml-auto">
                                {metrics.length}
                              </Badge>
                            </button>
                            
                            <AnimatePresence>
                              {expandedCategories.includes(category) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2 ml-6 mt-2">
                                    {metrics.map((metric) => (
                                      <div
                                        key={metric.id}
                                        onClick={() => handleMetricToggle(metric.id)}
                                        className="cursor-pointer"
                                      >
                                        <DraggableMetric
                                          metric={metric}
                                          isSelected={selectedMetrics.includes(metric.id)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Visualizations Tab */}
              <TabsContent value="visualizations" className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Chart Types</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
                    </p>
                  </CardHeader>
                  <CardContent>
                    <VisualizationSelector
                      selectedType={selectedVisualization}
                      onSelect={handleVisualizationSelect}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Filters Tab */}
              <TabsContent value="filters" className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Advanced Filters</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add filters to refine your data
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Advanced filtering coming in Phase 2.4</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Preview */}
          <Card className="col-span-8 p-4">
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg">
              {isLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading...
                  </p>
                </div>
              ) : selectedMetrics.length === 0 ? (
                <div className="text-center">
                  <Grid3x3 className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 font-medium">Report Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Select metrics and visualizations to preview your report
                  </p>
                </div>
              ) : (
                <div className="w-full h-full p-4">
                  {selectedVisualization ? (
                    <VisualizationPreview
                      metrics={selectedMetricObjects}
                      visualization={visualizationTypes.find(v => v.id === selectedVisualization)!}
                      data={reportData}
                    />
                  ) : (
                    <div className="text-center">
                      <h3 className="font-medium">Selected Metrics:</h3>
                      <ul className="mt-2 space-y-1">
                        {selectedMetricObjects.map(metric => (
                          <li key={metric.id} className="text-sm text-muted-foreground">
                            {metric.name}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Select a visualization type to preview the report
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </LazyDashboardLayout>
  );
}

import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/analytics/builder")({
  component: withErrorBoundary(ReportBuilderPage, "Report Builder"),
}); 