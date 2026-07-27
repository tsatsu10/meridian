import { Suspense, lazy, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DashboardWidget } from "./custom-widgets-manager";
import type {
  EnhancedAnalyticsResponse,
  ComparativeData,
} from "@/hooks/queries/analytics/use-enhanced-analytics";

const InteractiveChart = lazy(() =>
  import("@/components/dashboard/interactive-chart").then((module) => ({
    default: module.InteractiveChart,
  })),
);

const sizeClass: Record<DashboardWidget["size"], string> = {
  small: "col-span-1",
  medium: "col-span-1 md:col-span-2",
  large: "col-span-1 md:col-span-2 lg:col-span-3",
  full: "col-span-1 md:col-span-2 lg:col-span-4",
};

// Maps a widget's (dataSource, config.metric) to a real ComparativeData value
// already computed by getEnhancedAnalytics - no fabricated numbers.
function resolveMetric(
  analytics: EnhancedAnalyticsResponse,
  dataSource: string,
  metric: string | undefined,
): { label: string; data: ComparativeData } | null {
  const table: Record<
    string,
    Record<string, { label: string; data: ComparativeData }>
  > = {
    projects: {
      totalProjects: {
        label: "Total Projects",
        data: analytics.projectMetrics.totalProjects,
      },
      activeProjects: {
        label: "Active Projects",
        data: analytics.projectMetrics.activeProjects,
      },
      projectsAtRisk: {
        label: "Projects At Risk",
        data: analytics.projectMetrics.projectsAtRisk,
      },
      avgHealthScore: {
        label: "Avg Health Score",
        data: analytics.projectMetrics.avgHealthScore,
      },
    },
    team: {
      avgProductivity: {
        label: "Team Productivity",
        data: analytics.teamMetrics.avgProductivity,
      },
      activeMembers: {
        label: "Active Members",
        data: analytics.teamMetrics.activeMembers,
      },
      totalMembers: {
        label: "Total Members",
        data: analytics.teamMetrics.totalMembers,
      },
    },
    time: {
      totalHours: {
        label: "Total Hours",
        data: analytics.timeMetrics.totalHours,
      },
      timeUtilization: {
        label: "Time Utilization",
        data: analytics.timeMetrics.timeUtilization,
      },
    },
    analytics: {
      completedTasks: {
        label: "Completed Tasks",
        data: analytics.taskMetrics.completedTasks,
      },
      overdueTasks: {
        label: "Overdue Tasks",
        data: analytics.taskMetrics.overdueTasks,
      },
    },
  };

  const bySource = table[dataSource];
  if (!bySource) return null;
  if (metric && bySource[metric]) return bySource[metric];
  // No metric specified (or unknown) - fall back to the first metric for that source
  const [first] = Object.values(bySource);
  return first ?? null;
}

