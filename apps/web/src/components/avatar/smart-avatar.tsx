/**
 * 🎨 SmartAvatar Component
 * 
 * Intelligent avatar component that automatically:
 * - Uses custom uploaded avatars (priority 1)
 * - Generates DiceBear avatars (priority 2)
 * - Falls back to initials (priority 3)
 * - Applies role-based styling
 * - Caches generated URLs
 * - Handles loading and error states
 */

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { getUserAvatarUrl, getInitials, type DiceBearStyle } from '@/lib/dicebear';

export interface SmartAvatarProps {
  /** User or entity data */
  user: {
    email: string;
    name: string;
    role?: string;
    avatar?: string;
    avatarStyle?: DiceBearStyle;
    avatarBackgroundColor?: string;
  };
  
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Show online status indicator */
  showStatus?: boolean;
  
  /** Online status */
  isOnline?: boolean;
  
  /** Show role badge */
  showRole?: boolean;
  
  /** Click handler */
  onClick?: () => void;
  
  /** Force use of DiceBear (ignore custom avatar) */
  forceDiceBear?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
};

const statusSizes = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
  '2xl': 'h-5 w-5',
};

/**
 * SmartAvatar - Intelligent avatar with DiceBear integration
 */
export const SmartAvatar: React.FC<SmartAvatarProps> = ({
  user,
  size = 'md',
  className,
  showStatus = false,
  isOnline = false,
  showRole = false,
  onClick,
  forceDiceBear = false,
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Get avatar URL with intelligent fallback
  const avatarUrl = forceDiceBear
    ? getUserAvatarUrl({ ...user, avatar: undefined })
    : getUserAvatarUrl(user);
  
  const initials = getInitials(user.name);
  
  // Role badge color based on role
  const getRoleBadgeColor = (role?: string) => {
    const roleColors: Record<string, string> = {
      'workspace-manager': 'bg-purple-500',
      'admin': 'bg-red-500',
      'team-lead': 'bg-blue-500',
      'project-manager': 'bg-green-500',
      'department-head': 'bg-amber-500',
      'member': 'bg-indigo-500',
      'project-viewer': 'bg-violet-500',
      'guest': 'bg-gray-500',
    };
    return roleColors[role || 'member'] || 'bg-indigo-500';
  };
  
  return (
    <div className={cn('relative inline-block', className)} onClick={onClick}>
      <Avatar className={cn(sizeClasses[size], onClick && 'cursor-pointer')}>
        {!imageError && avatarUrl ? (
          <AvatarImage
            src={avatarUrl}
            alt={`${user.name}'s avatar`}
            onError={() => setImageError(true)}
          />
        ) : null}
        <AvatarFallback className={cn(
          'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold',
          onClick && 'hover:from-indigo-600 hover:to-purple-700 transition-all'
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Online status indicator */}
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            statusSizes[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
      
      {/* Role badge */}
      {showRole && user.role && (
        <span
          className={cn(
            'absolute -top-1 -right-1 rounded-full border-2 border-background',
            statusSizes[size],
            getRoleBadgeColor(user.role)
          )}
          title={user.role.replace('-', ' ')}
        />
      )}
    </div>
  );
};

/**
 * AvatarGroup - Display multiple avatars with overlap
 */
export interface AvatarGroupProps {
  users: Array<{
    email: string;
    name: string;
    role?: string;
    avatar?: string;
    avatarStyle?: DiceBearStyle;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  onAvatarClick?: (user: any) => void;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 5,
  size = 'md',
  className,
  onAvatarClick,
}) => {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;
  
  return (
    <div className={cn('flex -space-x-2', className)}>
      {displayUsers.map((user, index) => (
        <SmartAvatar
          key={user.email}
          user={user}
          size={size}
          className="ring-2 ring-background hover:z-10 transition-all"
          onClick={() => onAvatarClick?.(user)}
        />
      ))}
      
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground ring-2 ring-background',
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

/**
 * AvatarWithName - Avatar with name label
 */
export interface AvatarWithNameProps {
  user: {
    email: string;
    name: string;
    role?: string;
    avatar?: string;
    avatarStyle?: DiceBearStyle;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showRole?: boolean;
  showStatus?: boolean;
  isOnline?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onClick?: () => void;
}

export const AvatarWithName: React.FC<AvatarWithNameProps> = ({
  user,
  size = 'md',
  showRole = false,
  showStatus = false,
  isOnline = false,
  orientation = 'horizontal',
  className,
  onClick,
}) => {
  const isVertical = orientation === 'vertical';
  
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        isVertical && 'flex-col text-center',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
    >
      <SmartAvatar
        user={user}
        size={size}
        showStatus={showStatus}
        isOnline={isOnline}
        showRole={showRole}
      />
      
      <div className={cn('min-w-0', isVertical && 'text-center')}>
        <p className={cn(
          'font-medium truncate',
          size === 'xs' && 'text-xs',
          size === 'sm' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          {user.name}
        </p>
        
        {showRole && user.role && (
          <p className={cn(
            'text-muted-foreground capitalize truncate',
            size === 'xs' && 'text-[10px]',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-xs',
            size === 'lg' && 'text-sm'
          )}>
            {user.role.replace('-', ' ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default SmartAvatar;

