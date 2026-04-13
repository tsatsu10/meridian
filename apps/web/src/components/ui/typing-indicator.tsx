import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Keyboard, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { logger } from "../../lib/logger";

interface TypingUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  lastTyping: Date;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
  showAvatars?: boolean;
  maxDisplayUsers?: number;
  hideAfterMs?: number;
}

export default function TypingIndicator({
  typingUsers,
  className,
  showAvatars = true,
  maxDisplayUsers = 3,
  hideAfterMs = 5000
}: TypingIndicatorProps) {
  const [filteredUsers, setFilteredUsers] = useState<TypingUser[]>([]);

  // Filter out users who haven't typed recently
  useEffect(() => {
    const now = new Date();
    const activeUsers = typingUsers.filter(user => {
      const timeSinceLastTyping = now.getTime() - user.lastTyping.getTime();
      return timeSinceLastTyping < hideAfterMs;
    });
    
    setFilteredUsers(activeUsers);
  }, [typingUsers, hideAfterMs]);

  // Auto-hide inactive users
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setFilteredUsers(prev => prev.filter(user => {
        const timeSinceLastTyping = now.getTime() - user.lastTyping.getTime();
        return timeSinceLastTyping < hideAfterMs;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [hideAfterMs]);

  if (filteredUsers.length === 0) {
    return null;
  }

  const displayUsers = filteredUsers.slice(0, maxDisplayUsers);
  const hiddenCount = filteredUsers.length - maxDisplayUsers;

  const getTypingText = () => {
    if (filteredUsers.length === 1) {
      return `${filteredUsers[0].name} is typing...`;
    } else if (filteredUsers.length === 2) {
      return `${filteredUsers[0].name} and ${filteredUsers[1].name} are typing...`;
    } else if (filteredUsers.length === 3) {
      return `${filteredUsers[0].name}, ${filteredUsers[1].name}, and ${filteredUsers[2].name} are typing...`;
    } else {
      return `${filteredUsers[0].name} and ${filteredUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {showAvatars && (
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <TooltipProvider key={user.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <p>{user.name} is typing...</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {hiddenCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-medium">+{hiddenCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <p>{hiddenCount} more {hiddenCount === 1 ? 'person is' : 'people are'} typing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <Keyboard className="h-4 w-4 animate-pulse" />
        <span className="text-xs">{getTypingText()}</span>
      </div>

      {/* Animated typing dots */}
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// Hook for managing typing status
export function useTypingIndicator(channelId: string, userId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Send typing indicator
  const sendTypingIndicator = React.useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      
      // In a real implementation, this would send to WebSocket
      logger.info("Send typing indicator");
      
      // Auto-stop typing after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [channelId, userId, isTyping]);

  // Stop typing indicator
  const stopTypingIndicator = React.useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      logger.info("Stop typing indicator");
    }
  }, [channelId, userId, isTyping]);

  // Simulate receiving typing indicators from others
  useEffect(() => {
    // In a real implementation, this would listen to WebSocket events
    const mockTypingUsers: TypingUser[] = [
      // You would populate this from WebSocket events
    ];
    
    setTypingUsers(mockTypingUsers);
  }, [channelId]);

  return {
    typingUsers,
    isTyping,
    sendTypingIndicator,
    stopTypingIndicator,
  };
}

// Lightweight typing indicator for inline use
export function InlineTypingIndicator({ 
  isVisible, 
  className 
}: { 
  isVisible: boolean; 
  className?: string; 
}) {
  if (!isVisible) return null;

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Keyboard className="h-3 w-3" />
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}