function MetricCardWidget({
  widget,
  analytics,
}: { widget: DashboardWidget; analytics: EnhancedAnalyticsResponse }) {
  const resolved = resolveMetric(
    analytics,
    widget.dataSource,
    widget.config.metric as string | undefined,
  );

  if (!resolved) {
    return (
      <Card className="glass-card border-border/50 h-full">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No data source configured for this widget.
        </CardContent>
      </Card>
    );
  }

  const { change } = resolved.data;
  const showTrend =
    widget.config.showTrend !== false && change.percentage !== 0;
  const TrendIcon =
    change.trend === "up"
      ? ArrowUpRight
      : change.trend === "down"
        ? ArrowDownRight
        : Minus;
  const trendColor =
    change.trend === "up"
      ? "text-green-600 dark:text-green-400"
      : change.trend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-600 dark:text-gray-400";

  return (
    <Card className="glass-card border-border/50 h-full">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground font-medium">
          {widget.title || resolved.label}
        </p>
        <div className="flex items-baseline gap-3 mt-2">
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {resolved.data.current}
          </p>
          {showTrend && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-semibold",
                trendColor,
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span className="tabular-nums">
                {Math.abs(change.percentage)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartWidget({
  widget,
  analytics,
  chartType,
}: {
  widget: DashboardWidget;
  analytics: EnhancedAnalyticsResponse;
  chartType: "line" | "bar" | "pie";
}) {
  const data = useMemo(() => {
    if (widget.dataSource === "team") {
      return analytics.resourceUtilization
        .slice(0, 8)
        .map((r) => ({ label: r.userName, value: Number(r.utilization) || 0 }));
    }
    if (widget.dataSource === "projects") {
      return analytics.projectHealth
        .slice(0, 8)
        .map((p) => ({ label: p.name, value: Number(p.healthScore) || 0 }));
    }
    // dataSource === "analytics" (or default): plot the requested metric from
    // the time series - the same source the Overview tab's own charts use.
    const metrics = widget.config.metrics as string[] | undefined;
    const metric = metrics?.[0] ?? "productivity";
    return analytics.timeSeriesData.map((point) => ({
      label: new Date(point.date).toLocaleDateString(),
      value: Number((point as unknown as Record<string, unknown>)[metric]) || 0,
    }));
  }, [widget, analytics]);

  if (data.length === 0) {
    return (
      <Card className="glass-card border-border/50 h-full">
        <CardHeader>
          <CardTitle className="text-sm">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Not enough data yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InteractiveChart
        title={widget.title}
        data={data}
        chartType={chartType}
        height={240}
      />
    </Suspense>
  );
}

function ProgressBarWidget({
  widget,
  analytics,
}: { widget: DashboardWidget; analytics: EnhancedAnalyticsResponse }) {
  const projectId = widget.config.project as string | undefined;
  const project = projectId
    ? analytics.projectHealth.find((p) => p.id === projectId)
    : analytics.projectHealth[0];

  if (!project) {
    return (
      <Card className="glass-card border-border/50 h-full">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No projects to track yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {widget.title || project.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium tabular-nums">
            {project.completion}%
          </span>
        </div>
        <Progress value={project.completion} className="h-2" />
      </CardContent>
    </Card>
  );
}

function ListWidget({
  widget,
  analytics,
}: { widget: DashboardWidget; analytics: EnhancedAnalyticsResponse }) {
  const limit = (widget.config.limit as number) || 5;
  const isTeam = widget.dataSource === "team";

  const items = isTeam
    ? [...analytics.resourceUtilization]
        .sort((a, b) => b.utilization - a.utilization)
        .slice(0, limit)
        .map((r) => ({
          id: r.userEmail,
          label: r.userName,
          value: `${r.utilization}%`,
        }))
    : [...analytics.projectHealth]
        .sort((a, b) => b.healthScore - a.healthScore)
        .slice(0, limit)
        .map((p) => ({
          id: p.id,
          label: p.name,
          value: `${p.healthScore}/100`,
        }));

  return (
    <Card className="glass-card border-border/50 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {index + 1}. {item.label}
                </span>
                <span className="font-medium tabular-nums">{item.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HeatmapWidget({
  widget,
  analytics,
}: { widget: DashboardWidget; analytics: EnhancedAnalyticsResponse }) {
  const days = analytics.timeSeriesData.slice(-14);
  const max = Math.max(1, ...days.map((d) => d.hoursLogged));

  return (
    <Card className="glass-card border-border/50 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough activity yet.
          </p>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const intensity = d.hoursLogged / max;
              return (
                <div
                  key={d.date}
                  title={`${new Date(d.date).toLocaleDateString()}: ${d.hoursLogged}h logged`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: `rgba(45, 212, 191, ${0.12 + intensity * 0.75})`,
                  }}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GaugeWidget({
  widget,
  analytics,
}: { widget: DashboardWidget; analytics: EnhancedAnalyticsResponse }) {
  const resolved = resolveMetric(
    analytics,
    widget.dataSource,
    widget.config.metric as string | undefined,
  );
  const value = Math.max(0, Math.min(100, resolved?.data.current ?? 0));

  return (
    <Card className="glass-card border-border/50 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {widget.title || resolved?.label || "Gauge"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums mb-2">{value}%</p>
        <Progress value={value} className="h-2" />
      </CardContent>
    </Card>
  );
}

export function WidgetRenderer({
  widget,
  analytics,
}: { widget: DashboardWidget; analytics: EnhancedAnalyticsResponse }) {
  const content = (() => {
    switch (widget.type) {
      case "metric-card":
        return <MetricCardWidget widget={widget} analytics={analytics} />;
      case "bar-chart":
        return (
          <ChartWidget widget={widget} analytics={analytics} chartType="bar" />
        );
      case "line-chart":
        return (
          <ChartWidget widget={widget} analytics={analytics} chartType="line" />
        );
      case "pie-chart":
        return (
          <ChartWidget widget={widget} analytics={analytics} chartType="pie" />
        );
      case "progress-bar":
        return <ProgressBarWidget widget={widget} analytics={analytics} />;
      case "list":
        return <ListWidget widget={widget} analytics={analytics} />;
      case "heatmap":
        return <HeatmapWidget widget={widget} analytics={analytics} />;
      case "gauge":
        return <GaugeWidget widget={widget} analytics={analytics} />;
      default:
        return null;
    }
  })();

  return <div className={sizeClass[widget.size]}>{content}</div>;
}

export function readSavedWidgets(): DashboardWidget[] {
  // Re-reads localStorage on demand. Currently only called once, from a
  // useState lazy initializer on mount - CustomWidgetsManager's
  // onLayoutChange callback passes the updated widget array directly rather
  // than triggering a re-read of this function.
  try {
    const saved = localStorage.getItem("customDashboardWidgets");
    return saved ? (JSON.parse(saved) as DashboardWidget[]) : [];
  } catch {
    return [];
  }
}
