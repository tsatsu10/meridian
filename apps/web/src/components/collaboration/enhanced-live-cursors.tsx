// @epic-3.4-teams: Enhanced Live Cursors with Resource-based Collaboration and Permissions
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useAuth } from '@/components/providers/unified-context-provider';
import { useCollaborationPermissions } from '@/hooks/useCollaborationPermissions';
import useWorkspaceStore from '@/store/workspace';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  resourceId?: string;
  timestamp: number;
}

export interface CollaboratorCursor {
  userEmail: string;
  userName: string;
  userAvatar?: string;
  position: CursorPosition;
  isTyping?: boolean;
  currentAction?: 'editing' | 'viewing' | 'selecting' | 'commenting';
  lastSeen: number;
}

export interface ResourceCollaboration {
  resourceId: string;
  resourceType: 'task' | 'project' | 'kanban-board' | 'document' | 'calendar';
  collaborators: Map<string, CollaboratorCursor>;
  lastActivity: number;
}

interface EnhancedLiveCursorsProps {
  resourceId: string;
  resourceType: 'task' | 'project' | 'kanban-board' | 'document' | 'calendar';
  className?: string;
  showTooltips?: boolean;
  showPresenceIndicators?: boolean;
  trackMouse?: boolean;
  trackClicks?: boolean;
  trackScrolling?: boolean;
}

