// @epic-3.4-teams: Enhanced Presence Indicators with Rich Status Information and Permissions
import React, { useEffect, useState, useMemo } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useAuth } from '@/components/providers/unified-context-provider';
import { useCollaborationPermissions } from '@/hooks/useCollaborationPermissions';
import useWorkspaceStore from '@/store/workspace';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Eye,
  Edit,
  MessageSquare,
  Calendar,
  Video,
  Coffee,
  Zap,
  Users,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

export interface UserPresenceStatus {
  userEmail: string;
  userName: string;
  userAvatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline' | 'do-not-disturb';
  customStatus?: string;
  currentPage?: string;
  currentResource?: string;
  currentAction?: 'editing' | 'viewing' | 'commenting' | 'in-meeting' | 'idle';
  lastSeen: Date;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  connectionQuality?: 'excellent' | 'good' | 'poor';
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface EnhancedPresenceIndicatorsProps {
  mode?: 'compact' | 'detailed' | 'sidebar' | 'floating';
  showOfflineUsers?: boolean;
  showConnectionQuality?: boolean;
  showCurrentActivity?: boolean;
  showWorkingHours?: boolean;
  maxDisplayUsers?: number;
  className?: string;
  onUserClick?: (userEmail: string) => void;
}

export function EnhancedPresenceIndicators({
  mode = 'compact',
  showOfflineUsers = false,
  showConnectionQuality = true,
  showCurrentActivity = true,
  showWorkingHours = false,
  maxDisplayUsers = 10,
  className = '',
  onUserClick
}: EnhancedPresenceIndicatorsProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Check collaboration permissions
  const {
    shouldShowCollaborationFeatures,
    canPerformCollaborationAction
  } = useCollaborationPermissions();

  // Early return if user doesn't have permission to see presence indicators
  if (!shouldShowCollaborationFeatures.presenceIndicators) {
    return null;
  }

  const [presenceData, setPresenceData] = useState<Map<string, UserPresenceStatus>>(new Map());

  const { connectionState, onlineUsers, updatePresence } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    onPresenceUpdate: (users) => {
      const newPresenceMap = new Map(presenceData);

      users.forEach((userData: any) => {
        newPresenceMap.set(userData.userEmail, {
          userEmail: userData.userEmail,
          userName: userData.userName || userData.userEmail.split('@')[0],
          userAvatar: userData.userAvatar,
          status: userData.presence || userData.status || 'online',
          customStatus: userData.customStatus,
          currentPage: userData.currentPage,
          currentResource: userData.currentResource,
          currentAction: userData.currentAction,
          lastSeen: new Date(userData.lastSeen || Date.now()),
          deviceType: userData.deviceType,
          connectionQuality: userData.connectionQuality,
          workingHours: userData.workingHours
        });
      });

      setPresenceData(newPresenceMap);
    }
  });

  // Filter and sort users
  const displayUsers = useMemo(() => {
    const users = Array.from(presenceData.values());

    // Filter offline users if needed
    const filteredUsers = showOfflineUsers
      ? users
      : users.filter(user => user.status !== 'offline');

    // Sort by status priority and last seen
    const statusPriority = {
      'online': 4,
      'busy': 3,
      'away': 2,
      'do-not-disturb': 1,
      'offline': 0
    };

    return filteredUsers
      .sort((a, b) => {
        // First by status priority
        const statusDiff = statusPriority[b.status] - statusPriority[a.status];
        if (statusDiff !== 0) return statusDiff;

        // Then by last seen (more recent first)
        return b.lastSeen.getTime() - a.lastSeen.getTime();
      })
      .slice(0, maxDisplayUsers);
  }, [presenceData, showOfflineUsers, maxDisplayUsers]);

  // Status configuration
  const getStatusConfig = (status: string) => {
    const configs = {
      'online': {
        color: 'bg-green-500',
        label: 'Online',
        icon: Wifi,
        description: 'Available and active'
      },
      'away': {
        color: 'bg-yellow-500',
        label: 'Away',
        icon: Clock,
        description: 'Away from desk'
      },
      'busy': {
        color: 'bg-red-500',
        label: 'Busy',
        icon: Zap,
        description: 'In a meeting or focused work'
      },
      'do-not-disturb': {
        color: 'bg-purple-500',
        label: 'Do Not Disturb',
        icon: Coffee,
        description: 'Please do not interrupt'
      },
      'offline': {
        color: 'bg-gray-400',
        label: 'Offline',
        icon: WifiOff,
        description: 'Not available'
      }
    };

    return configs[status] || configs['offline'];
  };

  // Activity icons
  const getActivityIcon = (action?: string) => {
    const icons = {
      'editing': Edit,
      'viewing': Eye,
      'commenting': MessageSquare,
      'in-meeting': Video,
      'idle': Clock
    };

    return icons[action || 'viewing'] || Eye;
  };

  // Connection quality indicator
  const getConnectionQualityConfig = (quality?: string) => {
    const configs = {
      'excellent': { color: 'text-green-500', bars: 4 },
      'good': { color: 'text-yellow-500', bars: 3 },
      'poor': { color: 'text-red-500', bars: 2 }
    };

    return configs[quality || 'good'] || configs['good'];
  };

  // Update presence when page changes
  useEffect(() => {
    if (connectionState.isConnected) {
      updatePresence('online', window.location.pathname);
    }
  }, [connectionState.isConnected, updatePresence]);

  if (displayUsers.length === 0) {
    return null;
  }

  // Compact mode - just avatars with status dots
  if (mode === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center space-x-2", className)}>
          {displayUsers.map((userPresence) => {
            const statusConfig = getStatusConfig(userPresence.status);
            const ActivityIcon = getActivityIcon(userPresence.currentAction);

            return (
              <Tooltip key={userPresence.userEmail}>
                <TooltipTrigger asChild>
                  <div
                    className="relative cursor-pointer"
                    onClick={() => onUserClick?.(userPresence.userEmail)}
                  >
                    <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm">
                      <AvatarImage src={userPresence.userAvatar} />
                      <AvatarFallback className="text-xs">
                        {userPresence.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Status indicator */}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      statusConfig.color
                    )} />

                    {/* Activity indicator */}
                    {showCurrentActivity && userPresence.currentAction && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <ActivityIcon className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="max-w-64">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <statusConfig.icon className="w-4 h-4" />
                      <span className="font-medium">{userPresence.userName}</span>
                      <Badge variant="outline" className="text-xs">
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {userPresence.customStatus && (
                      <p className="text-sm">{userPresence.customStatus}</p>
                    )}

                    {userPresence.currentAction && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <ActivityIcon className="w-3 h-3" />
                        <span className="capitalize">{userPresence.currentAction}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Last seen {formatDistanceToNow(userPresence.lastSeen, { addSuffix: true })}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {presenceData.size > maxDisplayUsers && (
            <Badge variant="outline" className="text-xs">
              +{presenceData.size - maxDisplayUsers}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Detailed mode - full cards
  if (mode === 'detailed') {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Users className="w-4 h-4" />
              <span>Team Presence</span>
              <Badge variant="outline">{displayUsers.length} active</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {displayUsers.map((userPresence) => {
              const statusConfig = getStatusConfig(userPresence.status);
              const ActivityIcon = getActivityIcon(userPresence.currentAction);
              const connectionConfig = getConnectionQualityConfig(userPresence.connectionQuality);

              return (
                <div
                  key={userPresence.userEmail}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onUserClick?.(userPresence.userEmail)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={userPresence.userAvatar} />
                        <AvatarFallback>
                          {userPresence.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                        statusConfig.color
                      )}>
                        <statusConfig.icon className="w-2 h-2 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{userPresence.userName}</span>
                        <Badge variant="outline" className="text-xs">
                          {statusConfig.label}
                        </Badge>

                        {userPresence.deviceType && (
                          <Badge variant="secondary" className="text-xs">
                            {userPresence.deviceType}
                          </Badge>
                        )}
                      </div>

                      {userPresence.customStatus && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {userPresence.customStatus}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                        {showCurrentActivity && userPresence.currentAction && (
                          <div className="flex items-center space-x-1">
                            <ActivityIcon className="w-3 h-3" />
                            <span className="capitalize">{userPresence.currentAction}</span>
                          </div>
                        )}

                        <span>
                          {formatDistanceToNow(userPresence.lastSeen, { addSuffix: true })}
                        </span>

                        {showConnectionQuality && userPresence.connectionQuality && (
                          <div className="flex items-center space-x-1">
                            <Activity className={cn("w-3 h-3", connectionConfig.color)} />
                            <span className="capitalize">{userPresence.connectionQuality}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sidebar mode - vertical list
  if (mode === 'sidebar') {
    return (
      <div className={cn("w-64 space-y-2", className)}>
        <div className="flex items-center justify-between pb-2 border-b">
          <span className="font-medium text-sm">Team ({displayUsers.length})</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        <div className="space-y-1 max-h-96 overflow-y-auto">
          {displayUsers.map((userPresence) => {
            const statusConfig = getStatusConfig(userPresence.status);
            const ActivityIcon = getActivityIcon(userPresence.currentAction);

            return (
              <div
                key={userPresence.userEmail}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onUserClick?.(userPresence.userEmail)}
              >
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userPresence.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {userPresence.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white",
                    statusConfig.color
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {userPresence.userName}
                  </div>

                  {showCurrentActivity && userPresence.currentAction && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <ActivityIcon className="w-3 h-3" />
                      <span className="capitalize truncate">{userPresence.currentAction}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Floating mode - minimal overlay
  if (mode === 'floating') {
    return (
      <div className={cn(
        "fixed top-20 right-4 bg-white rounded-lg shadow-lg border p-3 z-40 max-w-xs",
        className
      )}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm">Active Now</span>
          <Badge variant="outline" className="text-xs">
            {displayUsers.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {displayUsers.slice(0, 5).map((userPresence) => {
            const statusConfig = getStatusConfig(userPresence.status);

            return (
              <div
                key={userPresence.userEmail}
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => onUserClick?.(userPresence.userEmail)}
              >
                <div className="relative">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={userPresence.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {userPresence.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white",
                    statusConfig.color
                  )} />
                </div>

                <span className="text-sm font-medium truncate">
                  {userPresence.userName}
                </span>
              </div>
            );
          })}

          {displayUsers.length > 5 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              +{displayUsers.length - 5} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Hook for managing individual user presence
export function useUserPresence() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [currentStatus, setCurrentStatus] = useState<'online' | 'away' | 'busy' | 'do-not-disturb'>('online');
  const [customStatus, setCustomStatus] = useState<string>('');

  const { connectionState, updatePresence } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });

  const updateUserPresence = (status: typeof currentStatus, customMessage?: string) => {
    setCurrentStatus(status);
    setCustomStatus(customMessage || '');

    if (connectionState.isConnected) {
      updatePresence(status, window.location.pathname);
    }
  };

  return {
    currentStatus,
    customStatus,
    updateUserPresence,
    isConnected: connectionState.isConnected
  };
}