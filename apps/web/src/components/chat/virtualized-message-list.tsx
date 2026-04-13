import React, { useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import MessageItem from '@/components/communication/chat/MessageItem';

interface Message {
  id: string;
  content: string;
  messageType: string;
  userEmail: string;
  userName?: string;
  channelId: string;
  createdAt: Date;
  isEdited: boolean;
  isPinned?: boolean;
  parentMessageId?: string;
  reactions?: string;
  attachments?: string;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  currentUserEmail: string;
  onReply: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  className?: string;
  autoScrollToBottom?: boolean;
}

export default function VirtualizedMessageList({
  messages,
  currentUserEmail,
  onReply,
  onEdit,
  onDelete,
  onPin,
  className,
  autoScrollToBottom = true,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Reverse messages for bottom-up display (newest at bottom)
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Calculate message groups (messages from same user within 5 minutes)
  const messageGroups = useMemo(() => {
    return reversedMessages.map((message, index) => {
      const prevMessage = reversedMessages[index - 1];
      const isFirstInGroup = !prevMessage || 
        prevMessage.userEmail !== message.userEmail ||
        (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 5 * 60 * 1000;
      
      return {
        ...message,
        isFirstInGroup,
        // Estimate height based on content and group status
        estimatedHeight: isFirstInGroup ? 80 : 40 + Math.ceil(message.content.length / 50) * 20,
      };
    });
  }, [reversedMessages]);

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: messageGroups.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => messageGroups[index]?.estimatedHeight || 80,
    overscan: 5, // Render 5 extra items above and below visible area
    getItemKey: (index) => messageGroups[index]?.id || index,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollToBottom && scrollElementRef.current && virtualizer.getTotalSize() > 0) {
      const scrollElement = scrollElementRef.current;
      const shouldAutoScroll = 
        scrollElement.scrollTop + scrollElement.clientHeight >= 
        scrollElement.scrollHeight - 100; // Within 100px of bottom

      if (shouldAutoScroll) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }, 0);
      }
    }
  }, [messageGroups.length, autoScrollToBottom, virtualizer]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (scrollElementRef.current && messageGroups.length > 0) {
      setTimeout(() => {
        if (scrollElementRef.current) {
          scrollElementRef.current.scrollTop = scrollElementRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messageGroups.length > 0]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("h-full w-full overflow-hidden", className)}
    >
      <div
        ref={scrollElementRef}
        className="h-full w-full overflow-auto"
        style={{
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualItem) => {
            const message = messageGroups[virtualItem.index];
            if (!message) return null;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageItem
                  message={message}
                  currentUserEmail={currentUserEmail}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPin={onPin}
                  className={cn(
                    "hover:bg-muted/30 transition-colors px-4 py-2",
                    message.isFirstInGroup && "mt-4"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          Rendered: {items.length}/{messageGroups.length}
        </div>
      )}
    </div>
  );
}

// Performance-optimized message list for large channels
export function VirtualizedMessageListWithInfiniteScroll({
  messages,
  currentUserEmail,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  className,
}: VirtualizedMessageListProps & {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Handle infinite scroll
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    
    // Load more when scrolled to top
    if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
      onLoadMore();
    }
  };

  return (
    <div className={cn("h-full w-full", className)}>
      {/* Loading indicator at top */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-2 border-b">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading more messages...</span>
        </div>
      )}

      <div
        ref={scrollElementRef}
        className="h-full w-full overflow-auto"
        onScroll={handleScroll}
      >
        <VirtualizedMessageList
          messages={messages}
          currentUserEmail={currentUserEmail}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onPin={onPin}
          autoScrollToBottom={false}
        />
      </div>
    </div>
  );
}