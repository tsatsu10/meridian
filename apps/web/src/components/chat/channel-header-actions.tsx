import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pin, BookmarkCheck, Users, Hash } from "lucide-react";
import PinnedMessages, { PinnedMessagesBanner } from "./pinned-messages";
import BookmarkedMessages from "./bookmarked-messages";
import { usePinnedMessages } from "@/hooks/use-messages";

interface ChannelHeaderActionsProps {
  channelId: string;
  channelName?: string;
  memberCount?: number;
  showPinnedBanner?: boolean;
  onMessageClick?: (messageId: string) => void;
  className?: string;
}

export default function ChannelHeaderActions({
  channelId,
  channelName,
  memberCount,
  showPinnedBanner = true,
  onMessageClick,
  className
}: ChannelHeaderActionsProps) {
  const { data: pinnedMessages = [] } = usePinnedMessages(channelId);

  return (
    <div className={className}>
      {/* Channel Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">{channelName || 'Channel'}</h2>
          </div>
          
          {memberCount && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{memberCount} members</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Pinned Messages */}
          <PinnedMessages
            channelId={channelId}
            onMessageClick={onMessageClick}
            trigger={
              <Button variant="ghost" size="sm">
                <Pin className="h-4 w-4 mr-2" />
                Pinned ({pinnedMessages.length})
              </Button>
            }
          />

          {/* Bookmarked Messages */}
          <BookmarkedMessages
            onMessageClick={onMessageClick}
            trigger={
              <Button variant="ghost" size="sm">
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Bookmarks
              </Button>
            }
          />
        </div>
      </div>

      {/* Pinned Messages Banner */}
      {showPinnedBanner && pinnedMessages.length > 0 && (
        <PinnedMessagesBanner channelId={channelId} />
      )}
    </div>
  );
}

// Simple action bar for existing channel interfaces
export function ChannelActionBar({
  channelId,
  onMessageClick,
  className
}: {
  channelId: string;
  onMessageClick?: (messageId: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <PinnedMessages
        channelId={channelId}
        onMessageClick={onMessageClick}
      />
      
      <BookmarkedMessages
        onMessageClick={onMessageClick}
      />
    </div>
  );
}