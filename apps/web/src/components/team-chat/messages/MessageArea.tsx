// Message Area - Container for message list with loading states

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import { useChatState } from '../context/ChatContext';
import { ChatSkeleton } from '../layouts/ChatSkeleton';

/**
 * MessageArea - Displays messages with proper loading and empty states
 */
export function MessageArea() {
  const { messages, isLoading, error, realtime } = useChatState();

  return (
    <ScrollArea className="flex-1 p-4" role="region" aria-label="Team chat messages">
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <MessageList messages={messages} />
          
          {/* Typing Indicator */}
          {realtime.typingUsers.length > 0 && (
            <TypingIndicator users={realtime.typingUsers} />
          )}
        </>
      )}
    </ScrollArea>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="text-center">
        <p className="text-red-500 font-medium">Failed to load messages</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <p className="text-xs text-muted-foreground mt-2">Please try again later</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="text-center">
        <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground font-medium">No messages yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to start the conversation!
        </p>
      </div>
    </div>
  );
}

