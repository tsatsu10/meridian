/**
 * Resource Allocation Component
 * Allocate team members to projects and tasks
 * Phase 3.3 - Resource Management System
 */

import React, { useState, useEffect } from 'react';

interface AllocationSuggestion {
  userId: string;
  userName: string;
  availableHours: number;
}

interface ResourceAllocationProps {
  workspaceId: string;
  projectId: string;
  taskId?: string;
  requiredHours: number;
  startDate: Date;
  endDate: Date;
  onAllocate?: (userId: string, hours: number) => void;
  onCancel?: () => void;
  className?: string;
}

export const ResourceAllocation: React.FC<ResourceAllocationProps> = ({
  workspaceId,
  projectId,
  taskId,
  requiredHours,
  startDate,
  endDate,
  onAllocate,
  onCancel,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<AllocationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [allocatedHours, setAllocatedHours] = useState<number>(requiredHours);

  useEffect(() => {
    fetchSuggestions();
  }, [workspaceId, projectId, requiredHours, startDate, endDate]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/resources/suggestions?workspaceId=${workspaceId}&projectId=${projectId}&requiredHours=${requiredHours}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedUser || allocatedHours <= 0) {
      alert('Please select a user and enter valid hours');
      return;
    }

    try {
      const response = await fetch('/api/resources/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          projectId,
          taskId,
          hoursAllocated: allocatedHours,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          createdBy: 'current-user-id', // TODO: Get from auth context
        }),
      });

      if (response.ok) {
        if (onAllocate) {
          onAllocate(selectedUser, allocatedHours);
        } else {
          alert('Resource allocated successfully!');
          if (onCancel) onCancel();
        }
      }
    } catch (error) {
      console.error('Failed to allocate resource:', error);
      alert('Failed to allocate resource');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Finding available resources...</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Allocate Resource</h2>
        <p className="text-sm text-gray-600 mt-1">
          Required: {requiredHours}h from {startDate.toLocaleDateString()} to{' '}
          {endDate.toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2 text-4xl">🔍</div>
            <p className="text-gray-600">No available resources found</p>
            <p className="text-sm text-gray-500 mt-1">
              All team members are fully allocated for this period
            </p>
          </div>
        ) : (
          <>
            {/* Suggestions List */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Available Team Members
              </label>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.userId}
                    onClick={() => setSelectedUser(suggestion.userId)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedUser === suggestion.userId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{suggestion.userName}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {suggestion.availableHours.toFixed(0)}h available
                        </p>
                      </div>

                      {selectedUser === suggestion.userId && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Capacity Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Capacity</span>
                        <span>
                          {suggestion.availableHours >= requiredHours ? (
                            <span className="text-green-600 font-medium">✓ Sufficient</span>
                          ) : (
                            <span className="text-orange-600 font-medium">Partial</span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            suggestion.availableHours >= requiredHours
                              ? 'bg-green-500'
                              : 'bg-orange-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              (suggestion.availableHours / requiredHours) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hours Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours to Allocate
              </label>
              <input
                type="number"
                value={allocatedHours}
                onChange={(e) => setAllocatedHours(parseFloat(e.target.value))}
                min="0"
                max={
                  selectedUser
                    ? suggestions.find((s) => s.userId === selectedUser)?.availableHours
                    : undefined
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter hours"
              />
              {selectedUser && (
                <p className="text-xs text-gray-500 mt-1">
                  Max available:{' '}
                  {suggestions.find((s) => s.userId === selectedUser)?.availableHours.toFixed(0)}h
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <div className="flex items-start">
                <span className="text-blue-600 mr-2">💡</span>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Allocation Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Team members are sorted by availability</li>
                    <li>Consider skill match and current workload</li>
                    <li>You can allocate partial hours if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 flex justify-between">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleAllocate}
          disabled={!selectedUser || allocatedHours <= 0}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          Allocate Resource
        </button>
      </div>
    </div>
  );
};

export default ResourceAllocation;

