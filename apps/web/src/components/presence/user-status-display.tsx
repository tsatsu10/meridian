// @epic-4.2-presence: User status display component for enhanced presence system
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Circle,
  Clock,
  Moon,
  Coffee,
  Zap,
  DndIcon as DoNotDisturb,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  MapPin,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface UserStatus {
  status: 'online' | 'offline' | 'away' | 'busy' | 'do_not_disturb' | 'custom';
  customStatusMessage?: string;
  customStatusEmoji?: string;
  statusExpiresAt?: Date;
  isStatusVisible?: boolean;
  lastSeen?: Date;
  currentPage?: string;
  lastActivityType?: string;
  timezone?: string;
  doNotDisturbUntil?: Date;
}

interface UserStatusDisplayProps {
  status: UserStatus;
  userName?: string;
  showLastSeen?: boolean;
  showCurrentPage?: boolean;
  showCustomMessage?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

const getStatusInfo = (status: UserStatus['status']) => {
  switch (status) {
    case 'online':
      return {
        color: 'bg-green-500',
        label: 'Online',
        icon: Circle,
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
      };
    case 'away':
      return {
        color: 'bg-yellow-500',
        label: 'Away',
        icon: Clock,
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
      };
    case 'busy':
      return {
        color: 'bg-red-500',
        label: 'Busy',
        icon: Zap,
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
      };
    case 'do_not_disturb':
      return {
        color: 'bg-purple-500',
        label: 'Do not disturb',
        icon: DoNotDisturb,
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50',
      };
    case 'custom':
      return {
        color: 'bg-blue-500',
        label: 'Custom status',
        icon: Circle,
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
      };
    case 'offline':
    default:
      return {
        color: 'bg-gray-400',
        label: 'Offline',
        icon: WifiOff,
        textColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
      };
  }
};

const formatCurrentPage = (page?: string) => {
  if (!page) return null;
  
  // Clean up page paths for display
  const cleanPage = page
    .replace(/^\//, '')
    .replace(/\//g, ' › ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  return cleanPage || 'Dashboard';
};

export function UserStatusDisplay({
  status,
  userName,
  showLastSeen = true,
  showCurrentPage = false,
  showCustomMessage = true,
  compact = false,
  className,
  onClick,
}: UserStatusDisplayProps) {
  const statusInfo = getStatusInfo(status.status);
  const StatusIcon = statusInfo.icon;
  
  // Don't show status if user has made it invisible
  if (status.isStatusVisible === false) {
    return null;
  }

  // Check if custom status has expired
  const isCustomStatusExpired = status.statusExpiresAt && new Date(status.statusExpiresAt) < new Date();
  const effectiveStatus = isCustomStatusExpired ? 'online' : status.status;
  const effectiveStatusInfo = isCustomStatusExpired ? getStatusInfo('online') : statusInfo;

  // Check if DND has expired
  const isDndExpired = status.doNotDisturbUntil && new Date(status.doNotDisturbUntil) < new Date();
  const showDndUntil = status.status === 'do_not_disturb' && status.doNotDisturbUntil && !isDndExpired;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1.5 cursor-pointer",
                onClick && "hover:opacity-80 transition-opacity",
                className
              )}
              onClick={onClick}
            >
              <div className="relative">
                <div className={cn("w-2 h-2 rounded-full", effectiveStatusInfo.color)} />
                {status.customStatusEmoji && effectiveStatus === 'custom' && (
                  <span className="absolute -top-1 -right-1 text-xs">
                    {status.customStatusEmoji}
                  </span>
                )}
              </div>
              {status.customStatusMessage && effectiveStatus === 'custom' && showCustomMessage && (
                <span className="text-xs text-muted-foreground truncate max-w-20">
                  {status.customStatusMessage}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <UserStatusTooltip status={status} userName={userName} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
        effectiveStatusInfo.bgColor,
        className
      )}
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <StatusIcon className={cn("w-4 h-4", effectiveStatusInfo.textColor)} />
        <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white", effectiveStatusInfo.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", effectiveStatusInfo.textColor)}>
            {effectiveStatusInfo.label}
          </Badge>
          
          {status.customStatusEmoji && effectiveStatus === 'custom' && (
            <span className="text-sm">{status.customStatusEmoji}</span>
          )}
        </div>

        {status.customStatusMessage && effectiveStatus === 'custom' && showCustomMessage && (
          <p className="text-sm font-medium mt-1 truncate">
            {status.customStatusMessage}
          </p>
        )}

        {showDndUntil && (
          <p className="text-xs text-muted-foreground mt-1">
            Until {formatDistanceToNow(new Date(status.doNotDisturbUntil!), { addSuffix: true })}
          </p>
        )}

        {status.statusExpiresAt && effectiveStatus === 'custom' && !isCustomStatusExpired && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Expires {formatDistanceToNow(new Date(status.statusExpiresAt), { addSuffix: true })}
          </p>
        )}

        {showCurrentPage && status.currentPage && status.status === 'online' && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {formatCurrentPage(status.currentPage)}
          </p>
        )}

        {showLastSeen && status.lastSeen && status.status === 'offline' && (
          <p className="text-xs text-muted-foreground mt-1">
            Last seen {formatDistanceToNow(new Date(status.lastSeen), { addSuffix: true })}
          </p>
        )}
      </div>

      {!status.isStatusVisible && (
        <EyeOff className="w-3 h-3 text-muted-foreground" />
      )}
    </div>
  );
}

// Tooltip content for compact display
function UserStatusTooltip({ status, userName }: { status: UserStatus; userName?: string }) {
  const statusInfo = getStatusInfo(status.status);
  const isCustomStatusExpired = status.statusExpiresAt && new Date(status.statusExpiresAt) < new Date();
  const effectiveStatus = isCustomStatusExpired ? 'online' : status.status;

  return (
    <div className="space-y-2 max-w-xs">
      {userName && (
        <p className="font-medium">{userName}</p>
      )}
      
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", statusInfo.color)} />
        <span className="text-sm">{statusInfo.label}</span>
        {status.customStatusEmoji && effectiveStatus === 'custom' && (
          <span>{status.customStatusEmoji}</span>
        )}
      </div>

      {status.customStatusMessage && effectiveStatus === 'custom' && (
        <p className="text-sm">{status.customStatusMessage}</p>
      )}

      {status.statusExpiresAt && effectiveStatus === 'custom' && !isCustomStatusExpired && (
        <p className="text-xs text-muted-foreground">
          Expires {formatDistanceToNow(new Date(status.statusExpiresAt), { addSuffix: true })}
        </p>
      )}

      {status.doNotDisturbUntil && status.status === 'do_not_disturb' && (
        <p className="text-xs text-muted-foreground">
          Until {formatDistanceToNow(new Date(status.doNotDisturbUntil), { addSuffix: true })}
        </p>
      )}

      {status.currentPage && status.status === 'online' && (
        <p className="text-xs text-muted-foreground">
          Currently on: {formatCurrentPage(status.currentPage)}
        </p>
      )}

      {status.lastSeen && status.status === 'offline' && (
        <p className="text-xs text-muted-foreground">
          Last seen {formatDistanceToNow(new Date(status.lastSeen), { addSuffix: true })}
        </p>
      )}

      {status.timezone && (
        <p className="text-xs text-muted-foreground">
          Timezone: {status.timezone}
        </p>
      )}
    </div>
  );
}

export default UserStatusDisplay;