export function EnhancedLiveCursors({
  resourceId,
  resourceType,
  className = '',
  showTooltips = true,
  showPresenceIndicators = true,
  trackMouse = true,
  trackClicks = true,
  trackScrolling = false
}: EnhancedLiveCursorsProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Check collaboration permissions
  const {
    shouldShowCollaborationFeatures,
    canPerformCollaborationAction
  } = useCollaborationPermissions();

  // Early return if user doesn't have permission to see cursors
  if (!shouldShowCollaborationFeatures.liveCursors) {
    return null;
  }
  const [collaboration, setCollaboration] = useState<ResourceCollaboration>({
    resourceId,
    resourceType,
    collaborators: new Map(),
    lastActivity: Date.now()
  });

  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHoveringCursor, setIsHoveringCursor] = useState<string | null>(null);

  // WebSocket connection for real-time collaboration
  const {
    connectionState,
    updateCursor,
    joinResource,
    leaveResource,
    onCursorUpdate
  } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    onCursorUpdate: handleCursorUpdate
  });

  // Generate consistent user color
  const getUserColor = useCallback((email: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-yellow-500 to-yellow-600',
      'from-indigo-500 to-indigo-600',
      'from-red-500 to-red-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-cyan-500 to-cyan-600'
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Handle incoming cursor updates
  function handleCursorUpdate(data: any) {
    if (data.resourceId !== resourceId) return;

    setCollaboration(prev => {
      const newCollaborators = new Map(prev.collaborators);

      if (data.userEmail === user?.email) {
        // Don't show our own cursor
        return prev;
      }

      newCollaborators.set(data.userEmail, {
        userEmail: data.userEmail,
        userName: data.userName || data.userEmail.split('@')[0],
        userAvatar: data.userAvatar,
        position: {
          x: data.x,
          y: data.y,
          elementId: data.elementId,
          resourceId: data.resourceId,
          timestamp: data.timestamp || Date.now()
        },
        isTyping: data.isTyping,
        currentAction: data.currentAction,
        lastSeen: Date.now()
      });

      return {
        ...prev,
        collaborators: newCollaborators,
        lastActivity: Date.now()
      };
    });
  }

  // Track mouse movement
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!trackMouse || !connectionState.isConnected) return;

    // Check permission to show cursor
    if (!canPerformCollaborationAction('canShowCursor')) return;

    mousePositionRef.current = { x: event.clientX, y: event.clientY };

    // Throttle cursor updates to avoid spam
    if (throttleRef.current) return;

    throttleRef.current = setTimeout(() => {
      const elementUnderCursor = document.elementFromPoint(event.clientX, event.clientY);
      const elementId = elementUnderCursor?.id || elementUnderCursor?.dataset?.cursorId;

      updateCursor(
        event.clientX,
        event.clientY,
        elementId,
        resourceId
      );

      throttleRef.current = null;
    }, 50); // Update every 50ms
  }, [trackMouse, connectionState.isConnected, updateCursor, resourceId, canPerformCollaborationAction]);

  // Track clicks
  const handleClick = useCallback((event: MouseEvent) => {
    if (!trackClicks || !connectionState.isConnected) return;

    const elementUnderCursor = document.elementFromPoint(event.clientX, event.clientY);
    const elementId = elementUnderCursor?.id || elementUnderCursor?.dataset?.cursorId;

    // Send click event with special action indicator
    updateCursor(
      event.clientX,
      event.clientY,
      elementId,
      resourceId
    );
  }, [trackClicks, connectionState.isConnected, updateCursor, resourceId]);

  // Clean up stale cursors
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 10000; // 10 seconds

      setCollaboration(prev => {
        const newCollaborators = new Map(prev.collaborators);
        let hasChanges = false;

        for (const [email, cursor] of newCollaborators.entries()) {
          if (now - cursor.lastSeen > staleThreshold) {
            newCollaborators.delete(email);
            hasChanges = true;
          }
        }

        return hasChanges ? {
          ...prev,
          collaborators: newCollaborators
        } : prev;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Join resource on mount
  useEffect(() => {
    if (connectionState.isConnected && resourceId) {
      joinResource(resourceId, resourceType);

      return () => {
        leaveResource(resourceId);
      };
    }
  }, [connectionState.isConnected, resourceId, resourceType, joinResource, leaveResource]);

  // Add event listeners
  useEffect(() => {
    if (trackMouse) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    if (trackClicks) {
      document.addEventListener('click', handleClick);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);

      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [handleMouseMove, handleClick, trackMouse, trackClicks]);

  if (!connectionState.isConnected || collaboration.collaborators.size === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("fixed inset-0 pointer-events-none z-50", className)}
    >
      {Array.from(collaboration.collaborators.values()).map((cursor) => {
        const { position, userName, userEmail, isTyping, currentAction } = cursor;

        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
          return null;
        }

        const colorGradient = getUserColor(userEmail);
        const cursorKey = `${userEmail}-${resourceId}`;

        return (
          <div
            key={cursorKey}
            className="absolute transition-all duration-200 ease-out pointer-events-auto"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-2px, -2px)',
            }}
            onMouseEnter={() => setIsHoveringCursor(userEmail)}
            onMouseLeave={() => setIsHoveringCursor(null)}
          >
            {/* Enhanced cursor pointer */}
            <div className="relative">
              <div className={cn(
                "w-6 h-6 rounded-full bg-gradient-to-br shadow-lg border-2 border-white transform transition-all duration-200",
                colorGradient,
                isTyping && "animate-pulse scale-110",
                currentAction === 'editing' && "ring-2 ring-offset-1 ring-yellow-400",
                currentAction === 'commenting' && "ring-2 ring-offset-1 ring-blue-400"
              )}>
                {/* Action indicator */}
                <div className="absolute -top-1 -right-1">
                  {isTyping && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                  )}
                  {currentAction === 'editing' && (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </div>
                  )}
                  {currentAction === 'commenting' && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* User tooltip */}
              {showTooltips && (isHoveringCursor === userEmail || currentAction) && (
                <div className={cn(
                  "absolute top-8 left-2 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 transition-all duration-200",
                  `bg-gradient-to-br ${colorGradient} text-white`
                )}>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-white/20">
                        {userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{userName}</div>
                      {currentAction && (
                        <div className="text-xs opacity-90">
                          {currentAction === 'editing' && 'Editing'}
                          {currentAction === 'viewing' && 'Viewing'}
                          {currentAction === 'selecting' && 'Selecting'}
                          {currentAction === 'commenting' && 'Commenting'}
                          {isTyping && ' (typing...)'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tooltip arrow */}
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gradient-to-br from-current transform rotate-45"></div>
                </div>
              )}

              {/* Simple name label for non-hovered state */}
              {showTooltips && !isHoveringCursor && !currentAction && (
                <div className={cn(
                  "absolute top-8 left-2 px-2 py-1 rounded text-xs text-white shadow-lg whitespace-nowrap transition-all duration-200",
                  `bg-gradient-to-br ${colorGradient}`
                )}>
                  {userName}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Presence indicators sidebar */}
      {showPresenceIndicators && collaboration.collaborators.size > 0 && (
        <div className="fixed top-4 right-4 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-lg border p-3 space-y-2 max-w-64">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Active Collaborators</h4>
              <Badge variant="outline" className="text-xs">
                {collaboration.collaborators.size}
              </Badge>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Array.from(collaboration.collaborators.values()).map((cursor) => (
                <div key={cursor.userEmail} className="flex items-center space-x-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full bg-gradient-to-br",
                    getUserColor(cursor.userEmail)
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{cursor.userName}</div>
                    {cursor.currentAction && (
                      <div className="text-xs text-muted-foreground capitalize">
                        {cursor.currentAction}
                        {cursor.isTyping && ' (typing...)'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!connectionState.isConnected && (
        <div className="fixed bottom-4 right-4 pointer-events-auto">
          <Badge variant="outline" className="bg-white shadow-lg">
            Collaboration offline
          </Badge>
        </div>
      )}
    </div>
  );
}

// Hook for managing resource collaboration
export function useResourceCollaboration(resourceId: string, resourceType: string) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorCursor[]>([]);

  const { connectionState, joinResource, leaveResource, updateCursor } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    onCursorUpdate: (data) => {
      if (data.resourceId === resourceId) {
        setActiveCollaborators(prev => {
          const updated = prev.filter(c => c.userEmail !== data.userEmail);
          if (data.userEmail !== user?.email) {
            updated.push({
              userEmail: data.userEmail,
              userName: data.userName || data.userEmail.split('@')[0],
              position: {
                x: data.x,
                y: data.y,
                elementId: data.elementId,
                resourceId: data.resourceId,
                timestamp: data.timestamp || Date.now()
              },
              isTyping: data.isTyping,
              currentAction: data.currentAction,
              lastSeen: Date.now()
            });
          }
          return updated;
        });
      }
    }
  });

  const joinCollaboration = useCallback(() => {
    if (connectionState.isConnected) {
      joinResource(resourceId, resourceType);
    }
  }, [connectionState.isConnected, joinResource, resourceId, resourceType]);

  const leaveCollaboration = useCallback(() => {
    if (connectionState.isConnected) {
      leaveResource(resourceId);
    }
  }, [connectionState.isConnected, leaveResource, resourceId]);

  const broadcastAction = useCallback((action: string, elementId?: string) => {
    if (connectionState.isConnected) {
      updateCursor(0, 0, elementId, resourceId);
    }
  }, [connectionState.isConnected, updateCursor, resourceId]);

  return {
    activeCollaborators,
    isConnected: connectionState.isConnected,
    joinCollaboration,
    leaveCollaboration,
    broadcastAction
  };
}