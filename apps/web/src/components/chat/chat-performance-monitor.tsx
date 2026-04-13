// Phase 3: Advanced Chat Performance Monitoring
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  messagesPerSecond: number;
  averageProcessingTime: number;
  queueSize: number;
  errorRate: number;
  connectionLatency: number;
  fps: number;
  bundleSize: number;
  cacheHitRate: number;
}

interface ChatPerformanceMonitorProps {
  metrics: PerformanceMetrics;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  className?: string;
}

export function ChatPerformanceMonitor({ 
  metrics, 
  isVisible = false, 
  onToggleVisibility,
  className 
}: ChatPerformanceMonitorProps) {
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible) {
      intervalRef.current = setInterval(() => {
        setHistory(prev => [...prev.slice(-19), metrics]);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, metrics]);

  const getStatusColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (value >= thresholds.warning) return <TrendingUp className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 z-50 bg-white shadow-lg hover:shadow-xl"
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <Card className={cn("fixed bottom-4 right-4 z-50 w-80 shadow-xl", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Chat Performance</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="h-6 w-6 p-0"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Memory Usage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Memory</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.memoryUsage, { warning: 70, danger: 90 })}
            <span className={cn("text-sm font-mono", getStatusColor(metrics.memoryUsage, { warning: 70, danger: 90 }))}>
              {metrics.memoryUsage.toFixed(1)}MB
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min(metrics.memoryUsage, 100)} 
          className="h-1"
        />

        {/* Render Performance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm">Render Time</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.renderTime, { warning: 10, danger: 20 })}
            <span className={cn("text-sm font-mono", getStatusColor(metrics.renderTime, { warning: 10, danger: 20 }))}>
              {metrics.renderTime.toFixed(1)}ms
            </span>
          </div>
        </div>

        {/* FPS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-sm">FPS</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(60 - metrics.fps, { warning: 15, danger: 30 })}
            <span className={cn("text-sm font-mono", metrics.fps >= 50 ? "text-green-600" : metrics.fps >= 30 ? "text-yellow-600" : "text-red-600")}>
              {metrics.fps.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Network Latency */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm">Latency</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.connectionLatency, { warning: 100, danger: 300 })}
            <span className={cn("text-sm font-mono", getStatusColor(metrics.connectionLatency, { warning: 100, danger: 300 }))}>
              {metrics.connectionLatency.toFixed(0)}ms
            </span>
          </div>
        </div>

        {/* Message Processing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span className="text-sm">Msg/s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-700">
              {metrics.messagesPerSecond.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-600" />
            <span className="text-sm">Cache Hit</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(100 - metrics.cacheHitRate, { warning: 20, danger: 40 })}
            <span className={cn("text-sm font-mono", metrics.cacheHitRate >= 90 ? "text-green-600" : metrics.cacheHitRate >= 70 ? "text-yellow-600" : "text-red-600")}>
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Status Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Overall Status</span>
            <Badge 
              variant={
                metrics.errorRate > 5 ? "destructive" :
                metrics.memoryUsage > 80 || metrics.renderTime > 15 ? "secondary" :
                "default"
              }
              className="text-xs"
            >
              {metrics.errorRate > 5 ? "Critical" :
               metrics.memoryUsage > 80 || metrics.renderTime > 15 ? "Warning" :
               "Optimal"}
            </Badge>
          </div>
        </div>

        {/* Performance Tips */}
        {(metrics.memoryUsage > 80 || metrics.renderTime > 15 || metrics.errorRate > 2) && (
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">Performance Tips:</div>
              <ul className="list-disc list-inside space-y-1">
                {metrics.memoryUsage > 80 && (
                  <li>High memory usage - consider refreshing chat</li>
                )}
                {metrics.renderTime > 15 && (
                  <li>Slow rendering - virtualization may help</li>
                )}
                {metrics.errorRate > 2 && (
                  <li>Network issues detected - check connection</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}