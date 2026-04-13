// @epic-3.1-dashboards: Enhanced stats grid component for dashboard metrics
// @persona-sarah: PM needs comprehensive project overview and metrics
// @persona-jennifer: Executive needs high-level KPIs and performance indicators
// @persona-david: Team lead needs workload and productivity metrics

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Users, 
  FolderOpen, 
  BarChart3,
  Target,
  Calendar,
  Activity
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeProjects: number;
  teamMembers: number;
  productivity: number;
}

interface StatsGridProps {
  stats: DashboardStats;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  className?: string;
  showTrends?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  onClick?: () => void;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
  trend,
  onClick,
  isLoading = false
}: StatCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, isLoading]);

  if (isLoading) {
    return (
      <Card className="p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <div className="mt-3">
          <Skeleton className="h-3 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer",
        onClick && "hover:scale-[1.02]",
        isAnimating && "ring-2 ring-blue-200 ring-opacity-50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center">
          <div className={cn("flex items-center justify-center rounded p-2", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            <p className={cn(
              "text-2xl font-bold transition-all duration-300",
              isAnimating && "scale-110"
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center space-x-1",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">
                  {Math.abs(trend.value).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({
  stats,
  isLoading = false,
  error,
  onRefresh,
  className = "",
  showTrends = true
}: StatsGridProps) {
  const [previousStats, setPreviousStats] = useState<DashboardStats | null>(null);

  // Store previous stats for trend calculation
  useEffect(() => {
    if (!isLoading && stats && !error) {
      setPreviousStats(current => current || stats);
    }
  }, [stats, isLoading, error]);

  const calculateTrend = (current: number, previous: number): {
    value: number;
    isPositive: boolean;
  } => {
    if (!previous || previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
  };

  const getCompletionRate = () => {
    if (stats.totalTasks === 0) return 0;
    return ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1);
  };

  const getOverdueRate = () => {
    if (stats.totalTasks === 0) return 0;
    return ((stats.overdueTasks / stats.totalTasks) * 100).toFixed(1);
  };

  const completedTrend = previousStats ? 
    calculateTrend(stats.completedTasks, previousStats.completedTasks) : null;
  const productivityTrend = previousStats ? 
    calculateTrend(stats.productivity, previousStats.productivity) : null;
  const projectsTrend = previousStats ? 
    calculateTrend(stats.activeProjects, previousStats.activeProjects) : null;
  const overdueTrend = previousStats ? 
    calculateTrend(stats.overdueTasks, previousStats.overdueTasks) : null;

  if (error) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
        <Card className="col-span-full p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Unable to load stats</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          {onRefresh && (
            <Button onClick={onRefresh} size="sm">
              Try Again
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {/* Completed Tasks */}
      <StatCard
        title="Completed Tasks"
        value={stats.completedTasks}
        icon={CheckCircle}
        color="text-green-600"
        bgColor="bg-green-100"
        subtitle={`${getCompletionRate()}% completion rate`}
        trend={showTrends && completedTrend ? {
          ...completedTrend,
          label: "this period"
        } : undefined}
        isLoading={isLoading}
      />

      {/* Productivity Score */}
      <StatCard
        title="Productivity"
        value={`${stats.productivity}%`}
        icon={BarChart3}
        color="text-blue-600"
        bgColor="bg-blue-100"
        subtitle="Based on task completion rate"
        trend={showTrends && productivityTrend ? {
          ...productivityTrend,
          label: "vs last period"
        } : undefined}
        isLoading={isLoading}
      />

      {/* Active Projects */}
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        icon={FolderOpen}
        color="text-purple-600"
        bgColor="bg-purple-100"
        subtitle={`${stats.teamMembers} team members involved`}
        trend={showTrends && projectsTrend ? {
          ...projectsTrend,
          label: "new projects"
        } : undefined}
        isLoading={isLoading}
      />

      {/* Overdue Tasks */}
      <StatCard
        title="Overdue Tasks"
        value={stats.overdueTasks}
        icon={AlertTriangle}
        color="text-orange-600"
        bgColor="bg-orange-100"
        subtitle={`${getOverdueRate()}% of total tasks`}
        trend={showTrends && overdueTrend ? {
          ...overdueTrend,
          isPositive: !overdueTrend.isPositive, // Reverse for overdue (less is better)
          label: "this period"
        } : undefined}
        isLoading={isLoading}
      />
    </div>
  );
}

// Enhanced version with additional metrics for executives
export function ExecutiveStatsGrid({
  stats,
  isLoading = false,
  error,
  onRefresh,
  className = ""
}: Omit<StatsGridProps, 'showTrends'>) {
  if (error) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-6", className)}>
        <Card className="col-span-full p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Unable to load executive dashboard</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          {onRefresh && (
            <Button onClick={onRefresh} size="sm">
              Refresh Dashboard
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const performanceScore = Math.min(100, Math.max(0, 
    (stats.productivity * 0.4) + 
    ((stats.completedTasks / Math.max(1, stats.totalTasks)) * 100 * 0.3) + 
    (Math.max(0, 100 - (stats.overdueTasks / Math.max(1, stats.totalTasks)) * 100) * 0.3)
  ));

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-6", className)}>
      <StatCard
        title="Overall Performance"
        value={`${performanceScore.toFixed(0)}%`}
        icon={Target}
        color="text-indigo-600"
        bgColor="bg-indigo-100"
        subtitle="Composite performance score"
        isLoading={isLoading}
      />
      
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        icon={FolderOpen}
        color="text-green-600"
        bgColor="bg-green-100"
        subtitle="In progress"
        isLoading={isLoading}
      />
      
      <StatCard
        title="Team Size"
        value={stats.teamMembers}
        icon={Users}
        color="text-blue-600"
        bgColor="bg-blue-100"
        subtitle="Active members"
        isLoading={isLoading}
      />
      
      <StatCard
        title="Completion Rate"
        value={`${((stats.completedTasks / Math.max(1, stats.totalTasks)) * 100).toFixed(1)}%`}
        icon={CheckCircle}
        color="text-green-600"
        bgColor="bg-green-100"
        subtitle={`${stats.completedTasks} / ${stats.totalTasks} tasks`}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Productivity"
        value={`${stats.productivity}%`}
        icon={TrendingUp}
        color="text-purple-600"
        bgColor="bg-purple-100"
        subtitle="Team efficiency"
        isLoading={isLoading}
      />
      
      <StatCard
        title="Risk Level"
        value={stats.overdueTasks > 5 ? "High" : stats.overdueTasks > 2 ? "Medium" : "Low"}
        icon={AlertTriangle}
        color={stats.overdueTasks > 5 ? "text-red-600" : stats.overdueTasks > 2 ? "text-orange-600" : "text-green-600"}
        bgColor={stats.overdueTasks > 5 ? "bg-red-100" : stats.overdueTasks > 2 ? "bg-orange-100" : "bg-green-100"}
        subtitle={`${stats.overdueTasks} overdue tasks`}
        isLoading={isLoading}
      />
    </div>
  );
} 