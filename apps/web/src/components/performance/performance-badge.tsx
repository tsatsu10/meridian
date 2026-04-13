import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Activity, 
  Gauge, 
  Clock, 
  Database, 
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import usePerformanceMonitor from '@/hooks/use-performance-monitor';

// @epic-3.2-time: Mike needs performance visibility for optimization
// @persona-mike: Developer wants to track app performance in real-time

interface PerformanceBadgeProps {
  showDetails?: boolean;
  enableTracking?: boolean;
  className?: string;
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  showDetails = false,
  enableTracking = true,
  className,
}) => {
  const {
    metrics,
    isPerformanceGood,
    getPerformanceGrade,
    exportMetrics,
  } = usePerformanceMonitor({
    enableQueryTracking: enableTracking,
    enableInteractionTracking: enableTracking,
    enableMemoryTracking: true,
    sampleRate: 0.2, // 20% sampling for production
  });

  const grade = getPerformanceGrade();
  
  const getBadgeVariant = () => {
    if (grade === 'A' || grade === 'B') return 'default';
    if (grade === 'C' || grade === 'D') return 'secondary';
    return 'outline';
  };

  const getBadgeColor = () => {
    if (grade === 'A') return 'bg-green-500 hover:bg-green-600';
    if (grade === 'B') return 'bg-blue-500 hover:bg-blue-600';
    if (grade === 'C') return 'bg-yellow-500 hover:bg-yellow-600';
    if (grade === 'D') return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const formatMetric = (value: number | undefined, unit: string = 'ms') => {
    if (value === undefined) return 'N/A';
    return `${Math.round(value)}${unit}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${Math.round(value * 100)}%`;
  };

  if (!showDetails) {
    return (
      <Badge 
        variant={getBadgeVariant()}
        className={cn(
          'text-white font-medium cursor-pointer transition-colors',
          getBadgeColor(),
          className
        )}
      >
        <Gauge className="h-3 w-3 mr-1" />
        {grade}
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 px-2 text-xs font-medium',
            isPerformanceGood ? 'text-green-600' : 'text-orange-600',
            className
          )}
        >
          <Gauge className="h-3 w-3 mr-1" />
          Performance: {grade}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Metrics
            </h4>
            <Badge 
              variant={getBadgeVariant()}
              className={cn('text-white', getBadgeColor())}
            >
              Grade: {grade}
            </Badge>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Load Time */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="font-medium">Load Time</span>
              </div>
              <div className="text-muted-foreground">
                {formatMetric(metrics.loadTime)}
              </div>
            </div>

            {/* Query Performance */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3 text-purple-500" />
                <span className="font-medium">Avg Query</span>
              </div>
              <div className="text-muted-foreground">
                {formatMetric(metrics.avgQueryTime)}
              </div>
            </div>

            {/* Interaction Latency */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="font-medium">Click Latency</span>
              </div>
              <div className="text-muted-foreground">
                {formatMetric(metrics.clickLatency)}
              </div>
            </div>

            {/* Cache Hit Rate */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="font-medium">Cache Hit</span>
              </div>
              <div className="text-muted-foreground">
                {formatPercentage(metrics.cacheHitRate)}
              </div>
            </div>

            {/* Memory Usage (if available) */}
            {metrics.memoryUsage !== undefined && (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  <span className="font-medium">Memory Usage</span>
                </div>
                <div className="text-muted-foreground">
                  {formatPercentage(metrics.memoryUsage)}
                </div>
              </div>
            )}
          </div>

          {/* Performance Indicators */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span>Query Count:</span>
              <span className="font-mono">{metrics.queryCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Interactions:</span>
              <span className="font-mono">{metrics.interactionCount}</span>
            </div>
          </div>

          {/* Performance Tips */}
          {!isPerformanceGood && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-xs text-orange-800 dark:text-orange-200">
                  <div className="font-medium mb-1">Performance Tips:</div>
                  <ul className="space-y-1 list-disc list-inside">
                    {metrics.avgQueryTime > 500 && (
                      <li>Consider adding query optimization</li>
                    )}
                    {metrics.clickLatency > 50 && (
                      <li>UI interactions are slow - check for heavy renders</li>
                    )}
                    {metrics.cacheHitRate < 0.8 && (
                      <li>Low cache hit rate - review query invalidation</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const data = exportMetrics();navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
              }}
            >
              Export Metrics to Console
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PerformanceBadge; 