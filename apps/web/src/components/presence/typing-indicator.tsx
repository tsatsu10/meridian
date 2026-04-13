/**
 * 💬 Typing Indicator Components
 * 
 * Real-time typing indicators for channels using WebSocket presence.
 * 
 * @epic-2.2-realtime: Enhanced typing indicator with debouncing
 * @persona-mike: Real-time collaboration feedback
 * @persona-sarah: Team communication awareness
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';

interface TypingIndicatorProps {
  location: {
    type: 'comment' | 'task' | 'description';
    id: string;
  };
  className?: string;
}

export function TypingIndicator({ channelId }: { channelId: string }) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { socket, connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });
  const isConnected = connectionState.isConnected;
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Listen for typing events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTyping = (data: { userEmail: string; userName?: string }) => {
      if (data.userEmail !== user?.email) {
        setTypingUsers(prev => new Set(prev).add(data.userName || data.userEmail));
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userName || data.userEmail);
            return next;
          });
        }, 3000);
      }
    };

    const handleStopTyping = (data: { userEmail: string; userName?: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userName || data.userEmail);
        return next;
      });
    };

    socket.on('chat:typing', handleTyping);
    socket.on('chat:stop_typing', handleStopTyping);

    return () => {
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stop_typing', handleStopTyping);
    };
  }, [socket, isConnected, user?.email]);

  if (!isConnected || typingUsers.size === 0) {
    return null;
  }

  const renderTypingText = () => {
    const userNames = Array.from(typingUsers);
    
    if (userNames.length === 1) {
      return `${userNames[0]} is typing...`;
    } else if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]} are typing...`;
    } else if (userNames.length > 2) {
      return `${userNames[0]}, ${userNames[1]} and ${userNames.length - 2} others are typing...`;
    }
    
    return '';
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-blue-600 dark:text-blue-400">{renderTypingText()}</span>
    </div>
  );
}

// Hook for managing typing indicators in channels
export function useChannelTyping(channelId: string, isTyping: boolean) {
  const { user } = useAuth();
  const { socket, connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email,
    userEmail: user?.email || '',
    workspaceId: '' // Will be set by socket connection
  });
  const isConnected = connectionState.isConnected;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!socket || !isConnected || !channelId) return;

    if (isTyping) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Send typing start event
      socket.emit('chat:typing', { channelId });
      
      // Auto-stop after 3 seconds of inactivity
      timeoutRef.current = setTimeout(() => {
        socket.emit('chat:stop_typing', { channelId });
      }, 3000);
    } else {
      // Send stop typing event
      socket.emit('chat:stop_typing', { channelId });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [socket, isConnected, channelId, isTyping]);
}

// Legacy hook for managing typing indicators (deprecated - use useChannelTyping)
export function useTypingIndicator(
  location: { type: 'comment' | 'task' | 'description'; id: string },
  isTyping: boolean
) {
  // This hook is deprecated and kept for backward compatibility
  // Use useChannelTyping for channel-based typing indicators
  console.warn('useTypingIndicator is deprecated. Use useChannelTyping instead.');
}

// Hook for tracking typing state in channel message inputs
export function useChannelInputTyping(channelId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Wire up to WebSocket
  useChannelTyping(channelId, isTyping);

  // Debounced typing handler
  const handleTypingChange = useCallback((typing: boolean) => {
    if (typing) {
      setIsTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Auto-stop after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, []);

  // Return event handlers for input element
  return {
    isTyping,
    onInput: () => handleTypingChange(true),
    onBlur: () => handleTypingChange(false),
    onFocus: () => handleTypingChange(true),
  };
}

// Compact typing indicator for inline use in channels
export function InlineTypingIndicator({ 
  channelId, 
  className = '' 
}: { 
  channelId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { socket, connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email,
    userEmail: user?.email || '',
    workspaceId: ''
  });
  const isConnected = connectionState.isConnected;
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Listen for typing events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTyping = (data: { userEmail: string; userName?: string }) => {
      if (data.userEmail !== user?.email) {
        setTypingUsers(prev => new Set(prev).add(data.userName || data.userEmail));
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userName || data.userEmail);
            return next;
          });
        }, 3000);
      }
    };

    const handleStopTyping = (data: { userEmail: string; userName?: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userName || data.userEmail);
        return next;
      });
    };

    socket.on('chat:typing', handleTyping);
    socket.on('chat:stop_typing', handleStopTyping);

    return () => {
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stop_typing', handleStopTyping);
    };
  }, [socket, isConnected, user?.email]);

  if (!isConnected || typingUsers.size === 0) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <div className="flex space-x-0.5">
        <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-blue-600 dark:text-blue-400">
        {typingUsers.size === 1 ? '1 typing' : `${typingUsers.size} typing`}
      </span>
    </div>
  );
} 