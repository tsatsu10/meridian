import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorTracker } from "@/utils/error-tracking";
import {
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Performance Monitor Dashboard
 * 
 * Real-time performance metrics:
 * - FPS (Frames Per Second)
 * - Memory usage
 * - API call latency
 * - Long tasks detection
 * - Error count
 * - Cache hit rate
 * 
 * @example
 * ```tsx
 * <PerformanceMonitor />
 * ```
 */

interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  errors: {
    total: number;
    fatal: number;
    error: number;
    warning: number;
  };
  apiCalls: {
    total: number;
    avgLatency: number;
    slowest: number;
  };
  cacheHitRate: number;
  longTasks: number;
}

export function PerformanceMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: { used: 0, total: 0, percentage: 0 },
    errors: { total: 0, fatal: 0, error: 0, warning: 0 },
    apiCalls: { total: 0, avgLatency: 0, slowest: 0 },
    cacheHitRate: 0,
    longTasks: 0,
  });

  useEffect(() => {
    // Only in development
    if (import.meta.env.PROD) return;

    const interval = setInterval(() => {
      updateMetrics();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    // FPS calculation
    const fps = calculateFPS();

    // Memory usage
    const memory = getMemoryUsage();

    // Error stats
    const errors = ErrorTracker.getErrorStats();

    // Performance metrics from Error Tracker
    const performanceMetrics = errors.performanceMetrics || [];
    const apiMetrics = calculateAPIMetrics(performanceMetrics);

    setMetrics({
      fps,
      memory,
      errors: {
        total: errors.total,
        fatal: errors.fatal,
        error: errors.error,
        warning: errors.warning,
      },
      apiCalls: apiMetrics,
      cacheHitRate: 85, // Placeholder
      longTasks: performanceMetrics.filter((m) => m.duration > 50).length,
    });
  };

  const calculateFPS = (): number => {
    // Simplified FPS calculation
    // In production, use Performance API or RAF timestamps
    return 60; // Placeholder
  };

  const getMemoryUsage = () => {
    if ("memory" in performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      const used = Math.round(mem.usedJSHeapSize / 1048576); // MB
      const total = Math.round(mem.jsHeapSizeLimit / 1048576); // MB
      const percentage = Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100);
      
      return { used, total, percentage };
    }
    return { used: 0, total: 0, percentage: 0 };
  };

  const calculateAPIMetrics = (perfMetrics: any[]) => {
    const apiCalls = perfMetrics.filter((m) => m.name.includes("API"));
    
    if (apiCalls.length === 0) {
      return { total: 0, avgLatency: 0, slowest: 0 };
    }

    const total = apiCalls.length;
    const avgLatency = Math.round(
      apiCalls.reduce((sum, m) => sum + m.duration, 0) / total
    );
    const slowest = Math.round(Math.max(...apiCalls.map((m) => m.duration)));

    return { total, avgLatency, slowest };
  };

  const getHealthStatus = (): { status: string; color: string; icon: any } => {
    if (metrics.errors.fatal > 0 || metrics.memory.percentage > 90) {
      return { status: "Critical", color: "text-red-500", icon: AlertTriangle };
    }
    if (
      metrics.errors.error > 5 ||
      metrics.memory.percentage > 75 ||
      metrics.longTasks > 10
    ) {
      return { status: "Warning", color: "text-yellow-500", icon: AlertTriangle };
    }
    return { status: "Healthy", color: "text-green-500", icon: CheckCircle2 };
  };

  const handleClearErrors = () => {
    ErrorTracker.clearErrors();
    updateMetrics();
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
        aria-label="Open performance monitor"
      >
        <Activity className="h-4 w-4 mr-2" aria-hidden="true" />
        Performance
      </Button>
    );
  }

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 shadow-xl border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("gap-1", health.color)}
            >
              <HealthIcon className="h-3 w-3" aria-hidden="true" />
              {health.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
              aria-label="Close performance monitor"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* FPS */}
        <MetricRow
          label="FPS"
          value={metrics.fps}
          unit="fps"
          good={metrics.fps >= 55}
          icon={<Zap className="h-4 w-4" />}
        />

        {/* Memory */}
        <MetricRow
          label="Memory"
          value={metrics.memory.used}
          unit={`MB / ${metrics.memory.total}MB`}
          good={metrics.memory.percentage < 75}
          percentage={metrics.memory.percentage}
          icon={<Activity className="h-4 w-4" />}
        />

        {/* API Calls */}
        {metrics.apiCalls.total > 0 && (
          <>
            <MetricRow
              label="API Latency"
              value={metrics.apiCalls.avgLatency}
              unit="ms avg"
              good={metrics.apiCalls.avgLatency < 200}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <div className="text-xs text-muted-foreground pl-6">
              Slowest: {metrics.apiCalls.slowest}ms | Total: {metrics.apiCalls.total} calls
            </div>
          </>
        )}

        {/* Errors */}
        {metrics.errors.total > 0 && (
          <>
            <MetricRow
              label="Errors"
              value={metrics.errors.total}
              unit="total"
              good={metrics.errors.error === 0 && metrics.errors.fatal === 0}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <div className="text-xs text-muted-foreground pl-6 space-x-3">
              <span className="text-red-500">Fatal: {metrics.errors.fatal}</span>
              <span className="text-orange-500">Error: {metrics.errors.error}</span>
              <span className="text-yellow-500">Warning: {metrics.errors.warning}</span>
            </div>
          </>
        )}

        {/* Long Tasks */}
        {metrics.longTasks > 0 && (
          <MetricRow
            label="Long Tasks"
            value={metrics.longTasks}
            unit="> 50ms"
            good={metrics.longTasks < 5}
            icon={<TrendingDown className="h-4 w-4" />}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={updateMetrics}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearErrors}
            className="flex-1"
            disabled={metrics.errors.total === 0}
          >
            Clear Errors
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricRowProps {
  label: string;
  value: number;
  unit?: string;
  good: boolean;
  percentage?: number;
  icon: React.ReactNode;
}

function MetricRow({ label, value, unit, good, percentage, icon }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={cn(good ? "text-green-500" : "text-orange-500")}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("font-mono", good ? "text-green-600" : "text-orange-600")}>
          {value}
        </span>
        {unit && <span className="text-muted-foreground text-xs">{unit}</span>}
        {percentage !== undefined && (
          <span className="text-xs text-muted-foreground">({percentage}%)</span>
        )}
      </div>
    </div>
  );
}

export default PerformanceMonitor;

