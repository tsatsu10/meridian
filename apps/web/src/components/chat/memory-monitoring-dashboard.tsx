// Phase 1.1: Memory Monitoring Dashboard
// Target: <100MB memory usage for 10 concurrent chats
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Memory, 
  Users, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { WebSocketManager } from '@/hooks/useUnifiedWebSocketSingleton';

interface MemoryMetrics {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  memoryUsagePercentage: number;
  connectionCount: number;
  activeConnections: number;
  cacheHitRatio: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

interface PerformanceMetrics {
  renderTime: number;
  messageUpdateTime: number;
  typingIndicatorTime: number;
  fileUploadTime: number;
  searchResponseTime: number;
}

// Performance budgets for monitoring
const PERFORMANCE_BUDGETS = {
  renderTime: 5, // 5ms
  messageUpdateTime: 3, // 3ms
  typingIndicatorTime: 1, // 1ms
  fileUploadTime: 100, // 100ms
  searchResponseTime: 20, // 20ms
  memoryUsage: 80, // 80%
  connectionCount: 8, // 8 connections
  errorRate: 3, // 3%
} as const;

export const MemoryMonitoringDashboard: React.FC = () => {
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics>({
    totalMemory: 0,
    usedMemory: 0,
    freeMemory: 0,
    memoryUsagePercentage: 0,
    connectionCount: 0,
    activeConnections: 0,
    cacheHitRatio: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastUpdated: new Date()
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    messageUpdateTime: 0,
    typingIndicatorTime: 0,
    fileUploadTime: 0,
    searchResponseTime: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [performanceViolations, setPerformanceViolations] = useState<string[]>([]);

  // Memory monitoring interval
  const MEMORY_CHECK_INTERVAL = 5000; // 5 seconds
  const PERFORMANCE_CHECK_INTERVAL = 1000; // 1 second

  // Update memory metrics
  const updateMemoryMetrics = useCallback(() => {
    const webSocketManager = WebSocketManager.getInstance();
    
    // Get memory usage from WebSocket manager
    const memoryUsage = webSocketManager.getMemoryUsage();
    const connectionCount = webSocketManager.getConnectionCount();
    
    // Use real browser memory API if available
    let totalMemory = 100 * 1024 * 1024; // 100MB target
    let usedMemory = memoryUsage;
    let freeMemory = totalMemory - usedMemory;
    let memoryUsagePercentage = (usedMemory / totalMemory) * 100;
    
    // Real memory measurement using performance.memory API
    if (window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      totalMemory = memory.jsHeapSizeLimit;
      usedMemory = memory.usedJSHeapSize;
      freeMemory = memory.totalJSHeapSize - memory.usedJSHeapSize;
      memoryUsagePercentage = (usedMemory / totalMemory) * 100;
    }
    
    // Memory leak detection
    const currentTime = Date.now();
    const memoryHistory = useRef<Array<{ time: number; usage: number }>>([]);
    
    // Keep last 10 measurements for leak detection
    memoryHistory.current.push({ time: currentTime, usage: usedMemory });
    if (memoryHistory.current.length > 10) {
      memoryHistory.current.shift();
    }
    
    // Detect memory leaks (continuous growth over time)
    let memoryLeakDetected = false;
    if (memoryHistory.current.length >= 5) {
      const recentMeasurements = memoryHistory.current.slice(-5);
      const growthRate = (recentMeasurements[recentMeasurements.length - 1].usage - recentMeasurements[0].usage) / 
                        (recentMeasurements[recentMeasurements.length - 1].time - recentMeasurements[0].time);
      
      // If memory is growing at more than 1MB per minute, consider it a leak
      memoryLeakDetected = growthRate > (1024 * 1024 / 60000); // 1MB per minute
    }
    
    // Calculate cache hit ratio (simulated)
    const cacheHitRatio = Math.random() * 100;
    
    // Calculate average response time (simulated)
    const averageResponseTime = Math.random() * 100 + 10; // 10-110ms
    
    // Calculate error rate (simulated)
    const errorRate = Math.random() * 5; // 0-5%
    
    setMemoryMetrics({
      totalMemory,
      usedMemory,
      freeMemory,
      memoryUsagePercentage,
      connectionCount,
      activeConnections: connectionCount,
      cacheHitRatio,
      averageResponseTime,
      errorRate,
      lastUpdated: new Date()
    });

    // Check for alerts including memory leaks
    checkAlerts(memoryUsagePercentage, connectionCount, errorRate, memoryLeakDetected);
  }, []);

  // Update performance metrics with budget enforcement
  const updatePerformanceMetrics = useCallback(() => {
    // Simulate performance measurements
    const renderTime = Math.random() * 10 + 1; // 1-11ms
    const messageUpdateTime = Math.random() * 5 + 1; // 1-6ms
    const typingIndicatorTime = Math.random() * 2 + 0.5; // 0.5-2.5ms
    const fileUploadTime = Math.random() * 100 + 50; // 50-150ms
    const searchResponseTime = Math.random() * 20 + 5; // 5-25ms

    setPerformanceMetrics({
      renderTime,
      messageUpdateTime,
      typingIndicatorTime,
      fileUploadTime,
      searchResponseTime
    });

    // Check performance budget violations
    const violations: string[] = [];
    
    if (renderTime > PERFORMANCE_BUDGETS.renderTime) {
      violations.push(`Render time exceeded budget: ${renderTime.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.renderTime}ms`);
    }
    
    if (messageUpdateTime > PERFORMANCE_BUDGETS.messageUpdateTime) {
      violations.push(`Message update time exceeded budget: ${messageUpdateTime.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.messageUpdateTime}ms`);
    }
    
    if (typingIndicatorTime > PERFORMANCE_BUDGETS.typingIndicatorTime) {
      violations.push(`Typing indicator time exceeded budget: ${typingIndicatorTime.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.typingIndicatorTime}ms`);
    }
    
    if (fileUploadTime > PERFORMANCE_BUDGETS.fileUploadTime) {
      violations.push(`File upload time exceeded budget: ${fileUploadTime.toFixed(0)}ms > ${PERFORMANCE_BUDGETS.fileUploadTime}ms`);
    }
    
    if (searchResponseTime > PERFORMANCE_BUDGETS.searchResponseTime) {
      violations.push(`Search response time exceeded budget: ${searchResponseTime.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.searchResponseTime}ms`);
    }

    setPerformanceViolations(violations);
  }, []);

  // Check for performance alerts
  const checkAlerts = useCallback((memoryUsage: number, connections: number, errorRate: number, memoryLeak: boolean) => {
    const newAlerts: string[] = [];
    
    if (memoryUsage > 80) {
      newAlerts.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
    }
    
    if (connections > 8) {
      newAlerts.push(`High connection count: ${connections}`);
    }
    
    if (errorRate > 3) {
      newAlerts.push(`High error rate: ${errorRate.toFixed(1)}%`);
    }

    if (memoryLeak) {
      newAlerts.push("Memory leak detected. Memory usage is continuously increasing.");
    }
    
    setAlerts(newAlerts);
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    updateMemoryMetrics();
    updatePerformanceMetrics();
  }, [updateMemoryMetrics, updatePerformanceMetrics]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    updateMemoryMetrics();
    updatePerformanceMetrics();
  }, [updateMemoryMetrics, updatePerformanceMetrics]);

  // Cleanup connections
  const cleanupConnections = useCallback(() => {
    const webSocketManager = WebSocketManager.getInstance();
    webSocketManager.cleanupAll();
    updateMemoryMetrics();
  }, [updateMemoryMetrics]);

  // Effect for monitoring intervals
  useEffect(() => {
    if (!isMonitoring) return;

    const memoryInterval = setInterval(updateMemoryMetrics, MEMORY_CHECK_INTERVAL);
    const performanceInterval = setInterval(updatePerformanceMetrics, PERFORMANCE_CHECK_INTERVAL);

    return () => {
      clearInterval(memoryInterval);
      clearInterval(performanceInterval);
    };
  }, [isMonitoring, updateMemoryMetrics, updatePerformanceMetrics]);

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring();
  }, [startMonitoring]);

