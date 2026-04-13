import { useState, useMemo } from "react";
import { Download, Share2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthGauge } from "./health-gauge";
import { HealthTrendChart, HealthTrendChartCompact } from "./health-trend-chart";
import { RiskHeatmap, RiskHeatmapMatrix } from "./risk-heatmap";
import { RecommendationPanel } from "./recommendation-card";
import { FactorDetailGrid } from "./factor-detail-card";
import { TimeRangeSelector, type TimeRange } from "./time-range-selector";

// Types
export interface ProjectHealthMetrics {
  projectId: string;
  projectName: string;
  score: number;
  state: "excellent" | "good" | "fair" | "critical";
  factors: {
    completionRate: number;
    timelineHealth: number;
    taskHealth: number;
    resourceAllocation: number;
    riskLevel: number;
  };
  trend: "improving" | "stable" | "declining";
  riskLevel: "low" | "medium" | "high" | "critical";
  identifiedRisks: string[];
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    category: "performance" | "timeline" | "resources" | "quality" | "risk";
    actionItems?: string[];
    estimatedImpact?: number;
  }>;
}

export interface HealthHistoryPoint {
  date: string;
  score: number;
  timestamp: number;
}

interface HealthDashboardWidgetProps {
  metrics: ProjectHealthMetrics;
  history: HealthHistoryPoint[];
  onExport?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Master Health Dashboard Widget
 * Integrates all health visualization components
 */
export function HealthDashboardWidget({
  metrics,
  history,
  onExport,
  onShare,
  onSettings,
  className,
  compact = false,
}: HealthDashboardWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

  // Filter history by time range
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const rangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "14d": 14 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      custom: 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - rangeMs[timeRange];
    return history.filter((h) => h.timestamp >= cutoff);
  }, [history, timeRange]);

  // Prepare factor data for heatmap
  const factorData = [
    { name: "Completion", score: metrics.factors.completionRate, weight: 0.25 },
    { name: "Timeline", score: metrics.factors.timelineHealth, weight: 0.25 },
    { name: "Tasks", score: metrics.factors.taskHealth, weight: 0.2 },
    { name: "Resources", score: metrics.factors.resourceAllocation, weight: 0.2 },
    { name: "Risk", score: 100 - metrics.factors.riskLevel, weight: 0.1 },
  ];

  // Prepare factor details
  const factorDetails = [
    {
      name: "Completion Rate",
      score: metrics.factors.completionRate,
      trend: metrics.trend,
      description: "Project milestone and task completion progress",
      metrics: [
        { label: "Completed Tasks", value: "45", unit: "of 72" },
        { label: "Completion %", value: Math.round(metrics.factors.completionRate) + "%", unit: "" },
      ],
    },
    {
      name: "Timeline Health",
      score: metrics.factors.timelineHealth,
      trend: metrics.trend,
      description: "Schedule adherence and deadline management",
      metrics: [
        { label: "On Track", value: "12 tasks", unit: "" },
        { label: "At Risk", value: "3 tasks", unit: "" },
      ],
    },
    {
      name: "Task Health",
      score: metrics.factors.taskHealth,
      trend: metrics.trend,
      description: "Task quality and progress metrics",
      metrics: [
        { label: "Active Tasks", value: "28", unit: "" },
        { label: "Blocked Tasks", value: "2", unit: "" },
      ],
    },
    {
      name: "Resource Allocation",
      score: metrics.factors.resourceAllocation,
      trend: metrics.trend,
      description: "Team capacity and resource utilization",
      metrics: [
        { label: "Team Members", value: "8", unit: "" },
        { label: "Utilization", value: "92%", unit: "" },
      ],
    },
  ];

  if (compact) {
    return <CompactHealthWidget metrics={metrics} history={filteredHistory} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.projectName} Health Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time project health metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Export"
            >
              <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Share"
            >
              <Share2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("overview")}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              viewMode === "overview"
                ? "bg-blue-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode("detailed")}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              viewMode === "detailed"
                ? "bg-blue-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Detailed
          </button>
        </div>
      </div>

      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* Main Gauge and Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Gauge */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Overall Health
              </h3>
              <HealthGauge score={metrics.score} size="md" />
            </div>

            {/* Trend Chart */}
            <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Health Trend ({timeRange})
              </h3>
              <HealthTrendChartCompact data={filteredHistory} />
            </div>
          </div>

          {/* Risk Heatmap and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Heatmap */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Factor Health
              </h3>
              <RiskHeatmap factors={factorData} />
            </div>

            {/* Recommendations */}
            <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Top Recommendations
              </h3>
              <RecommendationPanel recommendations={metrics.recommendations} maxDisplay={4} />
            </div>
          </div>
        </div>
      )}

      {viewMode === "detailed" && (
        <div className="space-y-6">
          {/* Factor Details Grid */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-6">
              Detailed Factor Analysis
            </h3>
            <FactorDetailGrid factors={factorDetails as any} cols={2} />
          </div>

          {/* Risk Heatmap Matrix */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
              Risk Factor Matrix
            </h3>
            <RiskHeatmapMatrix factors={factorData} cols={5} />
          </div>

          {/* Full Recommendations */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
              All Recommendations ({metrics.recommendations.length})
            </h3>
            <RecommendationPanel recommendations={metrics.recommendations} maxDisplay={10} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact widget for dashboard sidebar/cards
 */
function CompactHealthWidget({
  metrics,
  history,
}: {
  metrics: ProjectHealthMetrics;
  history: HealthHistoryPoint[];
}) {
  const factorData = [
    { name: "Completion", score: metrics.factors.completionRate, weight: 0.25 },
    { name: "Timeline", score: metrics.factors.timelineHealth, weight: 0.25 },
    { name: "Tasks", score: metrics.factors.taskHealth, weight: 0.2 },
    { name: "Resources", score: metrics.factors.resourceAllocation, weight: 0.2 },
  ];

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{metrics.projectName}</h3>
        <span className="text-lg font-bold text-blue-600">{metrics.score}</span>
      </div>

      <HealthTrendChartCompact data={history.slice(-7)} height={150} />

      <RiskHeatmap factors={factorData} />

      {metrics.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Top Recommendation
          </p>
          <div className="rounded bg-blue-50 dark:bg-blue-900/20 p-2 text-xs text-blue-700 dark:text-blue-300">
            {metrics.recommendations[0].title}
          </div>
        </div>
      )}
    </div>
  );
}

export { HealthGauge, HealthTrendChart, RiskHeatmap, RecommendationPanel, FactorDetailGrid, TimeRangeSelector };
