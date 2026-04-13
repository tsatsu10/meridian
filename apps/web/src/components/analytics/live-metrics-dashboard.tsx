/**
 * Live Metrics Dashboard Component
 * Real-time analytics and performance visualization
 * Phase 2.3 - Live Metrics & Real-Time Analytics
 */

import React, { useState, useEffect } from 'react';

interface DashboardMetrics {
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    dueToday: number;
    dueTomorrow: number;
    completed: number;
    inProgress: number;
    blocked: number;
    completionRate: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    health: 'excellent' | 'good' | 'at-risk' | 'critical';
    averageProgress: number;
    totalTasks: number;
    completedTasks: number;
  };
  collaboration: {
    activeUsers: number;
    onlineUsers: number;
    totalComments: number;
    commentsToday: number;
    totalKudos: number;
    kudosToday: number;
  };
  performance: {
    averageTaskCompletionTime: number;
    averageResponseTime: number;
    velocityTrend: 'up' | 'down' | 'stable';
    burndownRate: number;
    throughput: number;
  };
  timestamp: string;
}

interface LiveMetricsDashboardProps {
  workspaceId: string;
  projectId?: string;
  refreshInterval?: number; // ms
  className?: string;
}

export const LiveMetricsDashboard: React.FC<LiveMetricsDashboardProps> = ({
  workspaceId,
  projectId,
  refreshInterval = 30000, // 30 seconds
  className = '',
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [workspaceId, projectId]);

  const fetchMetrics = async () => {
    try {
      const url = `/api/metrics/dashboard?workspaceId=${workspaceId}${projectId ? `&projectId=${projectId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      'at-risk': 'bg-yellow-500',
      critical: 'bg-red-500',
    };
    return colors[health] || 'bg-gray-500';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '📈';
    if (trend === 'down') return '📉';
    return '➡️';
  };

  if (loading || !metrics) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Last Updated */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Live Metrics</h2>
        {lastUpdated && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Tasks</span>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.tasks.total}</p>
          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
            <span className="text-green-600">✓ {metrics.tasks.completed}</span>
            <span className="text-blue-600">● {metrics.tasks.inProgress}</span>
            <span className="text-red-600">⚠ {metrics.tasks.blocked}</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Completion Rate</span>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.tasks.completionRate}%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${metrics.tasks.completionRate}%` }}
            />
          </div>
        </div>

        {/* Active Projects */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active Projects</span>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.projects.active}</p>
          <div className="mt-2 flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${getHealthColor(metrics.projects.health)}`} />
            <span className="text-xs text-gray-500 capitalize">{metrics.projects.health} health</span>
          </div>
        </div>

        {/* Velocity */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Throughput</span>
            <span className="text-2xl">{getTrendIcon(metrics.performance.velocityTrend)}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.performance.throughput}</p>
          <p className="mt-2 text-xs text-gray-500">tasks/week</p>
        </div>
      </div>

      {/* Task Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {Object.entries(metrics.tasks.byStatus).map(([status, count]) => {
              const percentage = (count / metrics.tasks.total) * 100;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Priority */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <div className="space-y-3">
            {Object.entries(metrics.tasks.byPriority).map(([priority, count]) => {
              const percentage = (count / metrics.tasks.total) * 100;
              const colors: Record<string, string> = {
                urgent: 'bg-red-600',
                high: 'bg-orange-500',
                medium: 'bg-yellow-500',
                low: 'bg-green-500',
              };
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{priority}</span>
                    <span className="text-sm text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[priority] || 'bg-gray-600'} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Due Dates & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Due Dates */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Due Dates</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600 font-medium">⚠️ Overdue</span>
              <span className="text-2xl font-bold text-red-600">{metrics.tasks.overdue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600 font-medium">📅 Due Today</span>
              <span className="text-2xl font-bold text-orange-600">{metrics.tasks.dueToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600 font-medium">🗓️ Due Tomorrow</span>
              <span className="text-2xl font-bold text-blue-600">{metrics.tasks.dueTomorrow}</span>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Avg. Completion Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.performance.averageTaskCompletionTime}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Burndown Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.performance.burndownRate.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Collaboration */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Collaboration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="text-2xl font-bold text-gray-900">{metrics.collaboration.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Comments Today</span>
              <span className="text-2xl font-bold text-gray-900">{metrics.collaboration.commentsToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Kudos Today</span>
              <span className="text-2xl font-bold text-gray-900">{metrics.collaboration.kudosToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Health Overview */}
      <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Health Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{metrics.projects.total}</p>
            <p className="text-sm text-gray-600 mt-1">Total Projects</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{metrics.projects.active}</p>
            <p className="text-sm text-gray-600 mt-1">Active</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{metrics.projects.averageProgress}%</p>
            <p className="text-sm text-gray-600 mt-1">Avg. Progress</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{metrics.projects.completedTasks}/{metrics.projects.totalTasks}</p>
            <p className="text-sm text-gray-600 mt-1">Tasks Complete</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMetricsDashboard;

