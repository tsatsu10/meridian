// @epic-2.2-realtime: Presence indicator component for individual user status
// TODO: Re-enable real WebSocket when properly optimized
import React from 'react'
import { useRealtimeProvider } from '@/providers/realtime-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Circle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PresenceIndicatorProps {
  userEmail: string;
  className?: string;
  showTooltip?: boolean;
}

export function PresenceIndicator({ userEmail, className = '', showTooltip = true }: PresenceIndicatorProps) {
  const { onlineUsers } = useRealtimeProvider();
  
  const user = onlineUsers.find(u => u.userEmail === userEmail);
  
  if (!user || user.status === 'offline') {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'away':
        return 'text-yellow-500';
      case 'busy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
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

  const indicator = (
    <Circle 
      className={`h-2 w-2 ${getStatusColor(user.status)} ${className}`}
      fill="currentColor"
    />
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{user.userName}</p>
            <p className="text-xs text-muted-foreground">{getStatusText(user.status)}</p>
            {user.currentPage && (
              <p className="text-xs text-muted-foreground">
                Viewing: {user.currentPage.split('/').pop() || 'Dashboard'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 