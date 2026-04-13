// @epic-3.4-activity: Real-time activity feed component
// TODO: Re-enable real WebSocket when properly optimized
import React, { useState, useEffect, useRef } from 'react'
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import type { UserActivity, RealtimeEvent } from '@/types/realtime';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  target?: {
    type: 'task' | 'project' | 'workspace' | 'file' | 'comment';
    id: string;
    name: string;
  };
  timestamp: string;
  isLive?: boolean;
}

interface RealTimeActivityFeedProps {
  workspaceId: string;
  maxItems?: number;
  showLiveIndicator?: boolean;
  className?: string;
}

export function RealTimeActivityFeed({
  workspaceId,
  maxItems = 50,
  showLiveIndicator = true,
  className = ''
}: RealTimeActivityFeedProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });
  const isConnected = connectionState.isConnected;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [liveActivities, setLiveActivities] = useState<Set<string>>(new Set());

  // Handle real-time activity updates
  useEffect(() => {
    if (!isConnected) return;

    const handleRealtimeEvent = (event: RealtimeEvent) => {
      if (event.workspaceId !== workspaceId) return;

      const activityItem: ActivityItem = {
        id: event.id,
        userEmail: event.userEmail,
        userName: event.data.userName || event.userEmail,
        action: getActionText(event.type, event.data),
        target: event.data.target,
        timestamp: event.timestamp,
        isLive: true
      };

      setActivities(prev => {
        const newActivities = [activityItem, ...prev].slice(0, maxItems);
        return newActivities;
      });

      // Mark as live activity
      setLiveActivities(prev => new Set(prev.add(event.id)));

      // Remove live indicator after 5 seconds
      setTimeout(() => {
        setLiveActivities(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.id);
          return newSet;
        });
      }, 5000);
    };

    // This would be connected to WebSocketreturn () => {};
  }, [isConnected, workspaceId, maxItems]);

  const getActionText = (eventType: string, data: any): string => {
    switch (eventType) {
      case 'task_edit':
        return `edited task "${data.taskName}"`;
      case 'task_created':
        return `created task "${data.taskName}"`;
      case 'task_status_changed':
        return `changed status of "${data.taskName}" to ${data.newStatus}`;
      case 'task_assigned':
        return `assigned "${data.taskName}" to ${data.assigneeName}`;
      case 'comment_post':
        return `commented on "${data.taskName}"`;
      case 'file_upload':
        return `uploaded file "${data.fileName}"`;
      case 'project_created':
        return `created project "${data.projectName}"`;
      case 'workspace_joined':
        return `joined the workspace`;
      case 'cursor_update':
        return `is viewing ${data.page}`;
      case 'presence_change':
        return `is now ${data.status}`;
      default:
        return `performed an action`;
    }
  };

  const getActionIcon = (action: string): string => {
    if (action.includes('created')) return '✨';
    if (action.includes('edited')) return '✏️';
    if (action.includes('commented')) return '💬';
    if (action.includes('uploaded')) return '📎';
    if (action.includes('assigned')) return '👤';
    if (action.includes('status')) return '🔄';
    if (action.includes('joined')) return '👋';
    if (action.includes('viewing')) return '👀';
    return '📝';
  };

  const getTargetBadgeColor = (targetType?: string): string => {
    switch (targetType) {
      case 'task':
        return 'bg-blue-100 text-blue-800';
      case 'project':
        return 'bg-green-100 text-green-800';
      case 'file':
        return 'bg-purple-100 text-purple-800';
      case 'comment':
        return 'bg-orange-100 text-orange-800';
      case 'workspace':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderActivityItem = (activity: ActivityItem) => {
    const isLive = liveActivities.has(activity.id);
    
    return (
      <div 
        key={activity.id} 
        className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
          isLive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
      >
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {activity.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isLive && showLiveIndicator && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{getActionIcon(activity.action)}</span>
            <span className="font-medium text-sm">{activity.userName}</span>
            <span className="text-sm text-gray-600">{activity.action}</span>
            {isLive && showLiveIndicator && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Live
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </span>
            
            {activity.target && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getTargetBadgeColor(activity.target.type)}`}
              >
                {activity.target.type}: {activity.target.name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Team Activity</h3>
        {isConnected ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
            Live
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Offline
          </Badge>
        )}
      </div>
      
      <ScrollArea className="h-96">
        <div className="space-y-1">
          {activities.length > 0 ? (
            activities.map(renderActivityItem)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Team actions will appear here in real-time</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Hook for tracking user activity
export function useActivityTracking() {
  const { isConnected } = useUnifiedWebSocket({ 
    enabled: false, // This hook is not directly connected to a WebSocket context
    userEmail: 'current-user@example.com', // Placeholder
    workspaceId: 'current-workspace-id' // Placeholder
  });

  const trackActivity = (
    type: 'viewing' | 'editing' | 'commenting' | 'creating' | 'idle',
    target?: {
      type: 'task' | 'project' | 'workspace' | 'file';
      id: string;
      name: string;
    },
    details?: string
  ) => {
    if (!isConnected) return;

    const activity: UserActivity = {
      userEmail: 'current-user@example.com', // This would come from auth context
      userName: 'Current User', // This would come from auth context
      activity: {
        type,
        target,
        details
      },
      timestamp: new Date().toISOString()
    };// This would send activity via WebSocket
  };

  return { trackActivity };
}

// Component for showing live activity indicators
export function LiveActivityIndicator({ 
  activityCount 
}: { 
  activityCount: number 
}) {
  if (activityCount === 0) return null;

  return (
    <div className="flex items-center space-x-1 text-xs text-green-600">
      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      <span>
        {activityCount === 1 
          ? '1 live update' 
          : `${activityCount} live updates`
        }
      </span>
    </div>
  );
}

// Compact activity summary for sidebar
export function ActivitySummary({ 
  workspaceId,
  className = '' 
}: { 
  workspaceId: string;
  className?: string;
}) {
  const { isConnected, onlineUsers } = useUnifiedWebSocket({ 
    enabled: false, // This hook is not directly connected to a WebSocket context
    userEmail: 'current-user@example.com', // Placeholder
    workspaceId: workspaceId // Placeholder
  });
  const [recentActivityCount, setRecentActivityCount] = useState(0);

  useEffect(() => {
    if (!isConnected) return;

    // Track recent activity count
    const handleActivity = () => {
      setRecentActivityCount(prev => prev + 1);
      
      // Reset count after 30 seconds
      setTimeout(() => {
        setRecentActivityCount(prev => Math.max(0, prev - 1));
      }, 30000);
    };

    // This would be connected to WebSocketreturn () => {};
  }, [isConnected, workspaceId]);

  return (
    <div className={`flex items-center justify-between text-xs text-muted-foreground ${className}`}>
      <span>{onlineUsers.length} online</span>
      <LiveActivityIndicator activityCount={recentActivityCount} />
    </div>
  );
} 