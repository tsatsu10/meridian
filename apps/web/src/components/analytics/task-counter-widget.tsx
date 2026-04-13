/**
 * Task Counter Widget Component
 * Compact real-time task metrics display
 * Phase 2.3 - Live Metrics & Real-Time Analytics
 */

import React, { useState, useEffect } from 'react';

interface TaskCounterWidgetProps {
  workspaceId: string;
  projectId?: string;
  refreshInterval?: number;
  className?: string;
}

export const TaskCounterWidget: React.FC<TaskCounterWidgetProps> = ({
  workspaceId,
  projectId,
  refreshInterval = 30000,
  className = '',
}) => {
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [workspaceId, projectId]);

  const fetchMetrics = async () => {
    try {
      const url = `/api/metrics/tasks?workspaceId=${workspaceId}${projectId ? `&projectId=${projectId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setMetrics({
        total: data.total,
        completed: data.completed,
        inProgress: data.inProgress,
        blocked: data.blocked,
        overdue: data.overdue,
      });
    } catch (err) {
      console.error('Failed to fetch task metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Task Summary</h3>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Total</span>
          <span className="text-lg font-bold text-gray-900">{metrics.total}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-600 flex items-center">
            <span className="mr-1">✓</span> Completed
          </span>
          <span className="text-sm font-semibold text-green-600">{metrics.completed}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-600 flex items-center">
            <span className="mr-1">●</span> In Progress
          </span>
          <span className="text-sm font-semibold text-blue-600">{metrics.inProgress}</span>
        </div>
        
        {metrics.blocked > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-600 flex items-center">
              <span className="mr-1">⚠</span> Blocked
            </span>
            <span className="text-sm font-semibold text-red-600">{metrics.blocked}</span>
          </div>
        )}
        
        {metrics.overdue > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-600 flex items-center">
              <span className="mr-1">🔥</span> Overdue
            </span>
            <span className="text-sm font-semibold text-orange-600">{metrics.overdue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCounterWidget;

