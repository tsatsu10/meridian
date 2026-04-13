/**
 * Activity Feed Component
 * Display team activity stream
 * Phase 2 - Team Awareness Features
 */

import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityTitle?: string;
  description?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

interface ActivityFeedProps {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  limit?: number;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  workspaceId,
  userId,
  projectId,
  limit = 50,
  className = '',
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [workspaceId, userId, projectId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        workspaceId,
        ...(userId && { userId }),
        ...(projectId && { projectId }),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/team-awareness/activity?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activities');
      }

      setActivities(data.activities);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string, entityType: string) => {
    if (action === 'created') return '✨';
    if (action === 'updated') return '✏️';
    if (action === 'completed') return '✅';
    if (action === 'deleted') return '🗑️';
    if (action === 'commented') return '💬';
    if (entityType === 'file') return '📎';
    return '📋';
  };

  const getActionColor = (action: string) => {
    if (action === 'created') return 'text-green-600';
    if (action === 'completed') return 'text-blue-600';
    if (action === 'deleted') return 'text-red-600';
    if (action === 'commented') return 'text-purple-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600">❌ {error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`p-8 text-center bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">No activities yet</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {activity.user.avatarUrl ? (
              <img
                src={activity.user.avatarUrl}
                alt={activity.user.username}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                {activity.user.username[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getActivityIcon(activity.action, activity.entityType)}</span>
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.user.username}</span>
                {' '}
                <span className={getActionColor(activity.action)}>{activity.action}</span>
                {' '}
                <span className="text-gray-600">{activity.entityType}</span>
                {activity.entityTitle && (
                  <>
                    {' '}
                    <span className="font-medium">"{activity.entityTitle}"</span>
                  </>
                )}
              </p>
            </div>

            {activity.description && (
              <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
            )}

            <p className="mt-1 text-xs text-gray-400">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}

      {/* Load More Button */}
      <button
        onClick={fetchActivities}
        className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
      >
        Load more activities
      </button>
    </div>
  );
};

export default ActivityFeed;

