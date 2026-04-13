// @epic-3.5-analytics: Real-time Data Streaming for Phase 3 Analytics
// Live data updates with WebSocket integration

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  RefreshCw,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeDataPoint {
  timestamp: string;
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  category: 'performance' | 'workload' | 'system' | 'user';
}

interface StreamConfig {
  enabled: boolean;
  interval: number; // milliseconds
  metrics: string[];
  filters: {
    category?: string;
    threshold?: number;
    alertsOnly?: boolean;
  };
}

interface RealTimeDataStreamProps {
  teamId: string;
  onDataUpdate?: (data: RealTimeDataPoint[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export default function RealTimeDataStream({ 
  teamId, 
  onDataUpdate, 
  onConnectionChange,
  className 
}: RealTimeDataStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [data, setData] = useState<RealTimeDataPoint[]>([]);
  const [config, setConfig] = useState<StreamConfig>({
    enabled: true,
    interval: 5000,
    metrics: ['velocity', 'capacity', 'tasks_completed', 'active_users'],
    filters: {}
  });
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Fetch real-time data from API
  const fetchRealTimeData = useCallback(async (): Promise<RealTimeDataPoint[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/chat/realtime?workspaceId=${teamId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch real-time data: ${response.status}`);
      }

      const realTimeMetrics = await response.json();

      // Transform API response to RealTimeDataPoint format
      const currentTime = new Date().toISOString();
      const dataPoints: RealTimeDataPoint[] = [
        {
          timestamp: currentTime,
          metric: 'active_users',
          value: realTimeMetrics.activeUsers || 0,
          change: 0, // Would need historical data for change calculation
          trend: 'stable',
          category: 'system'
        },
        {
          timestamp: currentTime,
          metric: 'messages_per_minute',
          value: realTimeMetrics.messagesPerMinute || 0,
          change: 0,
          trend: 'stable',
          category: 'performance'
        },
        {
          timestamp: currentTime,
          metric: 'response_time',
          value: realTimeMetrics.averageResponseTime || 0,
          change: 0,
          trend: 'stable',
          category: 'system'
        },
        {
          timestamp: currentTime,
          metric: 'system_latency',
          value: realTimeMetrics.systemLatency || 0,
          change: 0,
          trend: 'stable',
          category: 'system'
        },
        {
          timestamp: currentTime,
          metric: 'error_rate',
          value: realTimeMetrics.errorRate || 0,
          change: 0,
          trend: 'stable',
          category: 'system'
        }
      ];

      return dataPoints;
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
      return [];
    }
  }, [teamId]);

  // WebSocket connection management
  const qualityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // In a real implementation, this would connect to your WebSocket server
      // For demo purposes, we'll simulate WebSocket behavior
      setIsConnected(true);
      setReconnectAttempts(0);
      onConnectionChange?.(true);

      // Clear any existing quality monitoring interval
      if (qualityIntervalRef.current) {
        clearInterval(qualityIntervalRef.current);
      }

      // Simulate connection quality monitoring
      qualityIntervalRef.current = setInterval(() => {
        const rand = Math.random();
        if (rand > 0.9) setConnectionQuality('poor');
        else if (rand > 0.7) setConnectionQuality('good');
        else setConnectionQuality('excellent');
      }, 10000);

      // Start data streaming
      if (config.enabled) {
        startStreaming();
      }
    } catch (error) {
      console.error('WebSocket connection error:', error);
      scheduleReconnect();
    }
  }, [config.enabled, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
    onConnectionChange?.(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clear quality monitoring interval
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }
  }, [onConnectionChange]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    }
  }, [reconnectAttempts, connect]);

  const startStreaming = useCallback(() => {
    if (!isConnected || isStreaming) return;

    setIsStreaming(true);
    intervalRef.current = setInterval(async () => {
      const newData = await fetchRealTimeData();
      const filteredData = newData.filter(item => {
        if (config.filters.category && item.category !== config.filters.category) return false;
        if (config.filters.threshold && Math.abs(item.change) < config.filters.threshold) return false;
        if (config.filters.alertsOnly && Math.abs(item.change) < 5) return false;
        return config.metrics.includes(item.metric);
      });

      setData(prev => {
        const updated = [...filteredData, ...prev].slice(0, 100); // Keep last 100 data points
        return updated;
      });
    }, config.interval);
  }, [isConnected, isStreaming, config, fetchRealTimeData, onDataUpdate]);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Effects
  useEffect(() => {
    if (config.enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Ensure quality interval is cleaned up
      if (qualityIntervalRef.current) {
        clearInterval(qualityIntervalRef.current);
        qualityIntervalRef.current = null;
      }
    };
  }, [config.enabled, connect, disconnect]);

  useEffect(() => {
    if (isConnected && config.enabled) {
      if (isStreaming) {
        stopStreaming();
      }
      startStreaming();
    }
  }, [config.interval, config.metrics, config.filters, isConnected, config.enabled]);

  // Effect to handle onDataUpdate callback without causing render warnings
  useEffect(() => {
    if (data.length > 0) {
      onDataUpdate?.(data);
    }
  }, [data, onDataUpdate]);

  const getConnectionStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    if (connectionQuality === 'poor') return 'text-orange-500';
    if (connectionQuality === 'good') return 'text-yellow-500';
    return 'text-green-500';
  };

  const getConnectionStatusIcon = () => {
    if (!isConnected) return <WifiOff className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'workload': return <Activity className="h-4 w-4" />;
      case 'system': return <Zap className="h-4 w-4" />;
      default: return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up' && change > 0) return 'text-green-600';
    if (trend === 'down' && change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn("flex items-center space-x-1", getConnectionStatusColor())}>
              {getConnectionStatusIcon()}
              <span>Real-time Analytics</span>
            </div>
            {isConnected && (
              <Badge variant="secondary" className="text-xs">
                {connectionQuality}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig({...config, enabled: !config.enabled})}
            >
              {config.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                disconnect();
                setTimeout(connect, 100);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={cn("w-2 h-2 rounded-full", 
                isConnected ? "bg-green-500" : "bg-red-500",
                isStreaming && "animate-pulse"
              )} />
              <span className="text-sm">
                {isConnected ? 
                  (isStreaming ? 'Streaming live data' : 'Connected, not streaming') : 
                  `Disconnected ${reconnectAttempts > 0 ? `(attempt ${reconnectAttempts}/5)` : ''}`
                }
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Update interval: {config.interval}ms
            </div>
          </div>

          {/* Stream Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Update Interval</label>
              <select
                value={config.interval}
                onChange={(e) => setConfig({...config, interval: parseInt(e.target.value)})}
                className="w-full text-xs p-2 border rounded"
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category Filter</label>
              <select
                value={config.filters.category || ''}
                onChange={(e) => setConfig({
                  ...config, 
                  filters: {...config.filters, category: e.target.value || undefined}
                })}
                className="w-full text-xs p-2 border rounded"
              >
                <option value="">All Categories</option>
                <option value="performance">Performance</option>
                <option value="workload">Workload</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.filters.alertsOnly || false}
                onChange={(e) => setConfig({
                  ...config,
                  filters: {...config.filters, alertsOnly: e.target.checked}
                })}
                className="rounded"
              />
              <label className="text-xs font-medium">Alerts Only</label>
            </div>
          </div>

          {/* Live Data Feed */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {isConnected ? 'Waiting for data...' : 'Not connected'}
              </div>
            ) : (
              data.slice(0, 20).map((item, index) => (
                <div 
                  key={`${item.metric}-${item.timestamp}-${index}`}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-500">
                      {getMetricIcon(item.category)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.metric.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.value}</div>
                    <div className={cn("text-xs flex items-center", getTrendColor(item.trend, item.change))}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                      {Math.abs(item.change) > 5 && (
                        <AlertTriangle className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Data Summary */}
          {data.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold">{data.length}</div>
                <div className="text-xs text-gray-500">Data Points</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {data.filter(d => d.trend === 'up').length}
                </div>
                <div className="text-xs text-gray-500">Trending Up</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {data.filter(d => Math.abs(d.change) > 5).length}
                </div>
                <div className="text-xs text-gray-500">Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {Math.round(data.reduce((sum, d) => sum + Math.abs(d.change), 0) / data.length * 10) / 10}%
                </div>
                <div className="text-xs text-gray-500">Avg Change</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}