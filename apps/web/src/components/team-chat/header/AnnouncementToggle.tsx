// Announcement Toggle - Switch between message and announcement mode

import React from 'react';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatState, useChatActions } from '../context/ChatContext';

/**
 * AnnouncementToggle - Button to toggle announcement mode
 * 
 * When enabled, messages are sent as team announcements
 * which are highlighted and notify all team members.
 */
export function AnnouncementToggle() {
  const { composing } = useChatState();
  const { toggleAnnouncementMode } = useChatActions();

  return (
    <Button
      variant={composing.isAnnouncement ? "default" : "ghost"}
      size="sm"
      onClick={toggleAnnouncementMode}
      title={composing.isAnnouncement ? "Announcement mode ON" : "Announcement mode OFF"}
      className={cn(
        "h-8 w-8 p-0 transition-colors",
        composing.isAnnouncement && "bg-orange-600 hover:bg-orange-700"
      )}
      aria-label="Toggle announcement mode"
      aria-pressed={composing.isAnnouncement}
    >
      <Megaphone className="w-4 h-4" />
    </Button>
  );
}

