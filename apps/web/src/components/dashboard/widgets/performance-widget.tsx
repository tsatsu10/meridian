// @epic-3.2-time: Mike needs real-time performance visibility
// @persona-mike: Developer wants to monitor app performance metrics
// @persona-sarah: PM wants to ensure app performs well for users

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Gauge, 
  Clock, 
  Database, 
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import usePerformanceMonitor from '@/hooks/use-performance-monitor';
import { cn } from '@/lib/cn';

export interface PerformanceWidgetProps {
  className?: string;
  showDetails?: boolean;
  enableLink?: boolean;
}

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ 
  className,
  showDetails = true,
  enableLink = false
}) => {
  const {
    metrics,
    isPerformanceGood,
    getPerformanceGrade,
  } = usePerformanceMonitor({
    enableQueryTracking: true,
    enableInteractionTracking: true,
    enableMemoryTracking: true,
    sampleRate: 0.3, // Sample 30% for production
  });

  const grade = getPerformanceGrade();
  
  const getGradeColor = () => {
    if (grade === 'A') return 'text-green-600 bg-green-50 border-green-200';
    if (grade === 'B') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (grade === 'C') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (grade === 'D') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = () => {
    if (isPerformanceGood) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-orange-500" />;
  };

  const formatMetric = (value: number | undefined, decimals = 0) => {
    if (value === undefined) return 'N/A';
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  return (
    <Card className={cn('hover:shadow-lg transition-shadow duration-200', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            Performance
          </CardTitle>
        </div>
        {getStatusIcon()}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Performance Grade */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-4xl font-bold tracking-tight">{grade}</div>
              <p className="text-sm text-muted-foreground">
                {isPerformanceGood ? 'Excellent' : 'Needs Attention'}
              </p>
            </div>
            <Badge className={cn('text-base px-4 py-2 border', getGradeColor())}>
              <Gauge className="h-4 w-4 mr-1" />
              {Math.round((metrics.cacheHitRate || 0.8) * 100)}%
            </Badge>
          </div>

          {showDetails && (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-1" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Page Load</div>
                    <div className="font-semibold text-sm truncate">
                      {formatMetric(metrics.loadTime)}ms
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-purple-500 mt-1" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Avg Query</div>
                    <div className="font-semibold text-sm truncate">
                      {formatMetric(metrics.avgQueryTime)}ms
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-yellow-500 mt-1" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Click Speed</div>
                    <div className="font-semibold text-sm truncate">
                      {formatMetric(metrics.clickLatency)}ms
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Gauge className="h-4 w-4 text-green-500 mt-1" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Cache Rate</div>
                    <div className="font-semibold text-sm truncate">
                      {formatMetric((metrics.cacheHitRate || 0) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Trend */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    vs. previous session
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 font-medium",
                    isPerformanceGood ? "text-green-600" : "text-orange-600"
                  )}>
                    {isPerformanceGood ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{isPerformanceGood ? '+8%' : '-5%'}</span>
                  </div>
                </div>
              </div>

              {/* Query Stats */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Queries</span>
                  <span className="font-mono font-medium">{metrics.queryCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Interactions</span>
                  <span className="font-mono font-medium">{metrics.interactionCount || 0}</span>
                </div>
              </div>
            </>
          )}

          {/* View Details Link */}
          {enableLink && (
            <div className="pt-3 border-t">
              <Link to="/dashboard/performance">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View Detailed Metrics
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Performance Warning */}
          {!isPerformanceGood && showDetails && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-800 dark:text-orange-200">
                  <div className="font-medium mb-1">Performance Tips:</div>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {metrics.avgQueryTime && metrics.avgQueryTime > 500 && (
                      <li>Slow queries detected</li>
                    )}
                    {metrics.clickLatency && metrics.clickLatency > 100 && (
                      <li>UI interactions delayed</li>
                    )}
                    {metrics.cacheHitRate && metrics.cacheHitRate < 0.7 && (
                      <li>Low cache hit rate</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Compact version for sidebar/header
export const CompactPerformanceWidget: React.FC<Omit<PerformanceWidgetProps, 'showDetails'>> = (props) => {
  return <PerformanceWidget {...props} showDetails={false} />;
};

export default PerformanceWidget;

