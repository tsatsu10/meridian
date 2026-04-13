// @epic-2.2-realtime: Online users list component for workspace presence
// TODO: Re-enable real WebSocket when properly optimized
import React from 'react'
import { useRealtimeProvider } from '@/providers/realtime-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Circle, Wifi, WifiOff } from 'lucide-react'

interface OnlineUsersListProps {
  className?: string;
  showCount?: boolean;
  maxVisible?: number;
  maxUsers?: number;
  showConnectionStatus?: boolean;
}

export function OnlineUsersList({ 
  className = '', 
  maxUsers = 5, 
  showConnectionStatus = false 
}: OnlineUsersListProps) {
  const { onlineUsers, isConnected } = useRealtimeProvider();

  if (!isConnected || onlineUsers.length === 0) {
    return null;
  }

  const visibleUsers = onlineUsers.slice(0, maxUsers);
  const remainingCount = Math.max(0, onlineUsers.length - maxUsers);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      default:
        return 'Offline';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showConnectionStatus && (
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      )}
      
      <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
          <div key={user.userEmail} className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {user.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Circle 
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(user.status)} rounded-full border-2 border-background`}
                    fill="currentColor"
                  />
                </div>
          ))}
          
          {remainingCount > 0 && (
          <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
          </div>
          )}
      </div>
      
      {!isConnected && (
        <Badge variant="outline" className="text-xs">
          Offline
        </Badge>
      )}
    </div>
  );
} 