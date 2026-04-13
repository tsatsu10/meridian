/**
 * Capacity Dashboard Component
 * Team capacity overview and resource planning
 * Phase 3.3 - Resource Management System
 */

import React, { useState, useEffect } from 'react';

interface UserWorkload {
  userId: string;
  userName: string;
  email: string;
  capacity: number;
  allocated: number;
  available: number;
  utilization: number;
  overallocated: boolean;
  tasks: Array<{
    taskId: string;
    taskTitle: string;
    hoursAllocated: number;
  }>;
}

interface TeamCapacity {
  totalCapacity: number;
  totalAllocated: number;
  totalAvailable: number;
  averageUtilization: number;
  overallocatedCount: number;
  underutilizedCount: number;
  users: UserWorkload[];
}

interface CapacityDashboardProps {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  onUserClick?: (userId: string) => void;
  className?: string;
}

export const CapacityDashboard: React.FC<CapacityDashboardProps> = ({
  workspaceId,
  startDate,
  endDate,
  onUserClick,
  className = '',
}) => {
  const [capacity, setCapacity] = useState<TeamCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'utilization' | 'available'>('utilization');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overallocated' | 'available'>('all');

  useEffect(() => {
    fetchCapacity();
  }, [workspaceId, startDate, endDate]);

  const fetchCapacity = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/resources/capacity?workspaceId=${workspaceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      setCapacity(data.capacity);
    } catch (error) {
      console.error('Failed to fetch capacity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-600 bg-red-50 border-red-200';
    if (utilization > 90) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (utilization > 70) return 'text-green-600 bg-green-50 border-green-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getUtilizationBarColor = (utilization: number) => {
    if (utilization > 100) return 'bg-red-500';
    if (utilization > 90) return 'bg-orange-500';
    if (utilization > 70) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const sortedUsers = capacity?.users
    .filter((user) => {
      if (filterStatus === 'overallocated') return user.overallocated;
      if (filterStatus === 'available') return user.available > 0 && !user.overallocated;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.userName.localeCompare(b.userName);
        case 'utilization':
          return b.utilization - a.utilization;
        case 'available':
          return b.available - a.available;
        default:
          return 0;
      }
    }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading capacity data...</div>
      </div>
    );
  }

  if (!capacity) {
    return <div className="text-center py-12 text-gray-500">No capacity data available</div>;
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Team Capacity</h2>
        <p className="text-sm text-gray-600 mt-1">
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Capacity</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {capacity.totalCapacity.toFixed(0)}h
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Allocated</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {capacity.totalAllocated.toFixed(0)}h
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Available</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {capacity.totalAvailable.toFixed(0)}h
          </div>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-sm text-orange-600 font-medium">Avg Utilization</div>
          <div className="text-2xl font-bold text-orange-900 mt-1">
            {capacity.averageUtilization.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(capacity.overallocatedCount > 0 || capacity.underutilizedCount > 0) && (
        <div className="px-6 pb-4 space-y-2">
          {capacity.overallocatedCount > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">
                {capacity.overallocatedCount} team member{capacity.overallocatedCount > 1 ? 's' : ''}{' '}
                overallocated
              </span>
            </div>
          )}
          {capacity.underutilizedCount > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center text-sm">
              <span className="text-yellow-600 mr-2">💡</span>
              <span className="text-yellow-800">
                {capacity.underutilizedCount} team member{capacity.underutilizedCount > 1 ? 's' : ''}{' '}
                underutilized (&lt;70%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="px-6 pb-4 flex items-center justify-between">
        <div className="flex space-x-2">
          {(['all', 'overallocated', 'available'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="utilization">Sort by Utilization</option>
          <option value="available">Sort by Available</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* User List */}
      <div className="px-6 pb-6">
        <div className="space-y-3">
          {sortedUsers.map((user) => (
            <div
              key={user.userId}
              onClick={() => onUserClick && onUserClick(user.userId)}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user.userName}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getUtilizationColor(
                    user.utilization
                  )}`}
                >
                  {user.utilization.toFixed(0)}% utilized
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>
                    {user.allocated.toFixed(0)}h / {user.capacity.toFixed(0)}h
                  </span>
                  <span className="font-medium">
                    {user.available.toFixed(0)}h available
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${getUtilizationBarColor(user.utilization)}`}
                    style={{ width: `${Math.min(user.utilization, 100)}%` }}
                  />
                  {user.utilization > 100 && (
                    <div
                      className="h-full bg-red-600 opacity-50"
                      style={{ width: `${user.utilization - 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Task List */}
              {user.tasks.length > 0 && (
                <div className="space-y-1">
                  {user.tasks.slice(0, 3).map((task) => (
                    <div key={task.taskId} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate flex-1">{task.taskTitle}</span>
                      <span className="text-gray-500 ml-2">
                        {task.hoursAllocated.toFixed(0)}h
                      </span>
                    </div>
                  ))}
                  {user.tasks.length > 3 && (
                    <div className="text-xs text-blue-600">
                      +{user.tasks.length - 3} more tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {sortedUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>No team members found with selected filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacityDashboard;

