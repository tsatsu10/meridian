/**
 * @fileoverview Performance Dashboard Component
 * @description Real-time performance monitoring and metrics for message system
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Real-time performance metrics
 * - Memory usage monitoring
 * - Query cache analytics
 * - Virtualization performance
 * - Network request tracking
 * - User experience metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ChartWrapper } from '../charts/ChartWrapper';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MemoryManagement, PerformanceMonitoring } from '@/lib/optimized-query-client';
import { logger } from "../../lib/logger";

interface PerformanceMetric {
  timestamp: number;
  value: number;
  label: string;
}

interface PerformanceDashboardProps {
  className?: string;
  enableRealTimeMonitoring?: boolean;
  updateInterval?: number;
}

export default function PerformanceDashboard({
  className,
  enableRealTimeMonitoring = true,
  updateInterval = 5000, // 5 seconds
}: PerformanceDashboardProps) {
  const queryClient = useQueryClient();
  
  // Performance metrics state
  const [metrics, setMetrics] = useState({
    memoryUsage: [] as PerformanceMetric[],
    renderTimes: [] as PerformanceMetric[],
    cacheHitRate: [] as PerformanceMetric[],
    networkRequests: [] as PerformanceMetric[],
  });

  const [currentStats, setCurrentStats] = useState({
    memoryMB: 0,
    totalQueries: 0,
    activeQueries: 0,
    cacheHitRate: 0,
    averageRenderTime: 0,
    lastUpdate: new Date(),
  });

  // Real-time performance monitoring
  useEffect(() => {
    if (!enableRealTimeMonitoring) return;

    const collectMetrics = () => {
      const timestamp = Date.now();
      
      // Memory metrics
      const memoryInfo = (performance as any).memory;
      const memoryMB = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;
      
      // Cache metrics
      const cacheStats = MemoryManagement.getCacheStats(queryClient);
      const cacheHitRate = PerformanceMonitoring.getCacheHitRate(queryClient);
      
      // Render time metrics (using performance API)
      const renderEntries = performance.getEntriesByType('measure')
        .filter(entry => entry.name.includes('render'))
        .slice(-10); // Last 10 renders
      
      const averageRenderTime = renderEntries.length > 0
        ? renderEntries.reduce((sum, entry) => sum + entry.duration, 0) / renderEntries.length
        : 0;

      // Update metrics arrays
      setMetrics(prev => {
        const maxPoints = 50; // Keep last 50 data points
        
        return {
          memoryUsage: [
            ...prev.memoryUsage.slice(-maxPoints + 1),
            { timestamp, value: memoryMB, label: 'Memory MB' }
          ],
          renderTimes: [
            ...prev.renderTimes.slice(-maxPoints + 1),
            { timestamp, value: averageRenderTime, label: 'Render Time ms' }
          ],
          cacheHitRate: [
            ...prev.cacheHitRate.slice(-maxPoints + 1),
            { timestamp, value: cacheHitRate, label: 'Cache Hit Rate %' }
          ],
          networkRequests: [
            ...prev.networkRequests.slice(-maxPoints + 1),
            { timestamp, value: cacheStats.totalQueries, label: 'Total Queries' }
          ],
        };
      });

      // Update current stats
      setCurrentStats({
        memoryMB,
        totalQueries: cacheStats.totalQueries,
        activeQueries: cacheStats.activeQueries,
        cacheHitRate,
        averageRenderTime,
        lastUpdate: new Date(),
      });
    };

    // Initial collection
    collectMetrics();

    // Set up interval
    const interval = setInterval(collectMetrics, updateInterval);

    return () => clearInterval(interval);
  }, [enableRealTimeMonitoring, updateInterval, queryClient]);

  // Performance status
  const performanceStatus = useMemo(() => {
    const { memoryMB, averageRenderTime, cacheHitRate } = currentStats;
    
    let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    const issues: string[] = [];

    if (memoryMB > 100) {
      status = 'warning';
      issues.push('High memory usage');
    }
    if (memoryMB > 200) {
      status = 'critical';
      issues.push('Critical memory usage');
    }
    if (averageRenderTime > 50) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push('Slow render times');
    }
    if (cacheHitRate < 70) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push('Low cache efficiency');
    }

    return { status, issues };
  }, [currentStats]);

  // Chart data formatters
  const formatChartData = (data: PerformanceMetric[]) => {
    return data.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      value: Number(point.value.toFixed(2)),
    }));
  };

  // Memory optimization actions
  const handleOptimizeCache = () => {
    MemoryManagement.optimizeCache(queryClient);
    logger.info("🚀 Cache optimization triggered");
  };

  const handleClearStaleCache = () => {
    MemoryManagement.clearStaleCache(queryClient);
    logger.info("🧹 Stale cache cleared");
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(performanceStatus.status)}
                Performance Status
                <Badge variant={
                  performanceStatus.status === 'excellent' ? 'default' :
                  performanceStatus.status === 'good' ? 'secondary' :
                  performanceStatus.status === 'warning' ? 'outline' : 'destructive'
                }>
                  {performanceStatus.status.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentStats.memoryMB.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Memory (MB)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentStats.averageRenderTime.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Render Time (ms)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentStats.cacheHitRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentStats.activeQueries}</div>
                  <div className="text-sm text-muted-foreground">Active Queries</div>
                </div>
              </div>

              {performanceStatus.issues.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-800 mb-2">Performance Issues:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {performanceStatus.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleOptimizeCache} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Optimize Cache
                </Button>
                <Button onClick={handleClearStaleCache} variant="outline" size="sm">
                  <HardDrive className="h-4 w-4 mr-2" />
                  Clear Stale Data
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh App
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Memory Usage Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <AreaChart data={formatChartData(metrics.memoryUsage)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} MB`, 'Memory Usage']} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              </ChartWrapper>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Memory Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Used Heap</span>
                      <span>{currentStats.memoryMB.toFixed(1)} MB</span>
                    </div>
                    <Progress value={Math.min((currentStats.memoryMB / 100) * 100, 100)} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Query Cache</span>
                      <span>{currentStats.totalQueries} queries</span>
                    </div>
                    <Progress value={Math.min((currentStats.totalQueries / 50) * 100, 100)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Memory Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={
                      currentStats.memoryMB < 50 ? 'default' :
                      currentStats.memoryMB < 100 ? 'secondary' : 'destructive'
                    }>
                      {currentStats.memoryMB < 50 ? 'Good' :
                       currentStats.memoryMB < 100 ? 'Fair' : 'High'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-xs text-muted-foreground">
                      {currentStats.lastUpdate.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Render Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <LineChart data={formatChartData(metrics.renderTimes)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} ms`, 'Render Time']} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartWrapper>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Cache Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <BarChart data={formatChartData(metrics.cacheHitRate)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Hit Rate']} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ChartWrapper>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentStats.totalQueries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentStats.activeQueries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentStats.cacheHitRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}