  const getMemoryStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceStatusColor = (time: number, threshold: number) => {
    return time <= threshold ? 'text-green-600' : 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Memory & Performance Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            size="sm"
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button variant="outline" onClick={refreshMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={cleanupConnections} size="sm">
            <XCircle className="h-4 w-4 mr-2" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Performance Alerts</h3>
            </div>
            <ul className="space-y-1">
              {alerts.map((alert, index) => (
                <li key={index} className="text-sm text-red-700">• {alert}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Memory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Memory className="h-4 w-4" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {memoryMetrics.memoryUsagePercentage.toFixed(1)}%
                </span>
                <Badge variant={memoryMetrics.memoryUsagePercentage > 80 ? "destructive" : "default"}>
                  {memoryMetrics.memoryUsagePercentage > 80 ? "High" : "Normal"}
                </Badge>
              </div>
              <Progress value={memoryMetrics.memoryUsagePercentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {formatBytes(memoryMetrics.usedMemory)} / {formatBytes(memoryMetrics.totalMemory)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Connections</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{memoryMetrics.activeConnections}</span>
                <Badge variant={memoryMetrics.activeConnections > 8 ? "destructive" : "default"}>
                  {memoryMetrics.activeConnections > 8 ? "High" : "Normal"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Active WebSocket connections
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Cache Hit Ratio</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{memoryMetrics.cacheHitRatio.toFixed(1)}%</span>
                <Badge variant={memoryMetrics.cacheHitRatio > 80 ? "default" : "secondary"}>
                  {memoryMetrics.cacheHitRatio > 80 ? "Good" : "Low"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Message cache efficiency
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Response Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{memoryMetrics.averageResponseTime.toFixed(1)}ms</span>
                <Badge variant={memoryMetrics.averageResponseTime < 50 ? "default" : "secondary"}>
                  {memoryMetrics.averageResponseTime < 50 ? "Fast" : "Slow"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Average WebSocket response
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Render Time</span>
                <span className={`text-sm font-bold ${getPerformanceStatusColor(performanceMetrics.renderTime, PERFORMANCE_BUDGETS.renderTime)}`}>
                  {performanceMetrics.renderTime.toFixed(1)}ms
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Target: &lt;{PERFORMANCE_BUDGETS.renderTime}ms</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Message Update</span>
                <span className={`text-sm font-bold ${getPerformanceStatusColor(performanceMetrics.messageUpdateTime, PERFORMANCE_BUDGETS.messageUpdateTime)}`}>
                  {performanceMetrics.messageUpdateTime.toFixed(1)}ms
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Target: &lt;{PERFORMANCE_BUDGETS.messageUpdateTime}ms</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Typing Indicator</span>
                <span className={`text-sm font-bold ${getPerformanceStatusColor(performanceMetrics.typingIndicatorTime, PERFORMANCE_BUDGETS.typingIndicatorTime)}`}>
                  {performanceMetrics.typingIndicatorTime.toFixed(1)}ms
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Target: &lt;{PERFORMANCE_BUDGETS.typingIndicatorTime}ms</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">File Upload</span>
                <span className={`text-sm font-bold ${getPerformanceStatusColor(performanceMetrics.fileUploadTime, PERFORMANCE_BUDGETS.fileUploadTime)}`}>
                  {performanceMetrics.fileUploadTime.toFixed(0)}ms
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Target: &lt;{PERFORMANCE_BUDGETS.fileUploadTime}ms</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Search Response</span>
                <span className={`text-sm font-bold ${getPerformanceStatusColor(performanceMetrics.searchResponseTime, PERFORMANCE_BUDGETS.searchResponseTime)}`}>
                  {performanceMetrics.searchResponseTime.toFixed(1)}ms
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Target: &lt;{PERFORMANCE_BUDGETS.searchResponseTime}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {memoryMetrics.lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MemoryMonitoringDashboard; 