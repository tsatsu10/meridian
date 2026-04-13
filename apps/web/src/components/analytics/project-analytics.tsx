import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveChart, ChartType, TimeRange } from "@/components/dashboard/interactive-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Info,
  Zap,
  Award
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface ProjectAnalyticsProps {
  projectId: string;
}

// @epic-3.1-analytics: Project-specific analytics dashboard @persona-sarah
export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedDrillDown, setSelectedDrillDown] = useState<'overdue' | 'high-priority' | 'in-progress' | null>(null);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ["project-analytics", projectId, timeRange],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analytics?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error(`❌ Analytics API error: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch analytics");
      }
      const data = await response.json();
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5)
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const data = response?.data;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            refetch();
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case '/':
            e.preventDefault();
            setShowKeyboardShortcuts(true);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [refetch]);

  const handleExport = () => {
    if (!data) return;
    
    // Create CSV data
    const csvData = [
      ['Metric', 'Value'],
      ['Total Tasks', data.taskMetrics.total],
      ['Completed Tasks', data.taskMetrics.completed],
      ['Overdue Tasks', data.taskMetrics.overdue],
      ['High Priority Tasks', data.taskMetrics.highPriority],
      ['Total Hours', data.timeMetrics.totalHours],
      ['Project Health Score', data.projectHealth.score],
      ['Active Members', data.teamMetrics.activeMembers],
      ['Productivity Score', data.teamMetrics.avgProductivity],
      ['Current Velocity', data.velocityMetrics?.current || 0],
      ['', ''],
      ['Team Performance', ''],
      ['Name', 'Completed Tasks', 'In Progress', 'Total Hours', 'Productivity %'],
      ...data.teamMetrics.memberPerformance?.map((m: any) => [
        m.name, m.completedTasks, m.inProgressTasks, m.totalHours.toFixed(1), m.productivity.toFixed(1)
      ]) || []
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId}-analytics-${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Analytics data exported successfully');
  };

  const handleDrillDown = (type: 'overdue' | 'high-priority' | 'in-progress') => {
    setSelectedDrillDown(type);
    // TODO: Fetch specific task list and show in modal/side panel
    toast.info(`Drill-down for ${type} tasks - Feature coming soon`);
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error loading analytics</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
            <p className="text-red-600 text-sm mt-2">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try refreshing the page or contact support if the problem persists.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No analytics data available for this project</p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = data.taskMetrics.total > 0 
    ? (data.taskMetrics.completed / data.taskMetrics.total) * 100 
    : 0;

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Controls with Last Updated */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
            </SelectContent>
          </Select>

          {data?.lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Updated {formatDistanceToNow(new Date(data.lastUpdated))} ago</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh data (Cmd/Ctrl + R)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* AI Insights Panel */}
      {data?.insights && data.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Automatically generated insights based on your project data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights.map((insight: any, index: number) => {
                  const Icon = insight.type === 'positive' ? CheckCircle2 :
                              insight.type === 'warning' ? AlertTriangle :
                              insight.type === 'info' ? Info : Sparkles;
                  const color = insight.type === 'positive' ? 'text-green-600' :
                               insight.type === 'warning' ? 'text-yellow-600' :
                               insight.type === 'info' ? 'text-blue-600' : 'text-purple-600';
                  
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg">
                      <Icon className={cn("h-5 w-5 mt-0.5", color)} />
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Key Metrics Grid with Tooltips & Drill-Down */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toast.info('Click to view all tasks - Feature coming soon')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total number of tasks in this project</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold">{data.taskMetrics.total}</p>
                <p className="text-xs text-muted-foreground">
                  {data.taskMetrics.completed} completed
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of completed tasks</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
                <Progress value={completionRate} className="mt-2" />
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total time logged on project tasks</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold">{Math.round(data.timeMetrics.totalHours)}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {data.timeMetrics.avgCompletionTime.toFixed(1)}h per task
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of team members working on this project</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold">{data.teamMetrics.activeMembers}</p>
                <p className="text-xs text-muted-foreground">
                  {data.teamMetrics.avgProductivity.toFixed(1)}% productivity
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Health & Risk Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cn("border-2", getHealthColor(data.projectHealth.score))}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Project Health Score
              <Badge variant="outline" className={getHealthColor(data.projectHealth.score)}>
                {data.projectHealth.score.toFixed(1)}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={data.projectHealth.score} className="mb-4" />
            {data.projectHealth.riskFactors && data.projectHealth.riskFactors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Risk Factors:</p>
                <div className="space-y-1">
                  {data.projectHealth.riskFactors.map((risk, index) => (
                    <div key={index} className="flex items-center text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Overview</CardTitle>
            <CardDescription>Click to view task details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div 
                className="flex justify-between items-center p-2 rounded hover:bg-muted transition-colors cursor-pointer"
                onClick={() => toast.info('View completed tasks - Feature coming soon')}
              >
                <span className="text-sm">Completed</span>
                <Badge variant="default">{data.taskMetrics.completed}</Badge>
              </div>
              <div 
                className="flex justify-between items-center p-2 rounded hover:bg-muted transition-colors cursor-pointer"
                onClick={() => handleDrillDown('in-progress')}
              >
                <span className="text-sm">In Progress</span>
                <Badge variant="secondary">{data.taskMetrics.inProgress}</Badge>
              </div>
              <div 
                className="flex justify-between items-center p-2 rounded hover:bg-muted transition-colors cursor-pointer"
                onClick={() => handleDrillDown('high-priority')}
              >
                <span className="text-sm">High Priority</span>
                <Badge variant="outline">{data.taskMetrics.highPriority}</Badge>
              </div>
              <div 
                className="flex justify-between items-center p-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                onClick={() => handleDrillDown('overdue')}
              >
                <span className="text-sm text-red-600 font-medium">Overdue</span>
                <Badge variant="destructive">{data.taskMetrics.overdue}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Breakdown */}
      {data?.teamMetrics?.memberPerformance && data.teamMetrics.memberPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
            <CardDescription>Individual contributor metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.teamMetrics.memberPerformance.map((member: any, index: number) => (
                <div key={member.email} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{member.name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {index === 0 && member.completedTasks > 0 && (
                        <Award className="h-4 w-4 text-yellow-500 -ml-2 -mt-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.completedTasks} tasks completed · {member.inProgressTasks} in progress
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{member.totalHours.toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground">logged</p>
                    </div>
                    <div className="w-24">
                      <Progress value={member.productivity} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{member.productivity.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Velocity & Burndown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart */}
        {data?.velocityMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Team Velocity
              </CardTitle>
              <CardDescription>
                <span>Current: {data.velocityMetrics.current.toFixed(1)} tasks/week</span>
              </CardDescription>
              <div className="flex items-center gap-2 mt-1">
                {data.velocityMetrics.trend === 'increasing' && (
                  <Badge variant="default">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {Math.abs(data.velocityMetrics.changePercentage).toFixed(1)}% up
                  </Badge>
                )}
                {data.velocityMetrics.trend === 'decreasing' && (
                  <Badge variant="destructive">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {Math.abs(data.velocityMetrics.changePercentage).toFixed(1)}% down
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Period</p>
                    <p className="text-2xl font-bold">{data.velocityMetrics.current.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">tasks per week</p>
                  </div>
                  <div className={cn(
                    "text-right",
                    data.velocityMetrics.trend === 'increasing' ? 'text-green-600' :
                    data.velocityMetrics.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {data.velocityMetrics.trend === 'increasing' && <TrendingUp className="h-8 w-8" />}
                    {data.velocityMetrics.trend === 'decreasing' && <TrendingDown className="h-8 w-8" />}
                    {data.velocityMetrics.trend === 'stable' && <Activity className="h-8 w-8" />}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Historical Average</p>
                    <p className="text-xl font-bold">{data.velocityMetrics.historical.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">tasks per week</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Milestone Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Milestone Progress</CardTitle>
            <CardDescription>
              {data.milestoneMetrics.total > 0 
                ? `${data.milestoneMetrics.achieved} of ${data.milestoneMetrics.total} milestones achieved`
                : 'No milestones defined'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.milestoneMetrics.total > 0 ? (
              <InteractiveChart
                title="Milestone Status"
                data={[
                  { label: "Achieved", value: data.milestoneMetrics.achieved },
                  { label: "Upcoming", value: data.milestoneMetrics.upcoming },
                  { label: "Missed", value: data.milestoneMetrics.missed }
                ]}
                chartType="pie"
                height={300}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No milestones have been added to this project yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Burndown Chart */}
      {data?.burndownData && data.burndownData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Burndown Chart
            </CardTitle>
            <CardDescription>
              Track remaining work vs. ideal progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              title="Work Remaining"
              data={data.burndownData.map((point: any) => ({
                label: point.label,
                value: point.actual,
                ideal: point.ideal
              }))}
              chartType="line"
              height={400}
              showTrend={false}
              color="#ef4444"
            />
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-red-500 rounded"></div>
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500 rounded border border-blue-500"></div>
                <span>Ideal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Completion Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Trend</CardTitle>
          <CardDescription>
            Visualize task completion over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InteractiveChart
            title="Completed Tasks Over Time"
            data={data.taskTrend}
            chartType={chartType}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onChartTypeChange={setChartType}
            height={400}
            showTrend={true}
            showComparison={true}
          />
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Help */}
      {showKeyboardShortcuts && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Keyboard Shortcuts
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowKeyboardShortcuts(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 rounded border">Cmd/Ctrl + R</kbd>
                <span>Refresh data</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 rounded border">Cmd/Ctrl + E</kbd>
                <span>Export data</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 rounded border">Cmd/Ctrl + /</kbd>
                <span>Show shortcuts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 