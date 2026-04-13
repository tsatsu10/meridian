// Chat Header - Team chat header with status and actions

import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, X } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { AnnouncementToggle } from './AnnouncementToggle';
import { useChatState } from '../context/ChatContext';

interface ChatHeaderProps {
  teamId: string;
  teamName: string;
  onClose?: () => void;
}

/**
 * ChatHeader - Displays team info, status, and header actions
 */
export function ChatHeader({ teamId, teamName, onClose }: ChatHeaderProps) {
  const { messages, composing, realtime } = useChatState();

  return (
    <CardHeader className="flex-shrink-0 pb-3">
      <CardTitle className="flex items-center justify-between">
        {/* Team Info */}
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span>{teamName}</span>
          
          <Badge variant="secondary" className="text-xs">
            {messages.length} messages
          </Badge>
          
          <Badge variant="outline" className="text-xs">
            {realtime.onlineUsers.length} online
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ConnectionStatus status={realtime.connectionStatus} />
          <AnnouncementToggle />
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardTitle>

      {/* Announcement Mode Banner */}
      {composing.isAnnouncement && (
        <div className="mt-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-2">
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <span className="text-sm font-medium">📢 Announcement Mode</span>
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Your message will be sent as a team announcement
          </p>
        </div>
      )}
    </CardHeader>
  );
}

