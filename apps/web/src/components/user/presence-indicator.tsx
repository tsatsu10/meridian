import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';

interface PresenceIndicatorProps {
  userEmail: string;
  className?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface UserPresence {
  userId: string;
  userEmail: string;
  userName: string;
  isOnline: boolean;
  lastSeen: string | null;
}

const SIZE_CLASSES = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

/**
 * Presence Indicator Component
 * Shows real-time online/offline status for a user
 * 
 * Features:
 * - Real-time updates via WebSocket
 * - Automatic polling fallback
 * - Tooltip with last seen time
 * - Multiple size options
 */
export function PresenceIndicator({ 
  userEmail, 
  className, 
  showTooltip = true,
  size = 'md' 
}: PresenceIndicatorProps) {
  const { socket, isConnected } = useUnifiedWebSocket();

  // Query user presence status
  const { data: presenceData, refetch } = useQuery<UserPresence[]>({
    queryKey: ['userPresence', userEmail],
    queryFn: async () => {
      const response = await fetch('/api/presence/status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userEmail] }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch presence');
      }
      
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute as fallback
    staleTime: 30000, // Consider stale after 30 seconds
  });

  // Listen for real-time presence updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePresenceUpdate = (data: any) => {
      if (data.userEmail === userEmail) {
        refetch();
      }
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('realtime:presence', handlePresenceUpdate);

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('realtime:presence', handlePresenceUpdate);
    };
  }, [socket, isConnected, userEmail, refetch]);

  const presence = presenceData?.[0];
  const isOnline = presence?.isOnline || false;

  const getLastSeenText = () => {
    if (isOnline) return 'Online now';
    if (!presence?.lastSeen) return 'Offline';

    const lastSeen = new Date(presence.lastSeen);
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return lastSeen.toLocaleDateString();
  };

  const indicator = (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full ring-2 ring-background transition-colors',
          SIZE_CLASSES[size],
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        )}
      />
      {isOnline && (
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75',
            SIZE_CLASSES[size]
          )}
        />
      )}
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{getLastSeenText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * User Avatar with Presence
 * Combines avatar display with presence indicator
 */
interface UserAvatarWithPresenceProps {
  userEmail: string;
  userName?: string;
  userAvatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showPresence?: boolean;
  className?: string;
}

const AVATAR_SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const PRESENCE_SIZES = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
  xl: 'md',
} as const;

export function UserAvatarWithPresence({
  userEmail,
  userName,
  userAvatar,
  size = 'md',
  showPresence = true,
  className,
}: UserAvatarWithPresenceProps) {
  const initials = userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className={cn('relative inline-block', className)}>
      <div className={cn('rounded-full overflow-hidden bg-muted flex items-center justify-center', AVATAR_SIZES[size])}>
        {userAvatar ? (
          <img src={userAvatar} alt={userName || userEmail} className="w-full h-full object-cover" />
        ) : (
          <span className="font-medium text-muted-foreground">{initials}</span>
        )}
      </div>
      {showPresence && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <PresenceIndicator 
            userEmail={userEmail} 
            size={PRESENCE_SIZES[size]}
            showTooltip={false}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Presence List Component
 * Shows a list of online users for a workspace
 */
interface PresenceListProps {
  workspaceId: string;
  className?: string;
  maxUsers?: number;
}

export function PresenceList({ workspaceId, className, maxUsers = 10 }: PresenceListProps) {
  const { data: onlineUsers, isLoading } = useQuery<{ count: number; users: any[] }>({
    queryKey: ['workspacePresence', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/presence/online?workspaceId=${workspaceId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch online users');
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse -ml-2" />
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse -ml-2" />
      </div>
    );
  }

  const users = onlineUsers?.users || [];
  const displayUsers = users.slice(0, maxUsers);
  const remainingCount = Math.max(0, users.length - maxUsers);

  if (users.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No users online
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      {/* Avatar Stack */}
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <TooltipProvider key={user.userId} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <UserAvatarWithPresence
                    userEmail={user.userEmail}
                    userName={user.userName}
                    userAvatar={user.userAvatar}
                    size="sm"
                    showPresence={false}
                    className="ring-2 ring-background"
                  />
                  <PresenceIndicator
                    userEmail={user.userEmail}
                    size="sm"
                    showTooltip={false}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">{user.userName}</p>
                <p className="text-xs text-muted-foreground">Online now</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {/* Remaining count */}
        {remainingCount > 0 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>

      {/* Count text */}
      <span className="ml-3 text-sm text-muted-foreground">
        {onlineUsers.count} {onlineUsers.count === 1 ? 'person' : 'people'} online
      </span>
    </div>
  );
}

