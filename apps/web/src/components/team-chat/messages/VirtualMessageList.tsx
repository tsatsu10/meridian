// Virtual Message List - Performance-optimized message rendering

import React, { useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { useVirtualizedMessages } from '../hooks/useVirtualizedMessages';
import type { TeamMessage } from '../types';

interface VirtualMessageListProps {
  messages: TeamMessage[];
  autoScroll?: boolean;
}

/**
 * VirtualMessageList - Virtualized message rendering for performance
 * 
 * Only renders visible messages, enabling smooth scrolling even with
 * thousands of messages.
 */
export function VirtualMessageList({ messages, autoScroll = true }: VirtualMessageListProps) {
  const { parentRef, virtualItems, totalSize, scrollToBottom } = useVirtualizedMessages({
    messages,
    estimatedHeight: 100,
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages.length, autoScroll, scrollToBottom]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const message = messages[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer => {
                if (virtualizer) {
                  virtualRow.measureElement(virtualizer);
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="px-4 py-2">
                <MessageItem message={message} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

